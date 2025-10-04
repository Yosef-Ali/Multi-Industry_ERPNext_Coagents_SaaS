'use client';

import type { WorkflowStreamEvent } from '@/hooks/use-erpnext-copilot';
import { cn } from '@/lib/utils';
import { Component, type ReactNode } from 'react';

interface WorkflowStreamPanelProps {
	events: WorkflowStreamEvent[];
	isStreaming: boolean;
}

class ErrorBoundary extends Component<
	{ children: ReactNode },
	{ hasError: boolean; error?: Error }
> {
	constructor(props: { children: ReactNode }) {
		super(props);
		this.state = { hasError: false };
	}

	static getDerivedStateFromError(error: Error) {
		return { hasError: true, error };
	}

	render() {
		if (this.state.hasError) {
			return (
				<div className="mb-3 rounded-md border border-destructive/50 bg-destructive/10 p-3">
					<p className="text-sm text-destructive">Workflow stream error</p>
				</div>
			);
		}

		return this.props.children;
	}
}

export function WorkflowStreamPanel({ events, isStreaming }: WorkflowStreamPanelProps) {
	const recentEvents = events
		.filter(e => !['heartbeat', 'ping'].includes(e.eventName))
		.slice(-20);

	if (!recentEvents.length && !isStreaming) {
		return null;
	}

	// Helper to detect if event contains an artifact
	const isArtifactEvent = (payload: any): boolean => {
		return payload && typeof payload === 'object' && 'artifact_type' in payload;
	};

	return (
		<ErrorBoundary>
			<div className="mb-3 rounded-md border bg-muted/40 p-3">
			<div className="flex items-center justify-between text-sm font-medium">
				<span>Workflow Stream</span>
				<span
					className={cn(
						'text-[11px] uppercase tracking-wide text-muted-foreground',
						isStreaming ? 'animate-pulse' : 'text-muted-foreground'
					)}
				>
					{isStreaming ? 'Streaming…' : 'Idle'}
				</span>
			</div>

			<div className="mt-2 max-h-96 space-y-2 overflow-y-auto text-xs leading-relaxed">
				{recentEvents.map((event) => {
					const payload = event.payload as Record<string, unknown> | null;
					let summary = event.eventName;

					if (typeof payload === 'object' && payload) {
						if ('type' in payload && typeof payload.type === 'string') {
							summary = payload.type as string;
						} else if ('graph_name' in payload && typeof payload.graph_name === 'string') {
							summary = String(payload.graph_name);
						} else if ('step' in payload && typeof payload.step === 'string') {
							summary = String(payload.step);
						}
					}

					// Render artifact or standard event
					if (isArtifactEvent(payload)) {
						// Import dynamically to avoid bundling issues
						const ArtifactRenderer = require('./artifacts/artifact-renderers').ArtifactRenderer;
						return (
							<div key={event.id}>
								<ArtifactRenderer
									type={payload.artifact_type}
									data={payload.content}
									approved={payload.approved}
								/>
							</div>
						);
					}

					return (
						<div
							className="rounded bg-background/70 px-2 py-1 text-muted-foreground"
							key={event.id}
						>
							<div className="font-medium text-foreground">{summary}</div>
							{payload && (
								<pre className="mt-1 max-h-20 overflow-y-auto whitespace-pre-wrap text-[11px] text-muted-foreground/80">
									{event.raw}
								</pre>
							)}
						</div>
					);
				})}

				{isStreaming && (
					<div className="rounded px-2 py-1 text-[11px] text-muted-foreground/80">
						Awaiting next event…
					</div>
				)}
			</div>
			</div>
		</ErrorBoundary>
	);
}
