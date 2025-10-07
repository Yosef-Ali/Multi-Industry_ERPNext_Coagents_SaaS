'use client';

import { useState, useEffect } from 'react';
import { ChevronDownIcon, CheckCircleFillIcon, CopyIcon } from './icons';
import { cn } from '@/lib/utils';
import { getToolRiskLevel, getToolDefinition, type ToolDefinition } from '@/lib/tools/registry';

export type ToolCallData = {
  id: string;
  name: string;
  input?: any;
  output?: any;
  error?: string;
  status?: 'pending' | 'success' | 'error';
  toolDefinition?: ToolDefinition;
};

export function ToolCallCard({ toolCall }: { toolCall: ToolCallData }) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [copiedSection, setCopiedSection] = useState<'input' | 'output' | null>(null);
  const [fetchedDefinition, setFetchedDefinition] = useState<ToolDefinition | null>(null);

  // Fetch tool definition if not provided
  useEffect(() => {
    if (!toolCall.toolDefinition && toolCall.name) {
      getToolDefinition(toolCall.name).then(def => {
        if (def) {
          setFetchedDefinition(def);
        }
      });
    }
  }, [toolCall.name, toolCall.toolDefinition]);

  // Use provided definition or fetched definition
  const activeDefinition = toolCall.toolDefinition || fetchedDefinition;

  const handleCopy = async (text: string, section: 'input' | 'output') => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSection(section);
      setTimeout(() => setCopiedSection(null), 2000);
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const riskLevel = activeDefinition
    ? getToolRiskLevel(activeDefinition)
    : 'medium';

  const statusColor = toolCall.error
    ? 'border-red-200 bg-red-50 dark:border-red-800/30 dark:bg-red-900/10'
    : toolCall.status === 'success'
    ? 'border-green-200 bg-green-50 dark:border-green-800/30 dark:bg-green-900/10'
    : 'border-gray-200 bg-gray-50 dark:border-gray-800 dark:bg-gray-900/20';

  const riskColor =
    riskLevel === 'high'
      ? 'bg-red-100 text-red-800 dark:bg-red-900/20 dark:text-red-400'
      : riskLevel === 'medium'
      ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/20 dark:text-yellow-400'
      : 'bg-green-100 text-green-800 dark:bg-green-900/20 dark:text-green-400';

  return (
    <div className={cn('rounded-lg border p-3 mb-2', statusColor)}>
      {/* Header */}
      <button
        onClick={() => setIsExpanded(!isExpanded)}
        className="flex w-full items-center justify-between text-left"
        type="button"
      >
        <div className="flex items-center gap-2 flex-1">
          {/* Status icon */}
          {toolCall.error ? (
            <span className="text-red-600 dark:text-red-400">✕</span>
          ) : toolCall.status === 'success' ? (
            <CheckCircleFillIcon className="text-green-600 dark:text-green-400" />
          ) : (
            <span className="text-gray-400">⋯</span>
          )}

          {/* Tool name */}
          <span className="font-mono text-sm font-medium">{toolCall.name}</span>

          {/* Risk badge */}
          {activeDefinition && (
            <span
              className={cn(
                'inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium',
                riskColor
              )}
            >
              {riskLevel}
            </span>
          )}

          {/* Operation type */}
          {activeDefinition && (
            <span className="text-xs text-muted-foreground">
              {activeDefinition.operationType}
            </span>
          )}
        </div>

        {/* Expand icon */}
        <ChevronDownIcon
          className={cn(
            'h-4 w-4 text-muted-foreground transition-transform',
            isExpanded && 'rotate-180'
          )}
        />
      </button>

      {/* Description */}
      {activeDefinition?.description && !isExpanded && (
        <p className="mt-1 text-xs text-muted-foreground line-clamp-1 ml-6">
          {activeDefinition.description}
        </p>
      )}

      {/* Expanded content */}
      {isExpanded && (
        <div className="mt-3 space-y-3">
          {/* Description */}
          {activeDefinition?.description && (
            <p className="text-xs text-muted-foreground">
              {activeDefinition.description}
            </p>
          )}

          {/* Input */}
          {toolCall.input && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground">Input</span>
                <button
                  onClick={() =>
                    handleCopy(JSON.stringify(toolCall.input, null, 2), 'input')
                  }
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  type="button"
                >
                  {copiedSection === 'input' ? (
                    <>
                      <CheckCircleFillIcon className="h-3 w-3" /> Copied
                    </>
                  ) : (
                    <>
                      <CopyIcon className="h-3 w-3" /> Copy
                    </>
                  )}
                </button>
              </div>
              <pre className="text-xs bg-muted/50 rounded p-2 overflow-x-auto">
                <code>{JSON.stringify(toolCall.input, null, 2)}</code>
              </pre>
            </div>
          )}

          {/* Output */}
          {toolCall.output && !toolCall.error && (
            <div>
              <div className="flex items-center justify-between mb-1">
                <span className="text-xs font-medium text-muted-foreground">Output</span>
                <button
                  onClick={() =>
                    handleCopy(JSON.stringify(toolCall.output, null, 2), 'output')
                  }
                  className="text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
                  type="button"
                >
                  {copiedSection === 'output' ? (
                    <>
                      <CheckCircleFillIcon className="h-3 w-3" /> Copied
                    </>
                  ) : (
                    <>
                      <CopyIcon className="h-3 w-3" /> Copy
                    </>
                  )}
                </button>
              </div>
              <pre className="text-xs bg-muted/50 rounded p-2 overflow-x-auto">
                <code>{JSON.stringify(toolCall.output, null, 2)}</code>
              </pre>
            </div>
          )}

          {/* Error */}
          {toolCall.error && (
            <div>
              <span className="text-xs font-medium text-red-600 dark:text-red-400">
                Error
              </span>
              <pre className="text-xs bg-red-50 dark:bg-red-900/20 rounded p-2 overflow-x-auto mt-1 text-red-800 dark:text-red-400">
                <code>{toolCall.error}</code>
              </pre>
            </div>
          )}

          {/* Industry tag */}
          {activeDefinition?.industry && (
            <div className="text-xs text-muted-foreground">
              Industry: <span className="font-medium">{activeDefinition.industry}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
