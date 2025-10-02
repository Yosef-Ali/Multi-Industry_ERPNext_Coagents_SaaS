/**
 * Approval Gates using Claude Agent SDK PreToolUse Hooks
 *
 * Implements approval workflow using HookMatcher pattern from Claude Agent SDK:
 * - Intercepts high-risk tool calls before execution
 * - Emits approval prompts via AG-UI streaming
 * - Waits for user approval/rejection
 * - Blocks execution on rejection
 * - Logs approval decisions for audit
 *
 * Migration from T079 approval gates to Claude Agent SDK hooks (T165)
 */

import type { ToolUseBlock } from "@anthropic-ai/sdk/resources/messages.js";
import type { RiskLevel } from "./risk_assessment.js";

export interface ApprovalRequest {
  tool_name: string;
  tool_input: any;
  risk_level: RiskLevel;
  operation_preview: string;
  reasoning: string;
  correlation_id: string;
  timestamp: number;
}

export interface ApprovalResponse {
  decision: "approved" | "rejected";
  user_feedback?: string;
  timestamp: number;
}

export interface ApprovalHookContext {
  session_id: string;
  user_id?: string;
  current_doctype?: string;
  current_doc?: string;
  correlation_id: string;
}

/**
 * PreToolUse hook matcher for approval gates
 *
 * This implements the Claude Agent SDK hook pattern:
 * - Matches tools based on risk classification
 * - Returns approval decision before tool execution
 * - Integrates with AG-UI streaming for real-time prompts
 */
export class ApprovalHook {
  private pendingApprovals: Map<string, {
    request: ApprovalRequest;
    resolve: (response: ApprovalResponse) => void;
    reject: (error: Error) => void;
  }> = new Map();

  private approvalEmitter?: (event: any) => void;
  private auditLogger?: (entry: any) => void;

  constructor(options?: {
    approvalEmitter?: (event: any) => void;
    auditLogger?: (entry: any) => void;
  }) {
    this.approvalEmitter = options?.approvalEmitter;
    this.auditLogger = options?.auditLogger;
  }

  /**
   * PreToolUse hook - called before tool execution
   *
   * Claude Agent SDK hook signature:
   * async preToolUse(toolUse: ToolUseBlock, context: any): Promise<{ allow: boolean, reason?: string }>
   */
  async preToolUse(
    toolUse: ToolUseBlock,
    context: ApprovalHookContext,
    riskLevel: RiskLevel
  ): Promise<{ allow: boolean; reason?: string; approval?: ApprovalResponse }> {
    // Low risk tools - auto-approve
    if (riskLevel === "low") {
      this.logApproval({
        tool_name: toolUse.name,
        decision: "approved",
        risk_level: "low",
        auto_approved: true,
        context
      });

      return { allow: true, reason: "Low risk operation - auto-approved" };
    }

    // High/Medium risk - request approval
    const approvalRequest: ApprovalRequest = {
      tool_name: toolUse.name,
      tool_input: toolUse.input,
      risk_level: riskLevel,
      operation_preview: this.generateOperationPreview(toolUse),
      reasoning: this.generateRiskReasoning(toolUse, riskLevel),
      correlation_id: context.correlation_id,
      timestamp: Date.now()
    };

    // Emit approval request via AG-UI streaming
    if (this.approvalEmitter) {
      this.approvalEmitter({
        type: "approval_request",
        request: approvalRequest,
        context: {
          session_id: context.session_id,
          correlation_id: context.correlation_id
        }
      });
    }

    try {
      // Wait for approval decision
      const approval = await this.waitForApproval(approvalRequest, context);

      // Log approval decision
      this.logApproval({
        tool_name: toolUse.name,
        decision: approval.decision,
        risk_level: riskLevel,
        user_feedback: approval.user_feedback,
        context
      });

      if (approval.decision === "approved") {
        return {
          allow: true,
          reason: "User approved",
          approval
        };
      } else {
        return {
          allow: false,
          reason: approval.user_feedback || "User rejected operation",
          approval
        };
      }

    } catch (error) {
      // Timeout or error - default to rejection for safety
      this.logApproval({
        tool_name: toolUse.name,
        decision: "rejected",
        risk_level: riskLevel,
        error: String(error),
        context
      });

      return {
        allow: false,
        reason: `Approval timeout or error: ${String(error)}`
      };
    }
  }

  /**
   * Wait for user approval response
   */
  private waitForApproval(
    request: ApprovalRequest,
    context: ApprovalHookContext,
    timeoutMs: number = 300000 // 5 minutes default timeout
  ): Promise<ApprovalResponse> {
    return new Promise((resolve, reject) => {
      const approvalId = `${context.correlation_id}_${request.timestamp}`;

      // Store pending approval
      this.pendingApprovals.set(approvalId, {
        request,
        resolve,
        reject
      });

      // Set timeout
      const timeout = setTimeout(() => {
        this.pendingApprovals.delete(approvalId);
        reject(new Error("Approval request timed out after 5 minutes"));
      }, timeoutMs);

      // Cleanup on resolution
      const originalResolve = resolve;
      const wrappedResolve = (response: ApprovalResponse) => {
        clearTimeout(timeout);
        this.pendingApprovals.delete(approvalId);
        originalResolve(response);
      };

      this.pendingApprovals.set(approvalId, {
        request,
        resolve: wrappedResolve,
        reject
      });
    });
  }

  /**
   * Submit approval response from user
   */
  submitApproval(
    correlationId: string,
    timestamp: number,
    response: ApprovalResponse
  ): boolean {
    const approvalId = `${correlationId}_${timestamp}`;
    const pending = this.pendingApprovals.get(approvalId);

    if (!pending) {
      console.warn(`No pending approval found for ${approvalId}`);
      return false;
    }

    pending.resolve(response);
    return true;
  }

