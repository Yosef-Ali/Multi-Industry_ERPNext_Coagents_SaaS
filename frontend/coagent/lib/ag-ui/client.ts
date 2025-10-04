/**
 * AG-UI HTTP Client
 * Handles communication with AG-UI protocol backends
 */

import type { AGUIRequest, AGUIEvent, AGUIStreamConfig } from './types';
import { parseAGUIEventStream, AGUIEventHandler } from './events';

/**
 * AG-UI Client Configuration
 */
export interface AGUIClientConfig {
  baseUrl: string;
  headers?: Record<string, string>;
  timeout?: number;
}

/**
 * AG-UI Client
 * Main client for interacting with AG-UI protocol servers
 */
export class AGUIClient {
  private config: AGUIClientConfig;

  constructor(config: AGUIClientConfig) {
    this.config = {
      timeout: 30000,
      ...config,
    };
  }

  /**
   * Send a request to the AG-UI server and get streaming response
   */
  async stream(
    request: AGUIRequest,
    streamConfig?: Partial<AGUIStreamConfig>
  ): Promise<AGUIEventHandler> {
    const handler = new AGUIEventHandler();

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), this.config.timeout);

    try {
      const response = await fetch(this.config.baseUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'text/event-stream',
          ...this.config.headers,
          ...streamConfig?.headers,
        },
        body: JSON.stringify(request),
        signal: streamConfig?.signal || controller.signal,
      });

      if (!response.ok) {
        throw new Error(`AG-UI request failed: ${response.statusText}`);
      }

      // Process the event stream
      const eventStream = parseAGUIEventStream(response);

      for await (const event of eventStream) {
        // Notify custom callback if provided
        streamConfig?.onEvent?.(event);

        // Update handler state
        handler.handleEvent(event);

        // Check for done event
        if (event.type === 'done') {
          streamConfig?.onDone?.();
          break;
        }

        // Check for error event
        if (event.type === 'error') {
          const errorEvent = event as any;
          const error = new Error(errorEvent.message || 'AG-UI error');
          streamConfig?.onError?.(error);
          break;
        }
      }
    } catch (error) {
      streamConfig?.onError?.(error as Error);
      throw error;
    } finally {
      clearTimeout(timeoutId);
    }

    return handler;
  }

  /**
   * Send a simple message and get streaming response
   */
  async sendMessage(
    message: string,
    context?: Record<string, any>,
    streamConfig?: Partial<AGUIStreamConfig>
  ): Promise<AGUIEventHandler> {
    return this.stream(
      {
        messages: [{ role: 'user', content: message }],
        context,
      },
      streamConfig
    );
  }

  /**
   * Send a request and wait for complete response (non-streaming)
   */
  async request(req: AGUIRequest): Promise<{
    messages: Array<{ role: string; content: string }>;
    state: Record<string, any>;
    toolCalls: Array<any>;
  }> {
    const handler = await this.stream(req);
    const state = handler.getState();

    return {
      messages: state.messages,
      state: state.sharedState,
      toolCalls: state.toolCalls,
    };
  }
}

/**
 * Create a default AG-UI client
 */
export function createAGUIClient(baseUrl: string, headers?: Record<string, string>): AGUIClient {
  return new AGUIClient({ baseUrl, headers });
}

/**
 * Hook-friendly AG-UI streaming
 * Designed to be used with React hooks
 */
export async function streamAGUI(
  endpoint: string,
  request: AGUIRequest,
  onEvent: (event: AGUIEvent) => void,
  signal?: AbortSignal
): Promise<void> {
  const response = await fetch(endpoint, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Accept: 'text/event-stream',
    },
    body: JSON.stringify(request),
    signal,
  });

  if (!response.ok) {
    throw new Error(`AG-UI request failed: ${response.statusText}`);
  }

  const eventStream = parseAGUIEventStream(response);

  for await (const event of eventStream) {
    onEvent(event);

    if (event.type === 'done' || event.type === 'error') {
      break;
    }
  }
}
