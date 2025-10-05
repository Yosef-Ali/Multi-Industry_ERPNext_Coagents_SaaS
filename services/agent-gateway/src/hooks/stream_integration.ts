/**
 * Approval Hook Stream Integration
 *
 * Integrates approval hooks with AG-UI SSE streaming:
 * - Emits approval_request events to frontend
 * - Receives approval_response from frontend
 * - Streams approval status updates
 * - Handles timeout and cancellation
 *
 * Claude Agent SDK + CopilotKit AG-UI integration (T167)
 */

import type { ApprovalRequest, ApprovalResponse } from "./approval.js";
import type { RiskAssessment } from "./risk_assessment.js";

export interface AGUIStreamEvent {
  type: string;
  data: any;
  timestamp?: number;
  correlation_id?: string;
}

/**
 * AG-UI Event types for approval workflow
 */
export const AGUI_EVENT_TYPES = {
  // Approval events
  APPROVAL_REQUEST: "approval_request",
  APPROVAL_RESPONSE: "approval_response",
  APPROVAL_TIMEOUT: "approval_timeout",
  APPROVAL_CANCELLED: "approval_cancelled",

  // Status updates
  APPROVAL_PENDING: "approval_pending",
  APPROVAL_APPROVED: "approval_approved",
  APPROVAL_REJECTED: "approval_rejected",

  // Tool execution
  TOOL_BLOCKED: "tool_blocked",
  TOOL_PROCEEDING: "tool_proceeding"
} as const;

/**
 * AGUIStreamEmitter - Server-Sent Events emitter for approval workflow
 */
export class AGUIStreamEmitter {
  private writeStream: (event: string, data: any) => void;
  private correlationId: string;

  constructor(
    writeStream: (event: string, data: any) => void,
    correlationId: string
  ) {
    this.writeStream = writeStream;
    this.correlationId = correlationId;
  }

  /**
   * Emit approval request to frontend
   */
  emitApprovalRequest(
    request: ApprovalRequest,
    riskAssessment: RiskAssessment
  ): void {
    const event: AGUIStreamEvent = {
      type: AGUI_EVENT_TYPES.APPROVAL_REQUEST,
      correlation_id: this.correlationId,
      timestamp: Date.now(),
      data: {
        request_id: `${this.correlationId}_${request.timestamp}`,
        tool_name: request.tool_name,
        tool_input: request.tool_input,
        risk_level: request.risk_level,
        risk_score: riskAssessment.score,
        operation_preview: request.operation_preview,
        reasoning: request.reasoning,
        risk_factors: riskAssessment.factors,
        timeout_ms: 300000 // 5 minutes
      }
    };

    this.write(AGUI_EVENT_TYPES.APPROVAL_REQUEST, event.data);

    // Also emit pending status
    this.emitApprovalPending(request.tool_name);
  }

  /**
   * Emit approval pending status
   */
  emitApprovalPending(toolName: string): void {
    this.write(AGUI_EVENT_TYPES.APPROVAL_PENDING, {
      tool_name: toolName,
      message: "Waiting for user approval...",
      correlation_id: this.correlationId
    });
  }

  /**
   * Emit approval approved status
   */
  emitApprovalApproved(
    toolName: string,
    userFeedback?: string
  ): void {
    this.write(AGUI_EVENT_TYPES.APPROVAL_APPROVED, {
      tool_name: toolName,
      user_feedback: userFeedback,
      message: "Operation approved by user",
      correlation_id: this.correlationId
    });

    this.emitToolProceeding(toolName);
  }

  /**
   * Emit approval rejected status
   */
  emitApprovalRejected(
    toolName: string,
    userFeedback?: string
  ): void {
    this.write(AGUI_EVENT_TYPES.APPROVAL_REJECTED, {
      tool_name: toolName,
      user_feedback: userFeedback,
      message: "Operation rejected by user",
      correlation_id: this.correlationId
    });

    this.emitToolBlocked(toolName, userFeedback || "User rejected");
  }

  /**
   * Emit approval timeout
   */
  emitApprovalTimeout(toolName: string): void {
    this.write(AGUI_EVENT_TYPES.APPROVAL_TIMEOUT, {
      tool_name: toolName,
      message: "Approval request timed out after 5 minutes",
      correlation_id: this.correlationId
    });

    this.emitToolBlocked(toolName, "Approval timeout");
  }

  /**
   * Emit approval cancelled
   */
  emitApprovalCancelled(toolName: string, reason: string): void {
    this.write(AGUI_EVENT_TYPES.APPROVAL_CANCELLED, {
      tool_name: toolName,
      reason,
      message: "Approval request cancelled",
      correlation_id: this.correlationId
    });

    this.emitToolBlocked(toolName, reason);
  }

  /**
   * Emit tool blocked status
   */
  private emitToolBlocked(toolName: string, reason: string): void {
    this.write(AGUI_EVENT_TYPES.TOOL_BLOCKED, {
      tool_name: toolName,
      reason,
      message: `Tool execution blocked: ${reason}`,
      correlation_id: this.correlationId
    });
  }

  /**
   * Emit tool proceeding status
   */
  private emitToolProceeding(toolName: string): void {
    this.write(AGUI_EVENT_TYPES.TOOL_PROCEEDING, {
      tool_name: toolName,
      message: "Tool execution proceeding after approval",
      correlation_id: this.correlationId
    });
  }

