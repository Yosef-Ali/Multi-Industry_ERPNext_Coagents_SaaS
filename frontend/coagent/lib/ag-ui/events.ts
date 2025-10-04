/**
 * AG-UI Event Handlers
 * Utilities for processing AG-UI protocol events
 */

import { EventSourceParserStream } from 'eventsource-parser/stream';
import type {
  AGUIEvent,
  AGUIEventType,
  AGUISessionState,
  AGUIToolCall,
  AGUIStateDelta,
  AGUIRenderedUI,
} from './types';
import { extractMessageContent, extractToolCall, extractStateDelta } from './types';

/**
 * Parse Server-Sent Events (SSE) stream
 */
export async function* parseAGUIEventStream(
  response: Response
): AsyncGenerator<AGUIEvent, void, unknown> {
  if (!response.body) {
    throw new Error('Response body is null');
  }

  const stream = response.body
    .pipeThrough(new TextDecoderStream())
    .pipeThrough(new EventSourceParserStream());

  for await (const event of stream) {
    if (event.type === 'event') {
      try {
        const data = JSON.parse(event.data);
        yield data as AGUIEvent;
      } catch (error) {
        console.error('Failed to parse event data:', event.data, error);
      }
    }
  }
}

/**
 * AG-UI Event Handler
 * Manages state updates based on incoming events
 */
export class AGUIEventHandler {
  private state: AGUISessionState;
  private listeners: Map<string, Set<(state: AGUISessionState) => void>>;

  constructor(initialState?: Partial<AGUISessionState>) {
    this.state = {
      agentState: 'idle',
      messages: [],
      toolCalls: [],
      renderedUI: [],
      sharedState: {},
      ...initialState,
    };
    this.listeners = new Map();
  }

  /**
   * Get current session state
   */
  getState(): AGUISessionState {
    return { ...this.state };
  }

  /**
   * Subscribe to state changes
   */
  subscribe(listener: (state: AGUISessionState) => void): () => void {
    const id = Math.random().toString(36);
    if (!this.listeners.has(id)) {
      this.listeners.set(id, new Set());
    }
    this.listeners.get(id)!.add(listener);

    // Return unsubscribe function
    return () => {
      this.listeners.get(id)?.delete(listener);
      if (this.listeners.get(id)?.size === 0) {
        this.listeners.delete(id);
      }
    };
  }

  /**
   * Notify all listeners of state change
   */
  private notify() {
    const state = this.getState();
    this.listeners.forEach((set) => {
      set.forEach((listener) => listener(state));
    });
  }

  /**
   * Process an AG-UI event
   */
  handleEvent(event: AGUIEvent) {
    const eventType = event.type as string;

    switch (eventType) {
      case 'agent_state_change':
        this.handleAgentStateChange(event);
        break;

      case 'text_message_start':
        this.handleTextMessageStart(event);
        break;

      case 'text_message_content':
        this.handleTextMessageContent(event);
        break;

      case 'text_message_end':
        this.handleTextMessageEnd(event);
        break;

      case 'tool_call_start':
        this.handleToolCallStart(event);
        break;

      case 'tool_call_args_delta':
        this.handleToolCallArgsDelta(event);
        break;

      case 'tool_call_result':
        this.handleToolCallResult(event);
        break;

      case 'state_delta':
        this.handleStateDelta(event);
        break;

      case 'state_sync':
        this.handleStateSync(event);
        break;

      case 'render_ui_start':
        this.handleRenderUIStart(event);
        break;

      case 'render_ui_content':
        this.handleRenderUIContent(event);
        break;

      case 'render_ui_end':
        this.handleRenderUIEnd(event);
        break;

      case 'error':
        this.handleError(event);
        break;

      case 'done':
        this.handleDone(event);
        break;

      default:
        console.warn('Unknown AG-UI event type:', eventType);
    }

    this.notify();
  }

  /**
   * Handle agent state change
   */
  private handleAgentStateChange(event: any) {
    this.state.agentState = event.state || 'idle';
  }

  /**
   * Handle text message start
   */
  private handleTextMessageStart(event: any) {
    this.state.agentState = 'thinking';
    // Start a new assistant message
    this.state.messages.push({
      id: event.id || Date.now().toString(),
      role: 'assistant',
      content: '',
      metadata: {
        timestamp: new Date().toISOString(),
        role: 'assistant',
        id: event.id,
      },
    });
  }

