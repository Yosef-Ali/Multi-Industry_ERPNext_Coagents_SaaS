'use client';

import * as React from 'react';
import { Button } from '@/components/ui/button';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

export interface ApprovalRequest {
	question: string;
	riskLevel: 'low' | 'medium' | 'high';
	operation: string;
	toolCalls: Array<{
		name: string;
		input: Record<string, any>;
	}>;
}

export interface ApprovalDialogProps {
	open: boolean;
	request: ApprovalRequest | null;
	onApprove: () => void;
	onReject: () => void;
}

const RISK_CONFIG = {
	low: {
		icon: Info,
		color: 'text-blue-600',
		bgColor: 'bg-blue-50',
		borderColor: 'border-blue-200',
	},
	medium: {
		icon: AlertTriangle,
		color: 'text-yellow-600',
		bgColor: 'bg-yellow-50',
		borderColor: 'border-yellow-200',
	},
	high: {
		icon: AlertTriangle,
		color: 'text-red-600',
		bgColor: 'bg-red-50',
		borderColor: 'border-red-200',
	},
};

export function ApprovalDialog({ open, request, onApprove, onReject }: ApprovalDialogProps) {
	if (!open || !request) return null;

	const riskConfig = RISK_CONFIG[request.riskLevel];
	const RiskIcon = riskConfig.icon;

	return (
		<div className="fixed inset-0 z-50 flex items-center justify-center">
			{/* Backdrop */}
			<div
				className="fixed inset-0 bg-black/50"
				onClick={onReject}
			/>

			{/* Dialog */}
			<div className="relative z-50 w-full max-w-2xl bg-background border rounded-lg shadow-lg p-6 m-4">
				{/* Header */}
				<div className="mb-4">
					<h2 className="text-xl font-semibold flex items-center gap-2 mb-2">
						<RiskIcon className={`h-5 w-5 ${riskConfig.color}`} />
						Approval Required
					</h2>
					<p className="text-muted-foreground">{request.question}</p>
				</div>

				<div className="space-y-4">
					{/* Risk Level */}
					<div className={`rounded-md p-3 ${riskConfig.bgColor} border ${riskConfig.borderColor}`}>
						<div className="flex items-center gap-2">
							<span className="font-semibold">Risk Level:</span>
							<span className={`uppercase font-bold ${riskConfig.color}`}>
								{request.riskLevel}
							</span>
						</div>
					</div>

					{/* Operation Details */}
					<div className="space-y-2">
						<h4 className="text-sm font-semibold">Operation:</h4>
						<div className="rounded-md bg-muted p-3">
							<code className="text-sm">{request.operation}</code>
						</div>
					</div>

					{/* Tool Calls */}
					{request.toolCalls && request.toolCalls.length > 0 && (
						<div className="space-y-2">
							<h4 className="text-sm font-semibold">
								Actions to be performed ({request.toolCalls.length}):
							</h4>
							<div className="space-y-2 max-h-[300px] overflow-y-auto">
								{request.toolCalls.map((toolCall, index) => (
									<div
										key={index}
										className="rounded-md border border-border bg-card p-3 text-sm"
									>
										<div className="font-semibold text-foreground mb-2">
											{index + 1}. {toolCall.name}
										</div>
										<pre className="text-xs text-muted-foreground overflow-x-auto">
											{JSON.stringify(toolCall.input, null, 2)}
										</pre>
									</div>
								))}
							</div>
						</div>
					)}

					{/* Warning for high-risk operations */}
					{request.riskLevel === 'high' && (
						<div className="rounded-md p-3 bg-red-50 border border-red-200">
							<div className="flex gap-2">
								<AlertTriangle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
								<div className="text-red-800 text-sm">
									<strong>Warning:</strong> This is a high-risk operation that may modify
									critical data or system state. Please review carefully before approving.
								</div>
							</div>
						</div>
					)}
				</div>

				{/* Footer */}
				<div className="flex gap-2 mt-6 justify-end">
					<Button variant="outline" onClick={onReject}>
						Cancel
					</Button>
					<Button
						onClick={onApprove}
						className={
							request.riskLevel === 'high'
								? 'bg-red-600 hover:bg-red-700 text-white'
								: ''
						}
					>
						<CheckCircle className="mr-2 h-4 w-4" />
						Approve & Execute
					</Button>
				</div>
			</div>
		</div>
	);
}