  /**
   * Generate human-readable operation preview
   */
  private generateOperationPreview(toolUse: ToolUseBlock): string {
    const input = toolUse.input as any;

    switch (toolUse.name) {
      case "create_doc":
        return `Create ${input.doctype}: ${JSON.stringify(input.data, null, 2)}`;

      case "update_doc":
        return `Update ${input.doctype} ${input.name}: ${JSON.stringify(input.updates, null, 2)}`;

      case "submit_doc":
        return `Submit ${input.doctype} ${input.name} (changes document state to Submitted)`;

      case "cancel_doc":
        return `Cancel ${input.doctype} ${input.name} (reverses submitted document)`;

      case "create_reservation":
        return `Create Reservation:\n` +
          `- Guest: ${input.guest_name}\n` +
          `- Room: ${input.room_number}\n` +
          `- Check-in: ${input.check_in_date}\n` +
          `- Check-out: ${input.check_out_date}`;

      case "create_order_set":
        return `Create Clinical Order Set:\n` +
          `- Protocol: ${input.protocol_name}\n` +
          `- Patient: ${input.patient_id}\n` +
          `- Orders: ${JSON.stringify(input.modifications || "Standard protocol")}`;

      case "execute_workflow_graph":
        return `Execute Workflow: ${input.graph_name}\n` +
          `Initial State: ${JSON.stringify(input.initial_state, null, 2)}`;

      case "schedule_interview":
        return `Schedule Interview:\n` +
          `- Applicant: ${input.applicant_id}\n` +
          `- Date: ${input.interview_date} ${input.interview_time}\n` +
          `- Panel: ${input.panel_members?.join(", ") || "TBD"}`;

      default:
        return `${toolUse.name}\n${JSON.stringify(input, null, 2)}`;
    }
  }

  /**
   * Generate risk reasoning explanation
   */
  private generateRiskReasoning(toolUse: ToolUseBlock, riskLevel: RiskLevel): string {
    const input = toolUse.input as any;

    const baseReasons: { [key in RiskLevel]: string } = {
      low: "Read-only operation with no data modification",
      medium: "Data modification with reversible changes",
      high: "Critical operation affecting business workflow or submitted documents"
    };

    let specificReason = "";

    if (toolUse.name === "submit_doc") {
      specificReason = "Submitting a document locks it and triggers workflow state changes";
    } else if (toolUse.name === "cancel_doc") {
      specificReason = "Cancelling reverses a submitted document and may affect dependent transactions";
    } else if (toolUse.name === "create_order_set") {
      specificReason = "Clinical orders directly affect patient care and safety";
    } else if (toolUse.name === "execute_workflow_graph") {
      specificReason = "Workflow execution may create multiple documents and trigger business processes";
    } else if (toolUse.name === "bulk_update") {
      const count = Array.isArray(input.updates) ? input.updates.length : 0;
      specificReason = `Bulk operation affecting ${count} documents`;
    }

    return `${baseReasons[riskLevel]}. ${specificReason}`;
  }

  /**
   * Log approval decision for audit trail
   */
  private logApproval(entry: {
    tool_name: string;
    decision: "approved" | "rejected";
    risk_level: RiskLevel;
    auto_approved?: boolean;
    user_feedback?: string;
    error?: string;
    context: ApprovalHookContext;
  }): void {
    const auditEntry = {
      event_type: "approval_decision",
      timestamp: new Date().toISOString(),
      session_id: entry.context.session_id,
      correlation_id: entry.context.correlation_id,
      tool_name: entry.tool_name,
      decision: entry.decision,
      risk_level: entry.risk_level,
      auto_approved: entry.auto_approved || false,
      user_feedback: entry.user_feedback,
      error: entry.error,
      current_doctype: entry.context.current_doctype,
      current_doc: entry.context.current_doc
    };

    if (this.auditLogger) {
      this.auditLogger(auditEntry);
    } else {
      console.log("[APPROVAL]", JSON.stringify(auditEntry));
    }
  }

  /**
   * Get pending approvals for a session
   */
  getPendingApprovals(correlationId?: string): ApprovalRequest[] {
    const pending: ApprovalRequest[] = [];

    for (const [approvalId, data] of this.pendingApprovals.entries()) {
      if (!correlationId || approvalId.startsWith(correlationId)) {
        pending.push(data.request);
      }
    }

    return pending;
  }

  /**
   * Clear all pending approvals (e.g., on session end)
   */
  clearPendingApprovals(correlationId?: string): void {
    if (correlationId) {
      for (const approvalId of Array.from(this.pendingApprovals.keys())) {
        if (approvalId.startsWith(correlationId)) {
          const pending = this.pendingApprovals.get(approvalId);
          pending?.reject(new Error("Session ended"));
          this.pendingApprovals.delete(approvalId);
        }
      }
    } else {
      for (const pending of this.pendingApprovals.values()) {
        pending.reject(new Error("All approvals cleared"));
      }
      this.pendingApprovals.clear();
    }
  }
}

/**
 * HookMatcher function for Claude Agent SDK
 *
 * Determines if a tool requires approval based on risk level
 */
export function createApprovalHookMatcher(
  riskClassifier: (toolName: string, toolInput: any, context: any) => RiskLevel
) {
  return (toolUse: ToolUseBlock, context: any): boolean => {
    const riskLevel = riskClassifier(toolUse.name, toolUse.input, context);
    return riskLevel === "medium" || riskLevel === "high";
  };
}

/**
 * Factory function to create approval hook with dependencies
 */
export function createApprovalHook(options: {
  approvalEmitter: (event: any) => void;
  auditLogger: (entry: any) => void;
}): ApprovalHook {
  return new ApprovalHook(options);
}
