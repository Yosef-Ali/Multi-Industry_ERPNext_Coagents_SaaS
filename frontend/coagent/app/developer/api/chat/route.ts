import { geolocation } from '@vercel/functions';
import {
	convertToModelMessages,
	createUIMessageStream,
	JsonToSseTransformStream,
	smoothStream,
	stepCountIs,
	streamText,
} from 'ai';
import { unstable_cache as cache } from 'next/cache';
import { after } from 'next/server';
import { createResumableStreamContext, type ResumableStreamContext } from 'resumable-stream';
import type { ModelCatalog } from 'tokenlens/core';
import { fetchModels } from 'tokenlens/fetch';
import { getUsage } from 'tokenlens/helpers';
import { auth, type UserType } from '@/lib/session';
import type { VisibilityType } from '@/components/visibility-selector';
import { entitlementsByUserType } from '@/lib/ai/entitlements';
import type { ChatModel } from '@/lib/ai/models';
import { type RequestHints, systemPrompt } from '@/lib/ai/prompts';
import { myProvider } from '@/lib/ai/providers';
import { validateOrFallback } from '@/lib/ai/model-validation';
import { createDocument } from '@/lib/ai/tools/create-document';
import { getWeather } from '@/lib/ai/tools/get-weather';
import { requestSuggestions } from '@/lib/ai/tools/request-suggestions';
import { updateDocument } from '@/lib/ai/tools/update-document';
import { isProductionEnvironment } from '@/lib/constants';
import {
	createStreamId,
	deleteChatById,
	getChatById,
	getMessageCountByUserId,
	getMessagesByChatId,
	saveChat,
	saveMessages,
	updateChatLastContextById,
} from '@/lib/db/queries';
import { ChatSDKError } from '@/lib/errors';
import type { ChatMessage } from '@/lib/types';
import type { AppUsage } from '@/lib/usage';
import { convertToUIMessages, generateUUID } from '@/lib/utils';
import { generateTitleFromUserMessage } from '@/app/(developer)/actions';
import { type PostRequestBody, postRequestBodySchema } from './schema';

export const maxDuration = 60;

// ============================================
// FEATURE FLAGS
// ============================================
// USE_GATEWAY_CHAT: Route chat through agent-gateway /api/chat (adapted AG-UI → Vercel chunks)
// USE_AGUI: Use AG-UI streaming directly to /agui (native AG-UI events, no adaptation)
// USE_LANGGRAPH_HITL: Use LangGraph workflow with Human-in-the-Loop approval gates
//
// Priority: USE_LANGGRAPH_HITL > USE_AGUI > USE_GATEWAY_CHAT > local provider
//
// USE_LANGGRAPH_HITL=1 enables:
// - LangGraph StateGraph workflow with interrupt() pattern
// - Risk assessment (low/medium/high)
// - Approval gates for high-risk operations
// - PostgreSQL state checkpointing for resumable conversations
//
// USE_AGUI=1 enables:
// - Native AG-UI events (tool_result artifacts, ui_state_update)
// - CopilotKit DataStreamProvider integration
// - Context7 docs tool with live doc panels
// - No Vercel chunk adaptation layer
//
// USE_GATEWAY_CHAT=1 enables:
// - Gateway routing with AG-UI → Vercel adaptation
// - Tool registry with approval gates
// - Industry-specific tools
// ============================================

const USE_LANGGRAPH_HITL = process.env.USE_LANGGRAPH_HITL === '1';
const USE_AGUI = process.env.USE_AGUI === '1' && !USE_LANGGRAPH_HITL;
const USE_GATEWAY_CHAT = process.env.USE_GATEWAY_CHAT === '1' && !USE_AGUI && !USE_LANGGRAPH_HITL;

let globalStreamContext: ResumableStreamContext | null = null;

const getTokenlensCatalog = cache(
	async (): Promise<ModelCatalog | undefined> => {
		try {
			return await fetchModels();
		} catch (err) {
			console.warn('TokenLens: catalog fetch failed, using default catalog', err);
			return; // tokenlens helpers will fall back to defaultCatalog
		}
	},
	['tokenlens-catalog'],
	{ revalidate: 24 * 60 * 60 } // 24 hours
);