  /**
   * Handle text message content (streaming)
   */
  private handleTextMessageContent(event: any) {
    const content = extractMessageContent(event);
    if (content) {
      const lastMessage = this.state.messages[this.state.messages.length - 1];
      if (lastMessage && lastMessage.role === 'assistant') {
        lastMessage.content += content;
      }
    }
  }

  /**
   * Handle text message end
   */
  private handleTextMessageEnd(event: any) {
    this.state.agentState = 'idle';
  }

  /**
   * Handle tool call start
   */
  private handleToolCallStart(event: any) {
    this.state.agentState = 'working';
    const toolCall = extractToolCall(event);
    if (toolCall) {
      this.state.toolCalls.push({
        id: toolCall.id || Date.now().toString(),
        name: toolCall.name || 'unknown',
        args: toolCall.args || {},
        status: 'running',
      });
    }
  }

  /**
   * Handle tool call arguments delta (streaming args)
   */
  private handleToolCallArgsDelta(event: any) {
    const delta = event.args || {};
    const toolCall = this.state.toolCalls.find((tc) => tc.id === event.id);
    if (toolCall) {
      toolCall.args = { ...toolCall.args, ...delta };
    }
  }

  /**
   * Handle tool call result
   */
  private handleToolCallResult(event: any) {
    const toolCall = this.state.toolCalls.find((tc) => tc.id === event.id);
    if (toolCall) {
      toolCall.result = event.result;
      toolCall.status = event.error ? 'error' : 'completed';
    }
  }

  /**
   * Handle state delta (incremental state updates)
   */
  private handleStateDelta(event: any) {
    const delta = extractStateDelta(event);
    if (delta) {
      this.applyStateDelta(delta);
    }
  }

  /**
   * Handle state sync (full state replacement)
   */
  private handleStateSync(event: any) {
    this.state.sharedState = event.state || {};
  }

  /**
   * Handle render UI start
   */
  private handleRenderUIStart(event: any) {
    const ui: AGUIRenderedUI = {
      id: event.id || Date.now().toString(),
      type: event.uiType || 'react',
      content: '',
      props: event.props || {},
    };
    this.state.renderedUI.push(ui);
  }

  /**
   * Handle render UI content (streaming UI)
   */
  private handleRenderUIContent(event: any) {
    const ui = this.state.renderedUI.find((u) => u.id === event.id);
    if (ui && typeof ui.content === 'string') {
      ui.content += event.content || '';
    }
  }

  /**
   * Handle render UI end
   */
  private handleRenderUIEnd(event: any) {
    // UI rendering complete - no additional action needed
  }

  /**
   * Handle error event
   */
  private handleError(event: any) {
    this.state.agentState = 'error';
    this.state.error = {
      message: event.message || 'Unknown error',
      code: event.code,
      details: event.details,
    };
  }

  /**
   * Handle done event
   */
  private handleDone(event: any) {
    this.state.agentState = 'done';
  }

  /**
   * Apply a state delta to shared state
   */
  private applyStateDelta(delta: AGUIStateDelta) {
    const { path, operation, value } = delta;

    let current: any = this.state.sharedState;
    for (let i = 0; i < path.length - 1; i++) {
      const key = path[i];
      if (!(key in current)) {
        current[key] = {};
      }
      current = current[key];
    }

    const lastKey = path[path.length - 1];

    switch (operation) {
      case 'set':
        current[lastKey] = value;
        break;
      case 'delete':
        delete current[lastKey];
        break;
      case 'append':
        if (Array.isArray(current[lastKey])) {
          current[lastKey].push(value);
        } else {
          current[lastKey] = [value];
        }
        break;
      case 'patch':
        if (typeof current[lastKey] === 'object') {
          current[lastKey] = { ...current[lastKey], ...value };
        } else {
          current[lastKey] = value;
        }
        break;
    }
  }
}

/**
 * Create a simple event processor
 * Useful for one-off event handling
 */
export function processAGUIEvents(
  eventStream: AsyncGenerator<AGUIEvent>,
  handler: AGUIEventHandler
): Promise<void> {
  return (async () => {
    for await (const event of eventStream) {
      handler.handleEvent(event);
    }
  })();
}
