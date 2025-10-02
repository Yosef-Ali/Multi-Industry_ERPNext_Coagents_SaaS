/**
 * Claude Agent SDK Hooks - Index
 *
 * Centralized exports for approval workflow hooks:
 * - Approval gates (PreToolUse hooks)
 * - Risk assessment
 * - Stream integration with AG-UI
 *
 * Complete implementation of Claude Agent SDK best practices for approval workflow
 */

// Approval hooks
export {
  ApprovalHook,
  createApprovalHook,
  createApprovalHookMatcher,
  type ApprovalRequest,
  type ApprovalResponse,
  type ApprovalHookContext
} from "./approval.js";

// Risk assessment
export {
  RiskAssessmentHook,
  createRiskClassifier,
  assessToolRisk,
  type RiskLevel,
  type RiskAssessment,
  type FieldSensitivity,
  type DocumentState
} from "./risk_assessment.js";

// Stream integration
export {
  AGUIStreamEmitter,
  ApprovalStreamHandler,
  IntegratedApprovalHandler,
  createSSEWriter,
  createAGUIEmitter,
  createApprovalWorkflow,
  AGUI_EVENT_TYPES,
  type AGUIStreamEvent
} from "./stream_integration.js";

/**
 * Create complete approval workflow with all hooks integrated
 */
import { ApprovalHook, createApprovalHook } from "./approval.js";
import { createRiskClassifier } from "./risk_assessment.js";
import { createAGUIEmitter, IntegratedApprovalHandler } from "./stream_integration.js";
import type { ToolUseBlock } from "@anthropic-ai/sdk/resources/messages.js";

export interface ApprovalWorkflowOptions {
  response: any; // HTTP response for SSE
  correlationId: string;
  sessionId: string;
  auditLogger?: (entry: any) => void;
  customFieldSensitivity?: { [field: string]: import("./risk_assessment.js").FieldSensitivity };
  customRiskThresholds?: any;
}

export class ApprovalWorkflow {
  private approvalHook: ApprovalHook;
  private riskClassifier: ReturnType<typeof createRiskClassifier>;
  private streamHandler: IntegratedApprovalHandler;
  private correlationId: string;
  private sessionId: string;

  constructor(options: ApprovalWorkflowOptions) {
    this.correlationId = options.correlationId;
    this.sessionId = options.sessionId;

    // Create AG-UI stream emitter
    const emitter = createAGUIEmitter(options.response, options.correlationId);

    // Create approval hook with stream integration
    this.approvalHook = createApprovalHook({
      approvalEmitter: (event) => {
        // Forward approval events to AG-UI stream
        emitter.emitApprovalRequest(event.request, event.risk_assessment);
      },
      auditLogger: options.auditLogger || ((entry) => {
        console.log("[APPROVAL AUDIT]", JSON.stringify(entry));
      })
    });

    // Create risk classifier
    this.riskClassifier = createRiskClassifier({
      customFieldSensitivity: options.customFieldSensitivity,
      customThresholds: options.customRiskThresholds
    });

    // Create integrated stream handler
    this.streamHandler = new IntegratedApprovalHandler(emitter);
  }

  /**
   * Process tool use with approval workflow
   *
   * This is the main entry point for Claude Agent SDK PreToolUse hook
   */
  async processToolUse(
    toolUse: ToolUseBlock,
    context?: any
  ): Promise<{ allow: boolean; reason?: string }> {
    // Assess risk
    const riskLevel = this.riskClassifier(
      toolUse.name,
      toolUse.input,
      context
    );

    // Use approval hook
    const result = await this.approvalHook.preToolUse(
      toolUse,
      {
        session_id: this.sessionId,
        correlation_id: this.correlationId,
        ...context
      },
      riskLevel
    );

    return result;
  }

  /**
   * Submit approval response from frontend
   */
  submitApprovalResponse(
    timestamp: number,
    decision: "approved" | "rejected",
    userFeedback?: string
  ): boolean {
    const response = {
      decision,
      user_feedback: userFeedback,
      timestamp: Date.now()
    };

    return this.approvalHook.submitApproval(
      this.correlationId,
      timestamp,
      response
    );
  }

  /**
   * Get pending approvals
   */
  getPendingApprovals() {
    return this.approvalHook.getPendingApprovals(this.correlationId);
  }

  /**
   * Clear all pending approvals (e.g., on session end)
   */
  cleanup() {
    this.approvalHook.clearPendingApprovals(this.correlationId);
  }
}

/**
 * Factory function for complete approval workflow
 */
export function createCompleteApprovalWorkflow(
  options: ApprovalWorkflowOptions
): ApprovalWorkflow {
  return new ApprovalWorkflow(options);
}
