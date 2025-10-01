/**
 * T099: AG-UI Event Parsing Utilities
 * Handles SSE event parsing from the /agui endpoint
 */

// ============================================================================
// TypeScript Interfaces for AG-UI Event Types
// ============================================================================

/**
 * Base interface for all AG-UI events
 */
export interface AGUIEvent {
  type: string;
  timestamp?: string;
  correlation_id?: string;
}

/**
 * Chat message event from agent or user
 */
export interface ChatMessageEvent extends AGUIEvent {
  type: 'chat_message';
  role: 'user' | 'assistant' | 'system';
  content: string;
}

/**
 * Tool call event when agent invokes a tool
 */
export interface ToolCallEvent extends AGUIEvent {
  type: 'tool_call';
  tool_name: string;
  input: Record<string, any>;
}

/**
 * Tool result event after tool execution
 */
export interface ToolResultEvent extends AGUIEvent {
  type: 'tool_result';
  tool_name: string;
  output: any;
  success?: boolean;
  error?: string;
}

/**
 * UI prompt event for user approvals
 */
export interface UIPromptEvent extends AGUIEvent {
  type: 'ui_prompt';
  prompt_type: 'approval' | 'input' | 'confirmation';
  summary: string;
  details?: Record<string, any>;
  risk_level?: 'low' | 'medium' | 'high';
}

/**
 * Status update event
 */
export interface StatusEvent extends AGUIEvent {
  type: 'status';
  status: 'connected' | 'processing' | 'completed' | 'error';
  message: string;
}

/**
 * Error event
 */
export interface ErrorEvent extends AGUIEvent {
  type: 'error';
  error_type: string;
  message: string;
  details?: any;
}

/**
 * Keep-alive ping event
 */
export interface PingEvent extends AGUIEvent {
  type: 'ping';
}

/**
 * Union type of all possible events
 */
export type AGUIEventType =
  | ChatMessageEvent
  | ToolCallEvent
  | ToolResultEvent
  | UIPromptEvent
  | StatusEvent
  | ErrorEvent
  | PingEvent;

// ============================================================================
// SSE Event Parser
// ============================================================================

/**
 * Parses a Server-Sent Events (SSE) frame into an AGUIEvent
 *
 * SSE Format:
 * event: <event_type>
 * data: <json_payload>
 *
 * @param eventType - The SSE event type
 * @param data - The SSE data payload (JSON string)
 * @returns Parsed AGUIEvent or null if malformed
 */
export function parseSSEEvent(eventType: string, data: string): AGUIEventType | null {
  try {
    // Parse the JSON data
    const payload = JSON.parse(data);

    // Validate and construct the appropriate event type
    switch (eventType) {
      case 'chat_message':
        return parseChatMessage(payload);

      case 'tool_call':
        return parseToolCall(payload);

      case 'tool_result':
        return parseToolResult(payload);

      case 'ui_prompt':
        return parseUIPrompt(payload);

      case 'status':
        return parseStatus(payload);

      case 'error':
        return parseError(payload);

      case 'ping':
        return { type: 'ping', timestamp: payload.timestamp };

      default:
        console.warn(`Unknown AG-UI event type: ${eventType}`);
        return null;
    }
  } catch (error) {
    console.error('Failed to parse SSE event:', error, { eventType, data });
    return null;
  }
}

/**
 * Parse chat message event
 */
function parseChatMessage(payload: any): ChatMessageEvent | null {
  if (!payload.role || !payload.content) {
    console.error('Invalid chat_message payload:', payload);
    return null;
  }

  return {
    type: 'chat_message',
    role: payload.role,
    content: payload.content,
    timestamp: payload.timestamp,
    correlation_id: payload.correlation_id,
  };
}

/**
 * Parse tool call event
 */
function parseToolCall(payload: any): ToolCallEvent | null {
  if (!payload.tool_name || !payload.input) {
    console.error('Invalid tool_call payload:', payload);
    return null;
  }

  return {
    type: 'tool_call',
    tool_name: payload.tool_name,
    input: payload.input,
    timestamp: payload.timestamp,
    correlation_id: payload.correlation_id,
  };
}

/**
 * Parse tool result event
 */
function parseToolResult(payload: any): ToolResultEvent | null {
  if (!payload.tool_name) {
    console.error('Invalid tool_result payload:', payload);
    return null;
  }

  return {
    type: 'tool_result',
    tool_name: payload.tool_name,
    output: payload.output,
    success: payload.success,
    error: payload.error,
    timestamp: payload.timestamp,
    correlation_id: payload.correlation_id,
  };
}

