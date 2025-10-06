'use client';

import { useMemo } from 'react';
import { ArtifactContainer, type Artifact as DevArtifact } from '@/components/artifacts/artifact-container';
import { Chat } from '@/components/chat';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { ApprovalDialog } from '@/components/approval-dialog';
import type { ChatMessage } from '@/lib/types';
import type { AppUsage } from '@/lib/usage';
import type { VisibilityType } from '@/components/visibility-selector';
import { useArtifact } from '@/hooks/use-artifact';
import { useLangGraphChat } from '@/hooks/use-langgraph-chat';

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
  const {
    approvalRequest,
    showApprovalDialog,
    chatState,
    isProcessing,
    handleApproval,
  } = useLangGraphChat();

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

      {/* LangGraph HITL Approval Dialog */}
      <ApprovalDialog
        open={showApprovalDialog}
        request={approvalRequest}
        onApprove={() => handleApproval(true)}
        onReject={() => handleApproval(false)}
      />
    </div>
  );
}

