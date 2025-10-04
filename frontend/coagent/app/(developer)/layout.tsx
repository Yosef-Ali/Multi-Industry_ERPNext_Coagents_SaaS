'use client';

import { useState, useRef, useCallback, useEffect } from 'react';
import { CopilotKit } from '@copilotkit/react-core';
import { useArtifactStore } from '@/lib/store/artifact-store';
import { useKeyboardShortcuts } from '@/hooks/use-keyboard-shortcuts';
import { VariantSelector } from '@/components/developer/variant-selector';
import { RefinementInput } from '@/components/developer/refinement-input';
import { DeploymentPanel } from '@/components/developer/deployment-panel';
import { DocTypePreview } from '@/components/preview/doctype-preview';
import { WorkflowPreview } from '@/components/preview/workflow-preview';
import { CodePreview } from '@/components/preview/code-preview';

export default function DeveloperLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [leftWidth, setLeftWidth] = useState(40); // 40% chat, 60% preview
  const isDraggingRef = useRef(false);
  const { previewArtifact } = useArtifactStore();

  // Enable keyboard shortcuts
  useKeyboardShortcuts();

  const handleMouseDown = useCallback(() => {
    isDraggingRef.current = true;
    document.body.style.cursor = 'col-resize';
    document.body.style.userSelect = 'none';
  }, []);

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDraggingRef.current) return;

      const containerWidth = window.innerWidth;
      const newLeftWidth = (e.clientX / containerWidth) * 100;

      // Constrain between 25% and 75%
      if (newLeftWidth >= 25 && newLeftWidth <= 75) {
        setLeftWidth(newLeftWidth);
      }
    },
    []
  );

  const handleMouseUp = useCallback(() => {
    isDraggingRef.current = false;
    document.body.style.cursor = '';
    document.body.style.userSelect = '';
  }, []);

  useEffect(() => {
    window.addEventListener('mousemove', handleMouseMove);
    window.addEventListener('mouseup', handleMouseUp);

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
      window.removeEventListener('mouseup', handleMouseUp);
    };
  }, [handleMouseMove, handleMouseUp]);

  return (
    <CopilotKit runtimeUrl="/api/copilot/developer">
      <div className="flex h-screen w-screen overflow-hidden bg-background">
        {/* Left Panel - Chat Interface */}
        <div
          className="flex flex-col border-r border-border"
          style={{ width: `${leftWidth}%` }}
        >
          <div className="flex-1 overflow-y-auto">
            {/* Chat content will be rendered here */}
            <div className="p-4">
              <h1 className="text-2xl font-bold tracking-tight mb-4">
                ERPNext Developer Assistant
              </h1>
              {children}
            </div>
          </div>
        </div>

        {/* Resize Handle */}
        <div
          className="w-1 bg-border hover:bg-primary/50 cursor-col-resize transition-colors relative group"
          onMouseDown={handleMouseDown}
        >
          <div className="absolute inset-y-0 -left-1 -right-1 group-hover:bg-primary/10" />
        </div>

        {/* Right Panel - Preview */}
        <div
          className="flex flex-col"
          style={{ width: `${100 - leftWidth}%` }}
        >
          {/* Variant Selector */}
          <VariantSelector />

          {/* Preview Content */}
          <div className="flex-1 overflow-y-auto bg-white">
            {previewArtifact ? (
              <>
                {previewArtifact.type === 'doctype' && (
                  <DocTypePreview artifact={previewArtifact as any} />
                )}
                {previewArtifact.type === 'workflow' && (
                  <WorkflowPreview artifact={previewArtifact as any} />
                )}
                {(previewArtifact.type === 'code' ||
                  previewArtifact.type === 'page' ||
                  previewArtifact.type === 'report') && (
                    <CodePreview artifact={previewArtifact} />
                  )}
              </>
            ) : (
              <div className="flex items-center justify-center h-full">
                <div className="text-center text-muted-foreground">
                  <p className="text-sm">No artifact selected</p>
                  <p className="text-xs mt-1">
                    Start a conversation to generate variants
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* Refinement Input */}
          <RefinementInput />

          {/* Deployment Panel */}
          <DeploymentPanel artifact={previewArtifact} />
        </div>
      </div>
    </CopilotKit>
  );
}
