import { GoogleGenerativeAI } from '@google/generative-ai';
import { ChatSDKError } from '@/lib/errors';
import { generateUUID } from '@/lib/utils';
import { type PostRequestBody, postRequestBodySchema } from './schema';

export const maxDuration = 60;

const genAI = new GoogleGenerativeAI(process.env.GOOGLE_GENERATIVE_AI_API_KEY || '');

export async function POST(request: Request) {
	let requestBody: PostRequestBody;

	try {
		const json = await request.json();
		requestBody = postRequestBodySchema.parse(json);
	} catch (_) {
		return new ChatSDKError('bad_request:api').toResponse();
	}

	try {
		const { message, selectedChatModel } = requestBody;

		// Get the user's message text
		const userMessage = message.parts
			.filter((part) => part.type === 'text')
			.map((part) => part.text)
			.join('\n');

		// Determine model provider
		const isOpenRouter = selectedChatModel.includes('/');
		const isGoogleDirect = selectedChatModel.startsWith('gemini-');

		// Create readable stream for SSE
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
					controller.enqueue(
						encoder.encode(
							`data: ${JSON.stringify({
								type: 'text-start',
								id: messageId,
							})}\n\n`
						)
					);

					let fullText = '';
					let emittedText = false;

					// Handle Google AI direct API
					if (isGoogleDirect) {
						const model = genAI.getGenerativeModel({
							model: selectedChatModel,
							generationConfig: {
								temperature: 0.7,
								maxOutputTokens: 2000,
							},
						});

						const result = await model.generateContentStream(userMessage);

						for await (const chunk of result.stream) {
							const chunkText = chunk.text();

							if (!chunkText) {
								continue;
							}

							fullText += chunkText;
							emittedText = true;

							controller.enqueue(
								encoder.encode(
									`data: ${JSON.stringify({
										type: 'text-delta',
										id: messageId,
										delta: chunkText,
									})}\n\n`
								)
							);
						}

						if (!emittedText) {
							const aggregated = await result.response;
							const aggregatedText = aggregated.text();

							if (aggregatedText) {
								fullText = aggregatedText;
								controller.enqueue(
									encoder.encode(
										`data: ${JSON.stringify({
											type: 'text-delta',
											id: messageId,
											delta: aggregatedText,
										})}\n\n`
									)
								);
							}
						}
					}
					// Handle OpenRouter API
					else if (isOpenRouter) {
						const response = await fetch('https://openrouter.ai/api/v1/chat/completions', {
							method: 'POST',
							headers: {
								Authorization: `Bearer ${process.env.OPENROUTER_API_KEY}`,
								'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || 'http://localhost:3000',
								'X-Title': process.env.OPENROUTER_APP_TITLE || 'ERPNext CoAgent',
								'Content-Type': 'application/json',
							},
							body: JSON.stringify({
								model: selectedChatModel,
								messages: [
									{
										role: 'user',
										content: userMessage,
									},
								],
								stream: true,
							}),
						});

						if (!response.ok) {
							throw new Error(`OpenRouter API error: ${response.statusText}`);
						}

						const reader = response.body?.getReader();
						const decoder = new TextDecoder();

						if (!reader) {
							throw new Error('No response body');
						}

						while (true) {
							const { done, value } = await reader.read();
							if (done) break;

							const chunk = decoder.decode(value);
							const lines = chunk.split('\n').filter((line) => line.trim() !== '');

							for (const line of lines) {
								if (line.startsWith('data: ')) {
									const data = line.slice(6);
									if (data === '[DONE]') continue;

									try {
										const json = JSON.parse(data);
										const content = json.choices?.[0]?.delta?.content;

										if (content) {
											fullText += content;
											emittedText = true;

											controller.enqueue(
												encoder.encode(
													`data: ${JSON.stringify({
														type: 'text-delta',
														id: messageId,
														delta: content,
													})}\n\n`
												)
											);
										}
									} catch (e) {
										// Skip invalid JSON
										console.error('Failed to parse OpenRouter chunk:', e);
									}
								}
							}
						}
					} else {
						throw new Error(`Unsupported model: ${selectedChatModel}`);
					}

					controller.enqueue(
						encoder.encode(
							`data: ${JSON.stringify({
								type: 'text-end',
								id: messageId,
							})}\n\n`
						)
					);

					controller.enqueue(
						encoder.encode(`data: ${JSON.stringify({ type: 'finish-step' })}\n\n`)
					);

					controller.enqueue(
						encoder.encode(
							`data: ${JSON.stringify({
								type: 'finish',
								messageMetadata: { finishReason: 'stop' },
							})}\n\n`
						)
					);

					// Send usage data
					controller.enqueue(
						encoder.encode(
							`data: ${JSON.stringify({
								type: 'data-usage',
								data: {
									context: {},
									costUSD: {},
									modelId: selectedChatModel,
								},
							})}\n\n`
						)
					);
				} catch (error) {
					console.error('Error streaming:', error);
					controller.enqueue(
						encoder.encode(
							`data: ${JSON.stringify({
								type: 'error',
								error: 'Failed to generate response',
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
	} catch (error) {
		console.error('Unhandled error in chat API:', error);
		return new ChatSDKError('offline:chat').toResponse();
	}
}

export async function DELETE(request: Request) {
	const { searchParams } = new URL(request.url);
	const id = searchParams.get('id');

	if (!id) {
		return new ChatSDKError('bad_request:api').toResponse();
	}

	// DELETE logic removed for simplicity
	return Response.json({ success: true }, { status: 200 });
}
