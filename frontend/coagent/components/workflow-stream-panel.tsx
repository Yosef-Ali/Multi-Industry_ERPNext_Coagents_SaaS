'use client';

import { cn } from '@/lib/utils';
import type { WorkflowStreamEvent } from '@/hooks/use-erpnext-copilot';

interface WorkflowStreamPanelProps {
  events: WorkflowStreamEvent[];
  isStreaming: boolean;
}

export function WorkflowStreamPanel({ events, isStreaming }: WorkflowStreamPanelProps) {
  const recentEvents = events.slice(-20);

  if (!recentEvents.length && !isStreaming) {
    return null;
  }

  return (
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

      <div className="mt-2 max-h-40 space-y-1 overflow-y-auto text-xs leading-relaxed">
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
  );
}