/**
 * Parse UI prompt event
 */
function parseUIPrompt(payload: any): UIPromptEvent | null {
  if (!payload.prompt_type || !payload.summary) {
    console.error('Invalid ui_prompt payload:', payload);
    return null;
  }

  return {
    type: 'ui_prompt',
    prompt_type: payload.prompt_type,
    summary: payload.summary,
    details: payload.details,
    risk_level: payload.risk_level,
    timestamp: payload.timestamp,
    correlation_id: payload.correlation_id,
  };
}

/**
 * Parse status event
 */
function parseStatus(payload: any): StatusEvent | null {
  if (!payload.status || !payload.message) {
    console.error('Invalid status payload:', payload);
    return null;
  }

  return {
    type: 'status',
    status: payload.status,
    message: payload.message,
    timestamp: payload.timestamp,
    correlation_id: payload.correlation_id,
  };
}

/**
 * Parse error event
 */
function parseError(payload: any): ErrorEvent | null {
  if (!payload.error_type || !payload.message) {
    console.error('Invalid error payload:', payload);
    return null;
  }

  return {
    type: 'error',
    error_type: payload.error_type,
    message: payload.message,
    details: payload.details,
    timestamp: payload.timestamp,
    correlation_id: payload.correlation_id,
  };
}

// ============================================================================
// SSE Stream Reader
// ============================================================================

/**
 * Event handler callback type
 */
export type EventHandler = (event: AGUIEventType) => void;

/**
 * Creates an SSE stream reader that parses incoming events
 *
 * @param url - The SSE endpoint URL
 * @param options - Fetch options (headers, body, etc.)
 * @param onEvent - Callback for each parsed event
 * @param onError - Callback for connection errors
 * @returns Abort controller to stop the stream
 */
export async function createSSEStream(
  url: string,
  options: RequestInit,
  onEvent: EventHandler,
  onError?: (error: Error) => void
): Promise<AbortController> {
  const controller = new AbortController();

  try {
    const response = await fetch(url, {
      ...options,
      signal: controller.signal,
      headers: {
        ...options.headers,
        'Accept': 'text/event-stream',
      },
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    if (!response.body) {
      throw new Error('Response body is null');
    }

    // Read the stream
    const reader = response.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();

      if (done) {
        break;
      }

      // Decode chunk and add to buffer
      buffer += decoder.decode(value, { stream: true });

      // Process complete events from buffer
      const lines = buffer.split('\n');
      buffer = lines.pop() || ''; // Keep incomplete line in buffer

      let currentEventType = '';
      let currentData = '';

      for (const line of lines) {
        if (line.startsWith('event:')) {
          currentEventType = line.slice(6).trim();
        } else if (line.startsWith('data:')) {
          currentData = line.slice(5).trim();
        } else if (line === '') {
          // Empty line signals end of event
          if (currentEventType && currentData) {
            const event = parseSSEEvent(currentEventType, currentData);
            if (event) {
              onEvent(event);
            }
          }
          currentEventType = '';
          currentData = '';
        }
      }
    }
  } catch (error: any) {
    if (error.name !== 'AbortError') {
      console.error('SSE stream error:', error);
      onError?.(error);
    }
  }

  return controller;
}

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Format timestamp for display
 */
export function formatTimestamp(timestamp?: string): string {
  if (!timestamp) {
    return new Date().toLocaleTimeString();
  }

  try {
    return new Date(timestamp).toLocaleTimeString();
  } catch {
    return timestamp;
  }
}

/**
 * Get display name for event type
 */
export function getEventDisplayName(event: AGUIEventType): string {
  switch (event.type) {
    case 'chat_message':
      return event.role === 'user' ? 'You' : 'Assistant';
    case 'tool_call':
      return `Tool: ${event.tool_name}`;
    case 'tool_result':
      return `Result: ${event.tool_name}`;
    case 'ui_prompt':
      return 'Approval Required';
    case 'status':
      return 'Status';
    case 'error':
      return 'Error';
    case 'ping':
      return 'Ping';
    default:
      return 'Unknown';
  }
}

/**
 * Check if event is a user-facing message
 */
export function isUserMessage(event: AGUIEventType): boolean {
  return event.type === 'chat_message' || event.type === 'status' || event.type === 'error';
}

/**
 * Check if event requires user action
 */
export function requiresUserAction(event: AGUIEventType): boolean {
  return event.type === 'ui_prompt';
}