export function getStreamContext() {
	if (!globalStreamContext) {
		try {
			globalStreamContext = createResumableStreamContext({
				waitUntil: after,
			});
		} catch (error: any) {
			if (error.message.includes('REDIS_URL')) {
				console.log(' > Resumable streams are disabled due to missing REDIS_URL');
			} else {
				console.error(error);
			}
		}
	}

	return globalStreamContext;
}

export async function POST(request: Request) {
	let requestBody: PostRequestBody;

	try {
		const json = await request.json();
		const parseResult = postRequestBodySchema.safeParse(json);

		if (!parseResult.success) {
			console.error('Invalid /developer/api/chat payload', {
				issues: parseResult.error.flatten(),
				payload: json,
			});
			return new ChatSDKError('bad_request:api').toResponse();
		}

		requestBody = parseResult.data;
	} catch (error) {
		console.error('Failed to parse /developer/api/chat request body', error);
		return new ChatSDKError('bad_request:api').toResponse();
	}

	try {
		const {
			id,
			message,
			selectedChatModel,
			selectedVisibilityType,
		}: {
			id: string;
			message: ChatMessage;
			selectedChatModel: ChatModel['id'];
			selectedVisibilityType: VisibilityType;
		} = requestBody;

		const session = await auth();

		if (!session?.user) {
			return new ChatSDKError('unauthorized:chat').toResponse();
		}

		const userType: UserType = session.user.type;

		const messageCount = await getMessageCountByUserId({
			id: session.user.id,
			differenceInHours: 24,
		});

		if (messageCount > entitlementsByUserType[userType].maxMessagesPerDay) {
			return new ChatSDKError('rate_limit:chat').toResponse();
		}

		// Validate model ID against registry (Week 2: Model validation)
		const validatedModelId = await validateOrFallback(
			selectedChatModel,
			'gemini-2.5-pro' // Default fallback
		);

		// Log if model was changed
		if (validatedModelId !== selectedChatModel) {
			console.warn(
				`[Chat] Model validation failed for '${selectedChatModel}', using '${validatedModelId}' instead`
			);
		}

		// Use validated model for the request
		const activeModelId = validatedModelId;

		// ============================================
		// LANGGRAPH HITL ROUTING (if USE_LANGGRAPH_HITL=1)
		// ============================================
		if (USE_LANGGRAPH_HITL) {
			console.log('[Chat] Routing to /developer-chat (USE_LANGGRAPH_HITL=1) - LangGraph workflow with HITL');

			const gatewayUrl =
				process.env.AGENT_GATEWAY_URL || process.env.NEXT_PUBLIC_AGENT_GATEWAY_URL || 'http://localhost:3001';

			// Ensure chat exists
			const existingChat = await getChatById({ id });
			if (existingChat) {
				if (existingChat.userId !== session.user.id) {
					return new ChatSDKError('forbidden:chat').toResponse();
				}
			} else {
				const title = await generateTitleFromUserMessage({ message });
				await saveChat({
					id,
					userId: session.user.id,
					title,
					visibility: selectedVisibilityType,
				});
			}

			// Save user message
			await saveMessages({
				messages: [
					{
						chatId: id,
						id: message.id,
						role: 'user',
						parts: message.parts,
						attachments: [],
						createdAt: new Date(),
					},
				],
			});

			// Extract text content
			const userMessage =
				message.parts
					?.filter((p) => p.type === 'text')
					.map((p) => p.text)
					.join('\n') || '';

			try {
				// Forward to LangGraph /developer-chat endpoint
				const langGraphResponse = await fetch(`${gatewayUrl}/developer-chat`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						chatId: id,
						userId: session.user.id,
						message: userMessage,
					}),
					signal: AbortSignal.timeout(60000),
				});

				if (!langGraphResponse.ok || !langGraphResponse.body) {
					throw new Error(`Gateway /developer-chat returned ${langGraphResponse.status}`);
				}

				// Stream LangGraph SSE events (interrupt, state_update, complete, end)
				console.log('[Chat] ✅ Streaming LangGraph HITL events from gateway');

				return new Response(langGraphResponse.body, {
					headers: {
						'Content-Type': 'text/event-stream',
						'Cache-Control': 'no-cache',
						'Connection': 'keep-alive',
					},
				});
			} catch (error) {
				console.error('[Chat] LangGraph workflow error:', error);
				console.log('[Chat] Falling back to local provider');
			}
		}

		// ============================================
		// AG-UI ROUTING (if USE_AGUI=1)
		// ============================================
		if (USE_AGUI) {
			console.log('[Chat] Routing to /agui (USE_AGUI=1) - native AG-UI events');

			const gatewayUrl =
				process.env.AGENT_GATEWAY_URL || process.env.NEXT_PUBLIC_AGENT_GATEWAY_URL || 'http://localhost:3001';

			// Ensure chat exists
			const existingChat = await getChatById({ id });
			if (existingChat) {
				if (existingChat.userId !== session.user.id) {
					return new ChatSDKError('forbidden:chat').toResponse();
				}
			} else {
				const title = await generateTitleFromUserMessage({ message });
				await saveChat({
					id,
					userId: session.user.id,
					title,
					visibility: selectedVisibilityType,
				});
			}

			// Save user message
			await saveMessages({
				messages: [
					{
						chatId: id,
						id: message.id,
						role: 'user',
						parts: message.parts,
						attachments: [],
						createdAt: new Date(),
					},
				],
			});

			// Extract text content
			const userMessage =
				message.parts
					?.filter((p) => p.type === 'text')
					.map((p) => p.text)
					.join('\n') || '';

			try {
				// Generate development token (32+ chars for auth middleware)
				const devToken = `dev_${session.user.id}_${Date.now().toString(36)}`;

				// Forward to /agui endpoint
				const aguiResponse = await fetch(`${gatewayUrl}/agui`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
						'Authorization': `Bearer ${devToken}`,
					},
					body: JSON.stringify({
						session_id: id,
						user_id: session.user.id,
						message: userMessage,
						// TODO: Get from user preferences
						enabled_industries: [],
					}),
					signal: AbortSignal.timeout(60000),
				});

				if (!aguiResponse.ok || !aguiResponse.body) {
					throw new Error(`Gateway /agui returned ${aguiResponse.status}`);
				}

				// Stream AG-UI events directly (no adaptation needed)
				console.log('[Chat] ✅ Streaming native AG-UI events from gateway');

				return new Response(aguiResponse.body, {
					headers: {
						'Content-Type': 'text/event-stream',
						'Cache-Control': 'no-cache',
						Connection: 'keep-alive',
					},
				});
			} catch (error) {
				console.error('[Chat] ❌ AG-UI request failed:', error);
				// Fall through to local provider
				console.log('[Chat] Falling back to local provider');
			}
		}

		// ============================================
		// GATEWAY ROUTING (if USE_GATEWAY_CHAT=1)
		// ============================================
		if (USE_GATEWAY_CHAT) {
			console.log('[Chat] Routing to agent-gateway (USE_GATEWAY_CHAT=1)');

			const gatewayUrl =
				process.env.AGENT_GATEWAY_URL || process.env.NEXT_PUBLIC_AGENT_GATEWAY_URL || 'http://localhost:3001';

			// Ensure chat exists and persist the user message so it appears in sidebar/history
			const existingChat = await getChatById({ id });
			if (existingChat) {
				if (existingChat.userId !== session.user.id) {
					return new ChatSDKError('forbidden:chat').toResponse();
				}
			} else {
				const title = await generateTitleFromUserMessage({ message });
				await saveChat({
					id,
					userId: session.user.id,
					title,
					visibility: selectedVisibilityType,
				});
			}

			await saveMessages({
				messages: [
					{
						chatId: id,
						id: message.id,
						role: 'user',
						parts: message.parts,
						attachments: [],
						createdAt: new Date(),
					},
				],
			});

			// Get message history (updated)
			const messagesFromDb = await getMessagesByChatId({ id });
			const uiMessages = [...convertToUIMessages(messagesFromDb), message];

			// Convert to gateway format
			const gatewayMessages = uiMessages.map((msg) => ({
				role: msg.role,
				content:
					msg.parts
						?.filter((p) => p.type === 'text')
						.map((p) => p.text)
						.join('\n') || '',
			}));

			try {
				// Forward to gateway
				const gatewayResponse = await fetch(`${gatewayUrl}/api/chat`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						messages: gatewayMessages,
						model: activeModelId,
						industries: [], // TODO: Get from user preferences
						sessionId: id,
						userId: session.user.id,
					}),
					signal: AbortSignal.timeout(60000), // 1 minute timeout
				});

				if (!gatewayResponse.ok || !gatewayResponse.body) {
					throw new Error(`Gateway returned ${gatewayResponse.status}`);
				}

				// Adapt AG-UI SSE frames from gateway to Vercel AI UI chunk format
				const reader = gatewayResponse.body.getReader();
				const encoder = new TextEncoder();
				const decoder = new TextDecoder();

				function mapAGUItoVercel(chunk: any): any | null {
					// Known AG-UI frame types: message, tool_call, tool_result, ui_prompt, ui_response, error, status
					if (!chunk || typeof chunk !== 'object' || !chunk.type) return null;

					if (chunk.type === 'message' && chunk.data?.delta?.type === 'text_delta') {
						return { type: 'text-delta', content: chunk.data.delta.text };
					}
					if (chunk.type === 'tool_call') {
						return {
							type: 'tool-call',
							toolCallId: chunk.data?.tool_call_id || chunk.data?.tool_id,
							toolName: chunk.data?.tool_name,
							args: chunk.data?.input,
						};
					}
					if (chunk.type === 'tool_result') {
						return {
							type: 'tool-result',
							toolCallId: chunk.data?.tool_call_id || chunk.data?.tool_id,
							toolName: chunk.data?.tool_name,
							result: chunk.data?.result,
							error: chunk.data?.error,
						};
					}
					if (chunk.type === 'error') {
						return { type: 'error', error: chunk.data?.message || chunk.data?.error_code || 'error' };
					}
					// Ignore status/ui events for now
					return null;
				}

				const stream = new ReadableStream<Uint8Array>({
					async start(controller) {
						let buffer = '';
						async function pump() {
							const { value, done } = await reader.read();
							if (done) {
								controller.close();
								return;
							}
							buffer += decoder.decode(value, { stream: true });
							const frames = buffer.split('\n\n');
							buffer = frames.pop() || '';
							for (const frame of frames) {
								// Parse SSE line: data: {...}
								const dataLine = frame.split('\n').find((l) => l.startsWith('data:'));
								if (!dataLine) continue;
								const jsonStr = dataLine.slice(5).trim();
								try {
									const aguiChunk = JSON.parse(jsonStr);
									const mapped = mapAGUItoVercel(aguiChunk);
									if (mapped) {
										const out = `data: ${JSON.stringify(mapped)}\n\n`;
										controller.enqueue(encoder.encode(out));
									}
								} catch {
									// ignore parse errors
								}
							}
							await pump();
						}
						await pump();
					},
					cancel() {
						try { reader.cancel(); } catch { }
					},
				});

				console.log('[Chat] ✅ Adapting gateway stream to UI format');
				return new Response(stream, {
					headers: {
						'Content-Type': 'text/event-stream',
						'Cache-Control': 'no-cache',
						Connection: 'keep-alive',
					},
				});
			} catch (error) {
				console.error('[Chat] ❌ Gateway request failed:', error);
				// Fall through to local provider on error
				console.log('[Chat] Falling back to local provider');
			}
		}

		const chat = await getChatById({ id });

		if (chat) {
			if (chat.userId !== session.user.id) {
				return new ChatSDKError('forbidden:chat').toResponse();
			}
		} else {
			const title = await generateTitleFromUserMessage({
				message,
			});

			await saveChat({
				id,
				userId: session.user.id,
				title,
				visibility: selectedVisibilityType,
			});
		}

		const messagesFromDb = await getMessagesByChatId({ id });
		const uiMessages = [...convertToUIMessages(messagesFromDb), message];

		const { longitude, latitude, city, country } = geolocation(request);

		const requestHints: RequestHints = {
			longitude,
			latitude,
			city,
			country,
		};

		await saveMessages({
			messages: [
				{
					chatId: id,
					id: message.id,
					role: 'user',
					parts: message.parts,
					attachments: [],
					createdAt: new Date(),
				},
			],
		});

		const streamId = generateUUID();
		await createStreamId({ streamId, chatId: id });

		let finalMergedUsage: AppUsage | undefined;

		const stream = createUIMessageStream({
			execute: ({ writer: dataStream }) => {
				const result = streamText({
					model: myProvider.languageModel(activeModelId),
					system: systemPrompt({ selectedChatModel: activeModelId, requestHints }),
					messages: convertToModelMessages(uiMessages),
					stopWhen: stepCountIs(5),
					experimental_activeTools:
						selectedChatModel === 'chat-model-reasoning'
							? []
							: ['getWeather', 'createDocument', 'updateDocument', 'requestSuggestions'],
					experimental_transform: smoothStream({ chunking: 'word' }),
					tools: {
						getWeather,
						createDocument: createDocument({ session, dataStream }),
						updateDocument: updateDocument({ session, dataStream }),
						requestSuggestions: requestSuggestions({
							session,
							dataStream,
						}),
					},
					experimental_telemetry: {
						isEnabled: isProductionEnvironment,
						functionId: 'stream-text',
					},
					onFinish: async ({ usage }) => {
						try {
							const providers = await getTokenlensCatalog();
							const modelId = myProvider.languageModel(activeModelId).modelId;
							if (!modelId) {
								finalMergedUsage = usage;
								dataStream.write({
									type: 'data-usage',
									data: finalMergedUsage,
								});
								return;
							}

							if (!providers) {
								finalMergedUsage = usage;
								dataStream.write({
									type: 'data-usage',
									data: finalMergedUsage,
								});
								return;
							}

							const summary = getUsage({ modelId, usage, providers });
							finalMergedUsage = { ...usage, ...summary, modelId } as AppUsage;
							dataStream.write({ type: 'data-usage', data: finalMergedUsage });
						} catch (err) {
							console.warn('TokenLens enrichment failed', err);
							finalMergedUsage = usage;
							dataStream.write({ type: 'data-usage', data: finalMergedUsage });
						}
					},
				});

				result.consumeStream();

				dataStream.merge(
					result.toUIMessageStream({
						sendReasoning: true,
					})
				);
			},
			generateId: generateUUID,
			onFinish: async ({ messages }) => {
				await saveMessages({
					messages: messages.map((currentMessage) => ({
						id: currentMessage.id,
						role: currentMessage.role,
						parts: currentMessage.parts,
						createdAt: new Date(),
						attachments: [],
						chatId: id,
					})),
				});

				if (finalMergedUsage) {
					try {
						await updateChatLastContextById({
							chatId: id,
							context: finalMergedUsage,
						});
					} catch (err) {
						console.warn('Unable to persist last usage for chat', id, err);
					}
				}
			},
			onError: () => {
				return 'Oops, an error occurred!';
			},
		});

		// const streamContext = getStreamContext();

		// if (streamContext) {
		//   return new Response(
		//     await streamContext.resumableStream(streamId, () =>
		//       stream.pipeThrough(new JsonToSseTransformStream())
		//     )
		//   );
		// }

		return new Response(stream.pipeThrough(new JsonToSseTransformStream()));
	} catch (error) {
		const vercelId = request.headers.get('x-vercel-id');

		if (error instanceof ChatSDKError) {
			return error.toResponse();
		}

		// Check for Vercel AI Gateway credit card error
		if (
			error instanceof Error &&
			error.message?.includes('AI Gateway requires a valid credit card on file to service requests')
		) {
			return new ChatSDKError('bad_request:activate_gateway').toResponse();
		}

		console.error('Unhandled error in chat API:', error, { vercelId });
		return new ChatSDKError('offline:chat').toResponse();
	}
}

export async function DELETE(request: Request) {
	const { searchParams } = new URL(request.url);
	const id = searchParams.get('id');

	if (!id) {
		return new ChatSDKError('bad_request:api').toResponse();
	}

	const session = await auth();

	if (!session?.user) {
		return new ChatSDKError('unauthorized:chat').toResponse();
	}

	const chat = await getChatById({ id });

	if (chat?.userId !== session.user.id) {
		return new ChatSDKError('forbidden:chat').toResponse();
	}

	const deletedChat = await deleteChatById({ id });

	return Response.json(deletedChat, { status: 200 });
}
