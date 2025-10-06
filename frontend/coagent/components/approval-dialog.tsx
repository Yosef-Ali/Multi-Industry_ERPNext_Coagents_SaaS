'use client';

import * as React from 'react';
import {
	Dialog,
	DialogContent,
	DialogDescription,
	DialogFooter,
	DialogHeader,
	DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Alert, AlertDescription } from '@/components/ui/alert';
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
	if (!request) return null;

	const riskConfig = RISK_CONFIG[request.riskLevel];
	const RiskIcon = riskConfig.icon;

	return (
		<Dialog open={open} onOpenChange={(isOpen) => !isOpen && onReject()}>
			<DialogContent className="sm:max-w-[600px]">
				<DialogHeader>
					<DialogTitle className="flex items-center gap-2">
						<RiskIcon className={`h-5 w-5 ${riskConfig.color}`} />
						Approval Required
					</DialogTitle>
					<DialogDescription>{request.question}</DialogDescription>
				</DialogHeader>

				<div className="space-y-4">
					{/* Risk Level Alert */}
					<Alert className={`${riskConfig.bgColor} ${riskConfig.borderColor}`}>
						<AlertDescription className="flex items-center gap-2">
							<span className="font-semibold">Risk Level:</span>
							<span className={`uppercase font-bold ${riskConfig.color}`}>
								{request.riskLevel}
							</span>
						</AlertDescription>
					</Alert>

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
						<Alert className="bg-red-50 border-red-200">
							<AlertTriangle className="h-4 w-4 text-red-600" />
							<AlertDescription className="text-red-800">
								<strong>Warning:</strong> This is a high-risk operation that may modify
								critical data or system state. Please review carefully before approving.
							</AlertDescription>
						</Alert>
					)}
				</div>

				<DialogFooter className="gap-2 sm:gap-0">
					<Button variant="outline" onClick={onReject} className="w-full sm:w-auto">
						Cancel
					</Button>
					<Button
						onClick={onApprove}
						className={`w-full sm:w-auto ${
							request.riskLevel === 'high'
								? 'bg-red-600 hover:bg-red-700'
								: 'bg-primary hover:bg-primary/90'
						}`}
					>
						<CheckCircle className="mr-2 h-4 w-4" />
						Approve & Execute
					</Button>
				</DialogFooter>
			</DialogContent>
		</Dialog>
	);
}
