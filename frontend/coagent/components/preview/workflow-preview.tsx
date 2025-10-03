'use client';

import { useEffect, useRef } from 'react';
import type { WorkflowArtifact } from '@/lib/types/artifact';

interface WorkflowPreviewProps {
  artifact: WorkflowArtifact;
}

export function WorkflowPreview({ artifact }: WorkflowPreviewProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!containerRef.current || !artifact.diagramCode) return;

    // Dynamically import mermaid
    import('mermaid').then((mermaid) => {
      mermaid.default.initialize({
        startOnLoad: true,
        theme: 'default',
        flowchart: {
          useMaxWidth: true,
          htmlLabels: true,
          curve: 'basis',
        },
      });

      // Render the diagram
      const id = `mermaid-${artifact.id}`;
      mermaid.default.render(id, artifact.diagramCode || '').then(({ svg }) => {
        if (containerRef.current) {
          containerRef.current.innerHTML = svg;
        }
      });
    });
  }, [artifact.diagramCode, artifact.id]);

  return (
    <div className="p-6 space-y-6">
      {/* Header */}
      <div className="border-b pb-4">
        <h2 className="text-2xl font-bold">{artifact.metadata.workflow_name}</h2>
        <p className="text-sm text-muted-foreground mt-1">
          Document Type: {artifact.metadata.document_type}
        </p>
      </div>

      {/* Workflow Diagram */}
      <div className="border rounded-lg p-4 bg-white">
        <div ref={containerRef} className="mermaid-container" />
      </div>

      {/* States */}
      <div className="space-y-2">
        <h3 className="font-semibold text-sm">States</h3>
        <div className="grid grid-cols-2 gap-2">
          {artifact.metadata.states.map((state, idx) => (
            <div
              key={idx}
              className="border rounded px-3 py-2 text-sm flex items-center justify-between"
            >
              <span className="font-medium">{state.state}</span>
              <span className="text-xs text-muted-foreground">
                {state.doc_status === '0'
                  ? 'Draft'
                  : state.doc_status === '1'
                  ? 'Submitted'
                  : 'Cancelled'}
              </span>
            </div>
          ))}
        </div>
      </div>

      {/* Transitions */}
      <div className="space-y-2">
        <h3 className="font-semibold text-sm">Transitions</h3>
        <div className="space-y-2">
          {artifact.metadata.transitions.map((transition, idx) => (
            <div
              key={idx}
              className="border rounded px-3 py-2 text-sm"
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <span className="font-medium">{transition.state}</span>
                  <span className="text-gray-400">→</span>
                  <span className="font-medium">{transition.next_state}</span>
                </div>
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded">
                  {transition.action}
                </span>
              </div>
              <div className="text-xs text-muted-foreground mt-1">
                Allowed: {transition.allowed}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
