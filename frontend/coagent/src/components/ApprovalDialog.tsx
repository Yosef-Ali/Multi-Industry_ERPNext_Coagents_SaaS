/**
 * T098: ApprovalDialog Component
 * Handles approval prompts for high-risk operations using CopilotKit's renderAndWaitForResponse
 */

import React, { useState } from 'react';
import { useCopilotAction } from '@copilotkit/react-core';

// ============================================================================
// Types
// ============================================================================

/**
 * Approval prompt data
 */
export interface ApprovalPrompt {
  prompt_id: string;
  summary: string;
  action_type?: string;
  details?: Record<string, any>;
  risk_level?: 'low' | 'medium' | 'high';
  doctype?: string;
  doc_data?: Record<string, any>;
}

/**
 * Approval response
 */
export type ApprovalResponse = 'approve' | 'cancel';

/**
 * Props for ApprovalDialog component
 */
export interface ApprovalDialogProps {
  prompt: ApprovalPrompt;
  onResponse: (response: ApprovalResponse) => void;
  isLoading?: boolean;
}

// ============================================================================
// Risk Level Styling
// ============================================================================

const RISK_COLORS = {
  low: {
    bg: 'bg-green-50',
    border: 'border-green-300',
    badge: 'bg-green-100 text-green-800',
    icon: '✓',
  },
  medium: {
    bg: 'bg-yellow-50',
    border: 'border-yellow-300',
    badge: 'bg-yellow-100 text-yellow-800',
    icon: '⚠',
  },
  high: {
    bg: 'bg-red-50',
    border: 'border-red-300',
    badge: 'bg-red-100 text-red-800',
    icon: '⚠',
  },
};

// ============================================================================
// ApprovalDialog Component
// ============================================================================

/**
 * ApprovalDialog component displays approval prompts with action preview
 * and risk level indicator
 */
