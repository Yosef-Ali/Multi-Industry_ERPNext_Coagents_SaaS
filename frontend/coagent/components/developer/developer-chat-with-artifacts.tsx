'use client';

import { useMemo, useState, useCallback } from 'react';
import { ArtifactContainer, type Artifact as DevArtifact } from '@/components/artifacts/artifact-container';
import { useLangGraphInterrupt } from '@copilotkit/react-core';
import { ApprovalDialog, type ApprovalRequest } from '@/components/approval-dialog';
import { Button } from '@/components/ui/button';
import { Chat } from '@/components/chat';
import { DataStreamHandler } from '@/components/data-stream-handler';
import type { ChatMessage } from '@/lib/types';
import type { AppUsage } from '@/lib/usage';
import type { VisibilityType } from '@/components/visibility-selector';
import { useArtifact } from '@/hooks/use-artifact';

export function DeveloperChatWithArtifacts({
  id,
  initialMessages,
  initialChatModel,
  initialVisibilityType,
  isReadonly,
  autoResume,
  initialLastContext,
}: {
  id: string;
  initialMessages: ChatMessage[];
  initialChatModel: string;
  initialVisibilityType: VisibilityType;
  isReadonly: boolean;
  autoResume: boolean;
  initialLastContext?: AppUsage;
}) {
  const { artifact } = useArtifact();
  const [approvalRequest, setApprovalRequest] = useState<ApprovalRequest | null>(null);
  const [showApprovalDialog, setShowApprovalDialog] = useState(false);

  // Use CopilotKit's LangGraph HITL hook
  const interruptUI = useLangGraphInterrupt({
    render: ({ event, resolve }) => {
      const data = event.value || {};
      const request: ApprovalRequest = {
        question: data.question || 'Do you want to proceed with this operation?',
        riskLevel: data.riskLevel || 'medium',
        operation: data.operation || '',
        toolCalls: data.toolCalls || [],
      };

      // Render floating HITL card
      return (
        <div className="pointer-events-auto fixed bottom-4 right-4 z-40 w-full max-w-sm space-y-3">
          <div className="overflow-hidden rounded-2xl border border-border bg-background/95 shadow-2xl backdrop-blur">
            <div className="bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-slate-100">
              Human in the Loop
            </div>
            <div className="space-y-4 px-4 py-5">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">{request.question}</p>
                <p className="text-xs text-muted-foreground">
                  The workflow paused so a human can review the requested action.
                </p>
              </div>
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase ${request.riskLevel === 'high'
                      ? 'bg-red-100 text-red-700'
                      : request.riskLevel === 'medium'
                        ? 'bg-amber-100 text-amber-700'
                        : 'bg-blue-100 text-blue-700'
                    }`}
                >
                  Risk: {request.riskLevel}
                </span>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => resolve('REJECTED')}>
                    Reject
                  </Button>
                  <Button size="sm" onClick={() => resolve('APPROVED')}>
                    Approve
                  </Button>
                </div>
              </div>
            </div>
          </div>
        </div>
      );
    },
  });

  const handleApprovalRequest = useCallback((data: any) => {
    console.log('[HITL] Approval request received:', data);
    setApprovalRequest({
      question: data.question || 'Do you want to proceed with this operation?',
      riskLevel: data.riskLevel || 'medium',
      operation: data.operation || '',
      toolCalls: data.toolCalls || [],
    });
    setShowApprovalDialog(true);
  }, []);

  const handleApprove = useCallback(async () => {
    console.log('[HITL] User approved operation');
    setShowApprovalDialog(false);

    const gatewayUrl = process.env.NEXT_PUBLIC_AGENT_GATEWAY_URL || 'http://localhost:3001';
    try {
      const response = await fetch(`${gatewayUrl}/developer-chat/resume`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chatId: id, approved: true }),
      });

      if (!response.ok) {
        throw new Error(`Resume failed: ${response.status}`);
      }

      console.log('[HITL] Workflow resumed successfully');
      setApprovalRequest(null);
    } catch (error) {
      console.error('[HITL] Resume error:', error);
    }
  }, [id]);

  const handleReject = useCallback(() => {
    console.log('[HITL] User rejected operation');
    setShowApprovalDialog(false);
    setApprovalRequest(null);
  }, []);

  const devArtifact: DevArtifact | null = useMemo(() => {
    if (!artifact?.isVisible) return null;
    if (!artifact?.content) return null;

    // Show only for code artifacts; extend if needed later
    const isCode = artifact.kind === 'code' || /```/.test(artifact.content);
    if (!isCode) return null;

    // Naive language detection from code fences
    const fenceLangMatch = artifact.content.match(/```(\w+)/);
    const language = (fenceLangMatch?.[1] || 'typescript') as DevArtifact['language'];

    // Strip triple backticks if present for clean display
    const code = artifact.content.replace(/^```[\w-]*\n?/m, '').replace(/```\s*$/m, '');

    return {
      id: artifact.documentId,
      title: artifact.title || 'Generated Code',
      type: 'code',
      language,
      code,
      createdAt: new Date().toISOString(),
    } as DevArtifact;
  }, [artifact]);

  return (
    <div className="flex h-dvh w-full overflow-hidden">
      {/* CopilotKit LangGraph HITL Interrupt UI */}
      {interruptUI ?? null}

      <div className="flex min-w-0 flex-1 flex-col">
        <Chat
          autoResume={autoResume}
          id={id}
          initialChatModel={initialChatModel}
          initialMessages={initialMessages}
          initialVisibilityType={initialVisibilityType}
          isReadonly={isReadonly}
        />
        <DataStreamHandler />
      </div>

      {devArtifact && (
        <div className="hidden w-[40%] min-w-[360px] max-w-[720px] border-l border-border p-3 md:block">
          <ArtifactContainer artifact={devArtifact} />
        </div>
      )}

      {approvalRequest && !showApprovalDialog && (
        <div className="pointer-events-auto fixed bottom-4 right-4 z-40 w-full max-w-sm space-y-3">
          <div className="overflow-hidden rounded-2xl border border-border bg-background/95 shadow-2xl backdrop-blur">
            <div className="bg-gradient-to-r from-slate-900 via-slate-700 to-slate-900 px-4 py-3 text-sm font-semibold uppercase tracking-wide text-slate-100">
              Human in the Loop
            </div>
            <div className="space-y-4 px-4 py-5">
              <div className="space-y-1">
                <p className="text-sm font-medium text-foreground">{approvalRequest.question}</p>
                <p className="text-xs text-muted-foreground">
                  The workflow paused so a human can review the requested action. You can approve to let the agent fix it automatically or keep iterating manually.
                </p>
              </div>
              <div className="flex items-center justify-between">
                <span
                  className={`inline-flex items-center rounded-full px-3 py-1 text-xs font-semibold uppercase ${approvalRequest.riskLevel === 'high'
                    ? 'bg-red-100 text-red-700'
                    : approvalRequest.riskLevel === 'medium'
                      ? 'bg-amber-100 text-amber-700'
                      : 'bg-blue-100 text-blue-700'
                    }`}
                >
                  Risk: {approvalRequest.riskLevel}
                </span>
                <Button size="sm" onClick={() => void handleApprove()}>
                  Fix
                </Button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* LangGraph HITL Approval Dialog */}
      <ApprovalDialog
        open={showApprovalDialog}
        request={approvalRequest}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
}

