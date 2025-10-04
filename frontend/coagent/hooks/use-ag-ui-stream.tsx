'use client';

/**
 * useAGUIStream Hook
 * React hook for streaming AG-UI events
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import type { AGUIRequest, AGUIEvent, AGUISessionState } from '@/lib/ag-ui/types';
import { AGUIEventHandler } from '@/lib/ag-ui/events';
import { streamAGUI } from '@/lib/ag-ui/client';

export interface UseAGUIStreamOptions {
  endpoint: string;
  onEvent?: (event: AGUIEvent) => void;
  onStateChange?: (state: AGUISessionState) => void;
  onError?: (error: Error) => void;
  onDone?: () => void;
}

export interface UseAGUIStreamResult {
  state: AGUISessionState;
  isStreaming: boolean;
  error: Error | null;
  sendMessage: (message: string, context?: Record<string, any>) => Promise<void>;
  sendRequest: (request: AGUIRequest) => Promise<void>;
  stop: () => void;
  reset: () => void;
}

/**
 * useAGUIStream - Hook for streaming AG-UI protocol events
 *
 * @example
 * ```tsx
 * function MyComponent() {
 *   const { state, sendMessage, isStreaming } = useAGUIStream({
 *     endpoint: '/api/ag-ui',
 *     onStateChange: (state) => console.log('State updated:', state),
 *   });
 *
 *   return (
 *     <div>
 *       <button onClick={() => sendMessage('Hello AI!')}>
 *         Send Message
 *       </button>
 *       {state.messages.map((msg) => (
 *         <div key={msg.id}>{msg.content}</div>
 *       ))}
 *     </div>
 *   );
 * }
 * ```
 */
export function useAGUIStream(options: UseAGUIStreamOptions): UseAGUIStreamResult {
  const { endpoint, onEvent, onStateChange, onError, onDone } = options;

  const [handler] = useState(() => new AGUIEventHandler());
  const [state, setState] = useState<AGUISessionState>(handler.getState());
  const [isStreaming, setIsStreaming] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const abortControllerRef = useRef<AbortController | null>(null);

  // Subscribe to handler state changes
  useEffect(() => {
    const unsubscribe = handler.subscribe((newState) => {
      setState(newState);
      onStateChange?.(newState);
    });

    return unsubscribe;
  }, [handler, onStateChange]);

  /**
   * Send a message to the AG-UI endpoint
   */
  const sendMessage = useCallback(
    async (message: string, context?: Record<string, any>) => {
      const request: AGUIRequest = {
        messages: [{ role: 'user', content: message }],
        context,
      };

      return sendRequest(request);
    },
    []
  );

  /**
   * Send a full AG-UI request
   */
  const sendRequest = useCallback(
    async (request: AGUIRequest) => {
      // Add user message to state
      handler.handleEvent({
        type: 'text_message_start',
        id: Date.now().toString(),
      } as any);
      handler.handleEvent({
        type: 'text_message_content',
        content: request.messages[request.messages.length - 1]?.content || '',
      } as any);
      handler.handleEvent({
        type: 'text_message_end',
      } as any);

      setIsStreaming(true);
      setError(null);

      // Create abort controller for this request
      abortControllerRef.current = new AbortController();

      try {
        await streamAGUI(
          endpoint,
          request,
          (event) => {
            onEvent?.(event);
            handler.handleEvent(event);

            if (event.type === 'done') {
              onDone?.();
            }
          },
          abortControllerRef.current.signal
        );
      } catch (err) {
        const error = err as Error;
        setError(error);
        onError?.(error);

        // Add error to state
        handler.handleEvent({
          type: 'error',
          message: error.message,
        } as any);
      } finally {
        setIsStreaming(false);
        abortControllerRef.current = null;
      }
    },
    [endpoint, handler, onEvent, onError, onDone]
  );

  /**
   * Stop the current stream
   */
  const stop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setIsStreaming(false);
  }, []);

  /**
   * Reset the session state
   */
  const reset = useCallback(() => {
    stop();
    const newHandler = new AGUIEventHandler();
    setState(newHandler.getState());
    setError(null);
  }, [stop]);

  return {
    state,
    isStreaming,
    error,
    sendMessage,
    sendRequest,
    stop,
    reset,
  };
}