export const ApprovalDialog: React.FC<ApprovalDialogProps> = ({
  prompt,
  onResponse,
  isLoading = false,
}) => {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const riskLevel = prompt.risk_level || 'medium';
  const riskStyle = RISK_COLORS[riskLevel];

  /**
   * Handle approval button click
   */
  const handleApprove = async () => {
    setIsSubmitting(true);
    try {
      await onResponse('approve');
    } finally {
      setIsSubmitting(false);
    }
  };

  /**
   * Handle cancel button click
   */
  const handleCancel = async () => {
    setIsSubmitting(true);
    try {
      await onResponse('cancel');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
      <div
        className={`w-full max-w-2xl rounded-lg border-2 bg-white shadow-xl ${riskStyle.border}`}
      >
        {/* Header */}
        <div className={`rounded-t-lg border-b p-4 ${riskStyle.bg}`}>
          <div className="flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Approval Required</h3>
            <span
              className={`flex items-center gap-1 rounded-full px-3 py-1 text-sm font-medium ${riskStyle.badge}`}
            >
              <span>{riskStyle.icon}</span>
              <span className="capitalize">{riskLevel} Risk</span>
            </span>
          </div>
        </div>

        {/* Content */}
        <div className="p-6">
          {/* Summary */}
          <div className="mb-6">
            <h4 className="mb-2 text-base font-medium text-gray-900">Action Summary</h4>
            <p className="text-gray-700">{prompt.summary}</p>
          </div>

          {/* Action Type */}
          {prompt.action_type && (
            <div className="mb-4">
              <span className="inline-block rounded bg-gray-100 px-3 py-1 text-sm font-medium text-gray-700">
                {prompt.action_type}
              </span>
            </div>
          )}

          {/* Document Preview */}
          {prompt.doctype && (
            <div className="mb-6">
              <h4 className="mb-2 text-sm font-medium text-gray-700">Document</h4>
              <div className="rounded border border-gray-200 bg-gray-50 p-3">
                <p className="text-sm font-medium text-gray-900">{prompt.doctype}</p>
                {prompt.doc_data && (
                  <div className="mt-2 max-h-48 overflow-y-auto">
                    <pre className="whitespace-pre-wrap text-xs text-gray-600">
                      {JSON.stringify(prompt.doc_data, null, 2)}
                    </pre>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Additional Details */}
          {prompt.details && Object.keys(prompt.details).length > 0 && (
            <div className="mb-6">
              <h4 className="mb-2 text-sm font-medium text-gray-700">Details</h4>
              <div className="space-y-2">
                {Object.entries(prompt.details).map(([key, value]) => (
                  <div key={key} className="flex items-start gap-2">
                    <span className="text-sm font-medium text-gray-600 capitalize">
                      {key.replace(/_/g, ' ')}:
                    </span>
                    <span className="text-sm text-gray-800">
                      {typeof value === 'object' ? JSON.stringify(value) : String(value)}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Loading State */}
          {isLoading && (
            <div className="mb-4 rounded border border-blue-200 bg-blue-50 p-3">
              <p className="text-sm text-blue-700">Processing your request...</p>
            </div>
          )}
        </div>

        {/* Actions */}
        <div className="flex justify-end gap-3 border-t bg-gray-50 px-6 py-4">
          <button
            onClick={handleCancel}
            disabled={isSubmitting || isLoading}
            className="btn-secondary disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isSubmitting ? 'Canceling...' : 'Cancel'}
          </button>
          <button
            onClick={handleApprove}
            disabled={isSubmitting || isLoading}
            className={`${
              riskLevel === 'high' ? 'btn-danger' : 'btn-success'
            } disabled:opacity-50 disabled:cursor-not-allowed`}
          >
            {isSubmitting ? 'Approving...' : 'Approve'}
          </button>
        </div>
      </div>
    </div>
  );
};

// ============================================================================
// useApprovalAction Hook
// ============================================================================

/**
 * Hook to register approval action with CopilotKit
 * Uses renderAndWaitForResponse for LangGraph interrupt() integration
 */
export function useApprovalAction() {
  useCopilotAction({
    name: 'approval_gate',
    description: 'Request user approval for high-risk operations (LangGraph interrupt)',
    parameters: [
      {
        name: 'prompt_id',
        type: 'string',
        description: 'Unique ID for this approval prompt',
        required: true,
      },
      {
        name: 'summary',
        type: 'string',
        description: 'Summary of the action requiring approval',
        required: true,
      },
      {
        name: 'action_type',
        type: 'string',
        description: 'Type of action (e.g., create, update, delete)',
        required: false,
      },
      {
        name: 'details',
        type: 'object',
        description: 'Additional details about the action',
        required: false,
      },
      {
        name: 'risk_level',
        type: 'string',
        description: 'Risk level: low, medium, or high',
        required: false,
      },
      {
        name: 'doctype',
        type: 'string',
        description: 'ERPNext DocType being affected',
        required: false,
      },
      {
        name: 'doc_data',
        type: 'object',
        description: 'Document data preview',
        required: false,
      },
    ],
    renderAndWaitForResponse: ({ args, status, respond }) => {
      const prompt: ApprovalPrompt = {
        prompt_id: args.prompt_id,
        summary: args.summary,
        action_type: args.action_type,
        details: args.details,
        risk_level: (args.risk_level as 'low' | 'medium' | 'high') || 'medium',
        doctype: args.doctype,
        doc_data: args.doc_data,
      };

      const isExecuting = status === 'executing';

      return (
        <ApprovalDialog
          prompt={prompt}
          onResponse={(response) => {
            respond?.({
              approved: response === 'approve',
              response,
              timestamp: new Date().toISOString(),
            });
          }}
          isLoading={isExecuting}
        />
      );
    },
  });
}

// ============================================================================
// ApprovalDialogContainer Component
// ============================================================================

/**
 * Container component that registers approval action with CopilotKit
 * Use this in your main App component to enable approval gates
 * The actual dialog is rendered via renderAndWaitForResponse
 */
export const ApprovalDialogContainer: React.FC = () => {
  useApprovalAction();
  return null; // Dialog is rendered via renderAndWaitForResponse
};

export default ApprovalDialog;
