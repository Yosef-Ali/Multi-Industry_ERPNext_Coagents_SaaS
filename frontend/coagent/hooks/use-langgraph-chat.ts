'use client';

import { useState, useCallback } from 'react';
import type { ApprovalRequest } from '@/components/approval-dialog';

export interface LangGraphChatState {
	chatId: string;
	riskLevel?: 'low' | 'medium' | 'high';
	approved?: boolean;
	response?: string;
	error?: string | null;
	toolResults?: Record<string, any>;
}

export interface LangGraphEvent {
	type: 'interrupt' | 'state_update' | 'complete' | 'end';
	subtype?: string;
	data?: any;
	chatId?: string;
}

export interface UseLangGraphChatReturn {
	/** Current approval request (if any) */
	approvalRequest: ApprovalRequest | null;
	/** Whether approval dialog should be shown */
	showApprovalDialog: boolean;
	/** Current chat state */
	chatState: LangGraphChatState | null;
	/** Whether workflow is in progress */
	isProcessing: boolean;
	/** Send message and handle workflow */
	sendMessage: (chatId: string, userId: string, message: string) => Promise<void>;
	/** Handle user approval decision */
	handleApproval: (approved: boolean) => Promise<void>;
	/** Reset state */
	reset: () => void;
}

export function useLangGraphChat(): UseLangGraphChatReturn {
	const [approvalRequest, setApprovalRequest] = useState<ApprovalRequest | null>(null);
	const [showApprovalDialog, setShowApprovalDialog] = useState(false);
	const [chatState, setChatState] = useState<LangGraphChatState | null>(null);
	const [isProcessing, setIsProcessing] = useState(false);
	const [currentChatId, setCurrentChatId] = useState<string | null>(null);

	const reset = useCallback(() => {
		setApprovalRequest(null);
		setShowApprovalDialog(false);
		setChatState(null);
		setIsProcessing(false);
		setCurrentChatId(null);
	}, []);

	const processSSEStream = useCallback(async (response: Response) => {
		const reader = response.body?.getReader();
		const decoder = new TextDecoder();

		if (!reader) {
			throw new Error('No response body');
		}

		try {
			while (true) {
				const { done, value } = await reader.read();

				if (done) {
					setIsProcessing(false);
					break;
				}

				const chunk = decoder.decode(value);
				const lines = chunk.split('\n');

				for (const line of lines) {
					if (line.startsWith('data: ')) {
						const data = line.slice(6);

						try {
							const event: LangGraphEvent = JSON.parse(data);

							// Handle different event types
							switch (event.type) {
								case 'interrupt':
									if (event.subtype === 'approval_request' && event.data) {
										setApprovalRequest({
											question: event.data.question,
											riskLevel: event.data.riskLevel,
											operation: event.data.operation,
											toolCalls: event.data.toolCalls || [],
										});
										setShowApprovalDialog(true);
										setIsProcessing(false);
									}
									break;

								case 'state_update':
									if (event.data) {
										setChatState(event.data);
									}
									break;

								case 'complete':
									setIsProcessing(false);
									console.log('[LangGraph] Workflow complete');
									break;

								case 'end':
									setIsProcessing(false);
									break;

								default:
									console.log('[LangGraph] Unknown event type:', event.type);
							}
						} catch (err) {
							console.error('[LangGraph] Failed to parse SSE event:', err);
						}
					}
				}
			}
		} finally {
			reader.releaseLock();
		}
	}, []);

	const sendMessage = useCallback(
		async (chatId: string, userId: string, message: string) => {
			setIsProcessing(true);
			setCurrentChatId(chatId);

			const gatewayUrl =
				process.env.NEXT_PUBLIC_AGENT_GATEWAY_URL || 'http://localhost:3001';

			try {
				const response = await fetch(`${gatewayUrl}/developer-chat`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						chatId,
						userId,
						message,
					}),
				});

				if (!response.ok) {
					throw new Error(`Developer chat request failed: ${response.status}`);
				}

				await processSSEStream(response);
			} catch (error) {
				console.error('[LangGraph] Send message error:', error);
				setIsProcessing(false);
				throw error;
			}
		},
		[processSSEStream]
	);

	const handleApproval = useCallback(
		async (approved: boolean) => {
			if (!currentChatId) {
				console.error('[LangGraph] No active chat to resume');
				return;
			}

			setShowApprovalDialog(false);
			setIsProcessing(true);

			const gatewayUrl =
				process.env.NEXT_PUBLIC_AGENT_GATEWAY_URL || 'http://localhost:3001';

			try {
				const response = await fetch(`${gatewayUrl}/developer-chat/resume`, {
					method: 'POST',
					headers: {
						'Content-Type': 'application/json',
					},
					body: JSON.stringify({
						chatId: currentChatId,
						approved,
					}),
				});

				if (!response.ok) {
					throw new Error(`Resume request failed: ${response.status}`);
				}

				await processSSEStream(response);

				// Clear approval request after processing
				setApprovalRequest(null);
			} catch (error) {
				console.error('[LangGraph] Handle approval error:', error);
				setIsProcessing(false);
				throw error;
			}
		},
		[currentChatId, processSSEStream]
	);

	return {
		approvalRequest,
		showApprovalDialog,
		chatState,
		isProcessing,
		sendMessage,
		handleApproval,
		reset,
	};
}
