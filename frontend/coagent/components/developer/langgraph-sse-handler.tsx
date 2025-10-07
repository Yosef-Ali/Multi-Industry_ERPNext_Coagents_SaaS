'use client';

import { useEffect, useRef } from 'react';

export interface LangGraphSSEHandlerProps {
	onApprovalRequest: (data: {
		question: string;
		riskLevel: 'low' | 'medium' | 'high';
		operation: string;
		toolCalls: any[];
	}) => void;
	onStateUpdate: (data: any) => void;
	onComplete: () => void;
}

export function LangGraphSSEHandler({
	onApprovalRequest,
	onStateUpdate,
	onComplete,
}: LangGraphSSEHandlerProps) {
	const originalFetch = useRef<typeof fetch>();

	useEffect(() => {
		// Intercept fetch to monitor SSE streams from /developer/api/chat
		if (!originalFetch.current) {
			originalFetch.current = window.fetch;
		}

		window.fetch = async (...args) => {
			const response = await originalFetch.current!(...args);

			// Only intercept /developer/api/chat requests
			const url = args[0]?.toString() || '';
			if (url.includes('/developer/api/chat') && response.body) {
				const reader = response.body.getReader();
				const stream = new ReadableStream({
					async start(controller) {
						const decoder = new TextDecoder();
						let buffer = '';

						try {
							while (true) {
								const { done, value } = await reader.read();

								if (done) {
									controller.close();
									break;
								}

								// Pass through to original handler
								controller.enqueue(value);

								// Parse SSE events
								buffer += decoder.decode(value, { stream: true });
								const lines = buffer.split('\n');
								buffer = lines.pop() || '';

								for (const line of lines) {
									if (line.startsWith('data: ')) {
										try {
											const data = JSON.parse(line.slice(6));

											// Check for LangGraph events
											if (data.type === 'interrupt' && data.subtype === 'approval_request') {
												console.log('[LangGraph] Approval request detected:', data.data);
												onApprovalRequest(data.data);
											} else if (data.type === 'state_update') {
												onStateUpdate(data.data);
											} else if (data.type === 'complete') {
												onComplete();
											}
										} catch (err) {
											// Not a LangGraph event, ignore
										}
									}
								}
							}
						} catch (err) {
							console.error('[LangGraph SSE] Stream error:', err);
							controller.error(err);
						}
					},
				});

				// Return new response with intercepted stream
				return new Response(stream, {
					headers: response.headers,
					status: response.status,
					statusText: response.statusText,
				});
			}

			return response;
		};

		return () => {
			// Restore original fetch on cleanup
			if (originalFetch.current) {
				window.fetch = originalFetch.current;
			}
		};
	}, [onApprovalRequest, onStateUpdate, onComplete]);

	return null; // This is a logic-only component
}
