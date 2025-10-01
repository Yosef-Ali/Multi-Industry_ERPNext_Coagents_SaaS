/**
 * T078: AG-UI SSE Event Emitter with Correlation IDs
 * Emit CopilotKit AG-UI frames for real-time UI updates
 */

import { Response } from 'express';

/**
 * AG-UI Frame Types (per CopilotKit spec)
 */
export type AGUIFrameType =
  | 'message' // Assistant chat message
  | 'tool_call' // Tool invocation started
  | 'tool_result' // Tool execution result
  | 'ui_prompt' // Approval/confirmation needed
  | 'ui_response' // User response to ui_prompt
  | 'error' // Error occurred
  | 'status'; // Status update (connected, processing, completed)

export interface AGUIFrame {
  type: AGUIFrameType;
  correlation_id: string;
  timestamp: string;
  data: any;
}

/**
 * Streaming event emitter for AG-UI
 * Wraps Express Response for SSE streaming
 */
export class AGUIStreamEmitter {
  private res: Response;
  private correlationId: string;
  private closed: boolean = false;

  constructor(res: Response, correlationId: string) {
    this.res = res;
    this.correlationId = correlationId;

    // Configure SSE headers
    this.res.setHeader('Content-Type', 'text/event-stream');
    this.res.setHeader('Cache-Control', 'no-cache');
    this.res.setHeader('Connection', 'keep-alive');
    this.res.setHeader('X-Correlation-ID', correlationId);
    this.res.setHeader('Content-Encoding', 'none');

    // Disable response buffering for real-time streaming
    if (typeof (this.res as any).flushHeaders === 'function') {
      (this.res as any).flushHeaders();
    }
  }

  /**
   * Emit AG-UI frame to client
   */
  emit(type: AGUIFrameType, data: any): void {
    if (this.closed) {
      console.warn(`[${this.correlationId}] Attempted to emit to closed stream`);
      return;
    }

    const frame: AGUIFrame = {
      type,
      correlation_id: this.correlationId,
      timestamp: new Date().toISOString(),
      data,
    };

    try {
      this.res.write(`data: ${JSON.stringify(frame)}\n\n`);
      console.log(`[${this.correlationId}] Emitted ${type} frame`);
    } catch (error) {
      console.error(`[${this.correlationId}] Failed to emit frame:`, error);
      this.closed = true;
    }
  }

  /**
   * Emit status update
   */
  emitStatus(status: string, message?: string): void {
    this.emit('status', {
      status,
      message: message || status,
    });
  }

  /**
   * Emit assistant message
   */
  emitMessage(role: 'assistant' | 'user' | 'system', content: string): void {
    this.emit('message', {
      role,
      content,
    });
  }

  /**
   * Emit tool call started
   */
  emitToolCall(toolName: string, input: any, toolCallId?: string): void {
    this.emit('tool_call', {
      tool_name: toolName,
      tool_call_id: toolCallId || `call_${Date.now()}`,
      input,
    });
  }

  /**
   * Emit tool result
   */
  emitToolResult(
    toolName: string,
    result: any,
    success: boolean = true,
    toolCallId?: string
  ): void {
    this.emit('tool_result', {
      tool_name: toolName,
      tool_call_id: toolCallId || `call_${Date.now()}`,
      success,
      result,
    });
  }

  /**
   * Emit approval prompt (HITL)
   */
  emitApprovalPrompt(params: {
    prompt_id: string;
    message: string;
    preview: any;
    options: string[];
    risk_level: 'low' | 'medium' | 'high';
    tool_name?: string;
  }): void {
    this.emit('ui_prompt', {
      prompt_id: params.prompt_id,
      message: params.message,
      preview: params.preview,
      options: params.options,
      risk_level: params.risk_level,
      tool_name: params.tool_name,
    });
  }

  /**
   * Emit user response to approval prompt
   */
  emitApprovalResponse(promptId: string, response: string): void {
    this.emit('ui_response', {
      prompt_id: promptId,
      response,
    });
  }

  /**
   * Emit error
   */
  emitError(errorCode: string, message: string, details?: any): void {
    this.emit('error', {
      error_code: errorCode,
      message,
      details,
    });
  }

  /**
   * Send keep-alive ping
   */
  keepAlive(): void {
    if (!this.closed) {
      try {
        this.res.write(': keep-alive\n\n');
      } catch (error) {
        console.error(`[${this.correlationId}] Keep-alive failed:`, error);
        this.closed = true;
      }
    }
  }

  /**
   * Close stream
   */
  close(): void {
    if (!this.closed) {
      this.emitStatus('completed', 'Stream completed successfully');
      this.res.end();
      this.closed = true;
      console.log(`[${this.correlationId}] Stream closed`);
    }
  }

  /**
   * Check if stream is closed
   */
  isClosed(): boolean {
    return this.closed;
  }
}

/**
 * Create AG-UI stream emitter
 * Helper function for route handlers
 */
export function createAGUIStream(res: Response, correlationId: string): AGUIStreamEmitter {
  return new AGUIStreamEmitter(res, correlationId);
}

/**
 * Keep-alive manager
 * Sends periodic pings to keep SSE connection alive
 */
export class KeepAliveManager {
  private interval: NodeJS.Timeout | null = null;
  private emitter: AGUIStreamEmitter;
  private intervalMs: number;

  constructor(emitter: AGUIStreamEmitter, intervalMs: number = 30000) {
    this.emitter = emitter;
    this.intervalMs = intervalMs;
  }

  /**
   * Start sending keep-alive pings
   */
  start(): void {
    if (this.interval) return;

    this.interval = setInterval(() => {
      if (this.emitter.isClosed()) {
        this.stop();
      } else {
        this.emitter.keepAlive();
      }
    }, this.intervalMs);

    console.log(`Keep-alive started (${this.intervalMs}ms interval)`);
  }

  /**
   * Stop sending keep-alive pings
   */
  stop(): void {
    if (this.interval) {
      clearInterval(this.interval);
      this.interval = null;
      console.log('Keep-alive stopped');
    }
  }
}
