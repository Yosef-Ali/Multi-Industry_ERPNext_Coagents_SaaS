/**
 * Developer Chat API - Bridge to LangGraph Workflow
 * Accepts AI SDK format and forwards to workflow service via SSE
 */

import { ChatSDKError } from '@/lib/errors';
import { generateVariants } from '@/lib/generation/variant-generator';
import type { Artifact } from '@/lib/types/artifact';
import { generateUUID } from '@/lib/utils';
import { type PostRequestBody, postRequestBodySchema } from '../../chat/schema';

export const maxDuration = 60;

/**
 * Handle variant generation requests directly
 */
async function handleVariantGeneration(userMessage: string) {
	const encoder = new TextEncoder();
	const messageId = generateUUID();

	const stream = new ReadableStream({
		async start(controller) {
			try {
				// Send start event
				controller.enqueue(
					encoder.encode(`data: ${JSON.stringify({ type: 'start', messageId })}\n\n`)
				);

				controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start-step' })}\n\n`));

				controller.enqueue(
					encoder.encode(
						`data: ${JSON.stringify({
							type: 'text-start',
							id: messageId,
						})}\n\n`
					)
				);

				// Analyze requirements
				controller.enqueue(
					encoder.encode(
						`data: ${JSON.stringify({
							type: 'text-delta',
							id: messageId,
							text: '🔍 Analyzing your requirements...\n\n',
						})}\n\n`
					)
				);

				// Simple heuristic analysis
				const lowerMsg = userMessage.toLowerCase();
				let primaryType: 'doctype' | 'workflow' | 'code' | 'page' | 'report' = 'doctype';

				if (lowerMsg.includes('workflow') || lowerMsg.includes('approval')) {
					primaryType = 'workflow';
				} else if (lowerMsg.includes('report')) {
					primaryType = 'report';
				} else if (lowerMsg.includes('page')) {
					primaryType = 'page';
				} else if (lowerMsg.includes('script') || lowerMsg.includes('code')) {
					primaryType = 'code';
				}

				// Extract industry
				let industry: string | undefined;
				const industries = ['healthcare', 'manufacturing', 'retail', 'finance', 'education'];
				for (const ind of industries) {
					if (lowerMsg.includes(ind)) {
						industry = ind.charAt(0).toUpperCase() + ind.slice(1);
						break;
					}
				}

				const context = {
					primaryType,
					industry,
					userPrompt: userMessage,
					components: [],
					workflows: [],
					requirements: { functional: [userMessage], technical: [] },
				};

				controller.enqueue(
					encoder.encode(
						`data: ${JSON.stringify({
							type: 'text-delta',
							id: messageId,
							text: `✅ Detected: ${context.primaryType.toUpperCase()}\n`,
						})}\n\n`
					)
				);

				if (context.industry) {
					controller.enqueue(
						encoder.encode(
							`data: ${JSON.stringify({
								type: 'text-delta',
								id: messageId,
								text: `📊 Industry: ${context.industry}\n`,
							})}\n\n`
						)
					);
				}

				// Generate variants
				controller.enqueue(
					encoder.encode(
						`data: ${JSON.stringify({
							type: 'text-delta',
							id: messageId,
							text: '\n⚙️  Generating 3 implementation variants...\n\n',
						})}\n\n`
					)
				);

				const variants = await generateVariants(context);

				// Send variants as structured data
				const variantsData = {
					variant1: serializeArtifact(variants[0]),
					variant2: serializeArtifact(variants[1]),
					variant3: serializeArtifact(variants[2]),
					context,
				};

				// Send as custom event that the UI can process
				controller.enqueue(
					encoder.encode(
						`data: ${JSON.stringify({
							type: 'variants-generated',
							variants: variantsData,
						})}\n\n`
					)
				);

				// Send user-friendly summary
				controller.enqueue(
					encoder.encode(
						`data: ${JSON.stringify({
							type: 'text-delta',
							id: messageId,
							text:
								`✨ Generated 3 variants:\n\n` +
								`**${variants[0].title}**\n${variants[0].description}\n\n` +
								`**${variants[1].title}**\n${variants[1].description}\n\n` +
								`**${variants[2].title}**\n${variants[2].description}\n\n` +
								`👉 Select a variant from the panel on the right to view the code.`,
						})}\n\n`
					)
				);

				// Send finish event
				controller.enqueue(
					encoder.encode(
						`data: ${JSON.stringify({
							type: 'finish',
							messageId,
						})}\n\n`
					)
				);

				controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'finish-step' })}\n\n`));
			} catch (error) {
				console.error('[Variant Generation] Error:', error);
				controller.enqueue(
					encoder.encode(
						`data: ${JSON.stringify({
							type: 'error',
							error: error instanceof Error ? error.message : 'Failed to generate variants',
						})}\n\n`
					)
				);
			} finally {
				controller.close();
			}
		},
	});

	return new Response(stream, {
		headers: {
			'Content-Type': 'text/event-stream',
			'Cache-Control': 'no-cache',
			Connection: 'keep-alive',
		},
	});
}

/**
 * Serialize artifact for transmission
 */
function serializeArtifact(artifact: Artifact) {
	return {
		variant: artifact.variant,
		title: artifact.title,
		description: artifact.description,
		type: artifact.type,
		complexity: artifact.variant === 1 ? 'low' : artifact.variant === 2 ? 'medium' : 'high',
		artifact,
	};
}

export async function POST(request: Request) {
	let requestBody: PostRequestBody;

	try {
		const json = await request.json();
		requestBody = postRequestBodySchema.parse(json);
	} catch (_) {
		return new ChatSDKError('bad_request:api').toResponse();
	}

	try {
		const { message } = requestBody;

		// Get the user's message text
		const userMessage = message.parts
			.filter((part) => part.type === 'text')
			.map((part) => part.text)
			.join('\n');

		// Detect if this is a variant generation request
		const isVariantRequest =
			/create|generate|make|build|develop/i.test(userMessage) &&
			/doctype|workflow|report|page|form/i.test(userMessage);

		// If it's a variant request, generate directly
		if (isVariantRequest) {
			return handleVariantGeneration(userMessage);
		}

		// Get gateway URL from environment
		const gatewayBase = process.env.NEXT_PUBLIC_GATEWAY_URL || 'http://localhost:3000';
		const aguiEndpoint = `${gatewayBase.replace(/\/+$/, '')}/agui`;

		// Create workflow request
		const workflowId = generateUUID();
		const workflowBody = {
			graph_name: 'hotel_o2c', // Default workflow
			initial_state: {
				thread_id: workflowId,
				prompt: userMessage,
				app_context: {
					appType: 'developer',
					currentPage: '/developer',
					userRole: 'developer',
					appData: {},
				},
			},
		};

		// Forward to workflow service and stream response
		const encoder = new TextEncoder();
		const stream = new ReadableStream({
			async start(controller) {
				const messageId = generateUUID();

				// Send start event
				controller.enqueue(
					encoder.encode(`data: ${JSON.stringify({ type: 'start', messageId })}\n\n`)
				);

				controller.enqueue(encoder.encode(`data: ${JSON.stringify({ type: 'start-step' })}\n\n`));

				try {
					// Call workflow service
					const response = await fetch(aguiEndpoint, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							Accept: 'text/event-stream',
						},
						body: JSON.stringify(workflowBody),
					});

					if (!response.ok || !response.body) {
						throw new Error(`Workflow error: ${response.status}`);
					}

					controller.enqueue(
						encoder.encode(
							`data: ${JSON.stringify({
								type: 'text-start',
								id: messageId,
							})}\n\n`
						)
					);

					// Stream workflow SSE events and convert to AI SDK format
					const reader = response.body.getReader();
					const decoder = new TextDecoder();
					let buffer = '';

					while (true) {
						const { done, value } = await reader.read();
						if (done) break;

						buffer += decoder.decode(value, { stream: true });
						const lines = buffer.split('\n');
						buffer = lines.pop() || '';

						for (const line of lines) {
							if (line.startsWith('data:')) {
								const data = line.slice(5).trim();
								if (!data) continue;

								try {
									const event = JSON.parse(data);

									// Convert workflow events to AI SDK text deltas
									if (event.type === 'text' || event.content) {
										const text = event.content || event.text || '';
										controller.enqueue(
											encoder.encode(
												`data: ${JSON.stringify({
													type: 'text-delta',
													id: messageId,
													text,
												})}\n\n`
											)
										);
									}
								} catch (_e) {
									// Skip invalid JSON
								}
							}
						}
					}

					// Send finish event
					controller.enqueue(
						encoder.encode(
							`data: ${JSON.stringify({
								type: 'finish',
								messageId,
							})}\n\n`
						)
					);
				} catch (error) {
					console.error('[Developer Chat] Error:', error);
					controller.enqueue(
						encoder.encode(
							`data: ${JSON.stringify({
								type: 'error',
								error: error instanceof Error ? error.message : 'Unknown error',
							})}\n\n`
						)
					);
				} finally {
					controller.enqueue(
						encoder.encode(`data: ${JSON.stringify({ type: 'finish-step' })}\n\n`)
					);
					controller.close();
				}
			},
		});

		return new Response(stream, {
			headers: {
				'Content-Type': 'text/event-stream',
				'Cache-Control': 'no-cache',
				Connection: 'keep-alive',
			},
		});
	} catch (error) {
		console.error('[Developer Chat] Request error:', error);
		return new ChatSDKError('bad_request:api').toResponse();
	}
}