  /**
   * Write SSE event to stream
   */
  private write(eventType: string, data: any): void {
    this.writeStream(eventType, data);
  }
}

/**
 * ApprovalStreamHandler - Handles approval workflow streaming
 */
export class ApprovalStreamHandler {
  private emitter: AGUIStreamEmitter;
  private pendingApprovals: Map<string, {
    request: ApprovalRequest;
    riskAssessment: RiskAssessment;
  }> = new Map();

  constructor(emitter: AGUIStreamEmitter) {
    this.emitter = emitter;
  }

  /**
   * Request approval via stream
   */
  async requestApproval(
    request: ApprovalRequest,
    riskAssessment: RiskAssessment
  ): Promise<ApprovalResponse> {
    const requestId = `${request.correlation_id}_${request.timestamp}`;

    // Store pending approval
    this.pendingApprovals.set(requestId, { request, riskAssessment });

    // Emit approval request event
    this.emitter.emitApprovalRequest(request, riskAssessment);

    // This would be resolved by submitApprovalResponse()
    // In actual implementation, this would integrate with the approval hook
    return new Promise((resolve, reject) => {
      // The approval hook will call submitApprovalResponse which resolves this
      // This is a placeholder - actual implementation would wire this up
    });
  }

  /**
   * Submit approval response (called from HTTP endpoint)
   */
  submitApprovalResponse(
    correlationId: string,
    timestamp: number,
    response: ApprovalResponse
  ): boolean {
    const requestId = `${correlationId}_${timestamp}`;
    const pending = this.pendingApprovals.get(requestId);

    if (!pending) {
      console.warn(`No pending approval found for ${requestId}`);
      return false;
    }

    // Emit approval status
    if (response.decision === "approved") {
      this.emitter.emitApprovalApproved(
        pending.request.tool_name,
        response.user_feedback
      );
    } else {
      this.emitter.emitApprovalRejected(
        pending.request.tool_name,
        response.user_feedback
      );
    }

    // Clean up
    this.pendingApprovals.delete(requestId);

    return true;
  }

  /**
   * Handle approval timeout
   */
  handleTimeout(correlationId: string, timestamp: number): void {
    const requestId = `${correlationId}_${timestamp}`;
    const pending = this.pendingApprovals.get(requestId);

    if (pending) {
      this.emitter.emitApprovalTimeout(pending.request.tool_name);
      this.pendingApprovals.delete(requestId);
    }
  }

  /**
   * Cancel approval (e.g., session ended)
   */
  cancelApproval(correlationId: string, timestamp: number, reason: string): void {
    const requestId = `${correlationId}_${timestamp}`;
    const pending = this.pendingApprovals.get(requestId);

    if (pending) {
      this.emitter.emitApprovalCancelled(pending.request.tool_name, reason);
      this.pendingApprovals.delete(requestId);
    }
  }

  /**
   * Get pending approvals
   */
  getPendingApprovals(correlationId?: string): ApprovalRequest[] {
    const pending: ApprovalRequest[] = [];

    for (const [requestId, data] of this.pendingApprovals.entries()) {
      if (!correlationId || requestId.startsWith(correlationId)) {
        pending.push(data.request);
      }
    }

    return pending;
  }
}

/**
 * Create SSE write stream function
 */
export function createSSEWriter(response: any): (event: string, data: any) => void {
  return (event: string, data: any) => {
    // SSE format: event: <event_type>\ndata: <json>\n\n
    response.write(`event: ${event}\n`);
    response.write(`data: ${JSON.stringify(data)}\n\n`);
  };
}

/**
 * Create AGUIStreamEmitter from HTTP response
 */
export function createAGUIEmitter(
  response: any,
  correlationId: string
): AGUIStreamEmitter {
  const writeStream = createSSEWriter(response);
  return new AGUIStreamEmitter(writeStream, correlationId);
}

/**
 * Integrated approval workflow handler
 *
 * Combines approval hook + risk assessment + stream emitter
 */
export class IntegratedApprovalHandler {
  private streamHandler: ApprovalStreamHandler;

  constructor(emitter: AGUIStreamEmitter) {
    this.streamHandler = new ApprovalStreamHandler(emitter);
  }

  /**
   * Process approval request with full integration
   */
  async processApprovalRequest(
    request: ApprovalRequest,
    riskAssessment: RiskAssessment,
    onApproval: (response: ApprovalResponse) => void
  ): Promise<void> {
    // Emit approval request via stream
    await this.streamHandler.requestApproval(request, riskAssessment);

    // Wait for response (this would be wired up with approval hook)
    // onApproval callback will be called when response arrives
  }

  /**
   * Submit approval from frontend
   */
  submitApproval(
    correlationId: string,
    timestamp: number,
    response: ApprovalResponse
  ): boolean {
    return this.streamHandler.submitApprovalResponse(
      correlationId,
      timestamp,
      response
    );
  }

  /**
   * Get stream handler for direct access
   */
  getStreamHandler(): ApprovalStreamHandler {
    return this.streamHandler;
  }
}

/**
 * Example: Complete approval workflow with streaming
 */
export function createApprovalWorkflow(
  response: any,
  correlationId: string
): IntegratedApprovalHandler {
  const emitter = createAGUIEmitter(response, correlationId);
  return new IntegratedApprovalHandler(emitter);
}
