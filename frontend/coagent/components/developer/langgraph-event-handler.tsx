'use client';

import { useEffect, useState } from 'react';
import { ApprovalDialog, type ApprovalRequest } from '@/components/approval-dialog';

export function LangGraphEventHandler() {
	const [approvalRequest, setApprovalRequest] = useState<ApprovalRequest | null>(null);
	const [showDialog, setShowDialog] = useState(false);

	useEffect(() => {
		// Listen for custom LangGraph events from the chat stream
		const handleLangGraphEvent = (event: MessageEvent) => {
			try {
				const data = JSON.parse(event.data);

				if (data.type === 'interrupt' && data.subtype === 'approval_request') {
					console.log('[LangGraph] Approval request received:', data.data);
					setApprovalRequest({
						question: data.data.question || 'Do you want to proceed?',
						riskLevel: data.data.riskLevel || 'medium',
						operation: data.data.operation || '',
						toolCalls: data.data.toolCalls || [],
					});
					setShowDialog(true);
				}
			} catch (err) {
				// Not a LangGraph event, ignore
			}
		};

		// Create event source to listen to server-sent events
		window.addEventListener('message', handleLangGraphEvent);

		return () => {
			window.removeEventListener('message', handleLangGraphEvent);
		};
	}, []);

	const handleApprove = async () => {
		console.log('[LangGraph] User approved operation');
		setShowDialog(false);

		// TODO: Call resume endpoint
		const gatewayUrl = process.env.NEXT_PUBLIC_AGENT_GATEWAY_URL || 'http://localhost:3001';
		// Get chatId from URL or context
		const urlParams = new URLSearchParams(window.location.search);
		const chatId = urlParams.get('chatId');

		if (!chatId) {
			console.error('[LangGraph] No chatId found');
			return;
		}

		try {
			const response = await fetch(`${gatewayUrl}/developer-chat/resume`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ chatId, approved: true }),
			});

			if (!response.ok) {
				throw new Error(`Resume failed: ${response.status}`);
			}

			console.log('[LangGraph] Workflow resumed');
		} catch (error) {
			console.error('[LangGraph] Resume error:', error);
		}
	};

	const handleReject = () => {
		console.log('[LangGraph] User rejected operation');
		setShowDialog(false);
		setApprovalRequest(null);
	};

	return (
		<ApprovalDialog
			open={showDialog}
			request={approvalRequest}
			onApprove={handleApprove}
			onReject={handleReject}
		/>
	);
}
