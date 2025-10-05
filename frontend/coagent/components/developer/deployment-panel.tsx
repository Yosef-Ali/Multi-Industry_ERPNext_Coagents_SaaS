'use client';

import { useState } from 'react';
import type { Artifact } from '@/lib/types/artifact';

interface DeploymentPanelProps {
	artifact: Artifact | null;
}

export function DeploymentPanel({ artifact }: DeploymentPanelProps) {
	const [status, setStatus] = useState<'idle' | 'deploying' | 'success' | 'error'>('idle');
	const [error, setError] = useState<string | null>(null);

	if (!artifact) return null;

	const handleDeploy = async () => {
		setStatus('deploying');
		setError(null);

		try {
			// TODO: Call actual deployment API
			await new Promise((resolve) => setTimeout(resolve, 2000));
			setStatus('success');
		} catch (err: any) {
			setStatus('error');
			setError(err.message || 'Deployment failed');
		}
	};

	return (
		<div className="border-t p-4 bg-gray-50 space-y-4">
			{/* Risk Assessment */}
			<div className="flex items-center justify-between">
				<div>
					<h4 className="font-semibold text-sm">Ready to Deploy</h4>
					<p className="text-xs text-muted-foreground">
						This will create the {artifact.type} in your ERPNext instance
					</p>
				</div>
				<span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded font-medium">
					LOW Risk
				</span>
			</div>

			{/* Success/Error Messages */}
			{status === 'success' && (
				<div className="bg-green-50 border border-green-200 rounded-lg p-3">
					<div className="flex items-start gap-2">
						<span className="text-green-500">✓</span>
						<div className="text-sm">
							<p className="font-medium text-green-900">Successfully deployed!</p>
							<p className="text-green-700 text-xs mt-1">
								Your {artifact.type} is now available in ERPNext
							</p>
						</div>
					</div>
				</div>
			)}

			{status === 'error' && error && (
				<div className="bg-red-50 border border-red-200 rounded-lg p-3">
					<div className="flex items-start gap-2">
						<span className="text-red-500">✕</span>
						<div className="text-sm">
							<p className="font-medium text-red-900">Deployment failed</p>
							<p className="text-red-700 text-xs mt-1">{error}</p>
						</div>
					</div>
				</div>
			)}

			{/* Deploy Button */}
			<button
				onClick={handleDeploy}
				disabled={status === 'deploying' || status === 'success'}
				className="w-full px-4 py-3 bg-blue-500 text-white rounded-lg font-medium hover:bg-blue-600 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
				data-action="deploy"
			>
				{status === 'deploying' ? (
					<span className="flex items-center justify-center gap-2">
						<span className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
						Deploying...
					</span>
				) : status === 'success' ? (
					'Deployed ✓'
				) : (
					'🚀 Deploy to ERPNext'
				)}
			</button>
		</div>
	);
}
