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
		const { message } = requestBody;

		// Get the user's message text
		const userMessage = message.parts
			.filter((part) => part.type === 'text')
			.map((part) => part.text)
			.join('\n');

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
					// Initialize Gemini model
					const model = genAI.getGenerativeModel({
						model: 'gemini-2.5-flash',
						generationConfig: {
							temperature: 0.7,
							maxOutputTokens: 1000,
						},
					});

					// Stream the response
					const result = await model.generateContentStream(userMessage);

					controller.enqueue(
						encoder.encode(
							`data: ${JSON.stringify({
								type: 'text-start',
								id: messageId,
							})}\n\n`
						)
					);

					let _fullText = '';
					let emittedText = false;

					for await (const chunk of result.stream) {
						const chunkText = chunk.text();

						if (!chunkText) {
							continue;
						}

						_fullText += chunkText;
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
							_fullText = aggregatedText;
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
									modelId: 'gemini-2.5-flash',
								},
							})}\n\n`
						)
					);
				} catch (error) {
					console.error('Error streaming from Gemini:', error);
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
