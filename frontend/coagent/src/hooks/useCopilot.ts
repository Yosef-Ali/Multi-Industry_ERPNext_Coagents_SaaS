/**
 * T095: useCopilot Hook
 * Manages agent interaction state, message history, and streaming
 */

import { useState, useCallback, useRef, useEffect } from 'react';
import {
  AGUIEventType,
  ChatMessageEvent,
  createSSEStream,
  EventHandler,
} from '../utils/streaming';

// ============================================================================
// Types
// ============================================================================

/**
 * Message in the chat history
 */
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: Date;
}

/**
 * Connection state
 */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected' | 'error';

/**
 * useCopilot hook state
 */
export interface UseCopilotState {
  // Connection state
  connectionState: ConnectionState;

  // Message history
  messages: Message[];

  // Streaming state
  isStreaming: boolean;
  isLoading: boolean;

  // Current session
  sessionId: string | null;

  // Error state
  error: string | null;

  // Event stream
  events: AGUIEventType[];
}

/**
 * useCopilot hook actions
 */
export interface UseCopilotActions {
  sendMessage: (content: string) => Promise<void>;
  clearMessages: () => void;
  clearError: () => void;
  disconnect: () => void;
  reconnect: () => void;
}

/**
 * useCopilot hook return type
 */
export type UseCopilotReturn = UseCopilotState & UseCopilotActions;

/**
 * useCopilot hook configuration
 */
export interface UseCopilotConfig {
  // Agent gateway URL
  gatewayUrl: string;

  // Authentication token
  authToken: string;

  // User ID
  userId: string;

  // Optional document context
  doctype?: string;
  docName?: string;

  // Enabled industries
  enabledIndustries?: string[];

  // Auto-connect on mount
  autoConnect?: boolean;

  // Event handlers
  onEvent?: EventHandler;
  onError?: (error: Error) => void;
}

// ============================================================================
// useCopilot Hook
// ============================================================================

/**
 * Custom hook for managing CopilotKit agent interactions
 *
 * Handles:
 * - SSE streaming connection to /agui endpoint
 * - Message history management
 * - Loading/streaming states
 * - Error handling
 * - Session lifecycle
 *
 * @param config - Hook configuration
 * @returns Hook state and actions
 */
export function useCopilot(config: UseCopilotConfig): UseCopilotReturn {
  // State
  const [connectionState, setConnectionState] = useState<ConnectionState>('disconnected');
  const [messages, setMessages] = useState<Message[]>([]);
  const [isStreaming, setIsStreaming] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [events, setEvents] = useState<AGUIEventType[]>([]);

  // Refs
  const abortControllerRef = useRef<AbortController | null>(null);
  const messageQueueRef = useRef<string[]>([]);

  // ============================================================================
  // Event Handlers
  // ============================================================================

  /**
   * Handle incoming SSE event
   */
  const handleEvent = useCallback<EventHandler>(
    (event) => {
      // Add to events list
      setEvents((prev) => [...prev, event]);

      // Handle specific event types
      switch (event.type) {
        case 'chat_message':
          handleChatMessage(event);
          break;

        case 'status':
          if (event.status === 'connected') {
            setConnectionState('connected');
            setIsStreaming(false);
            setIsLoading(false);
          } else if (event.status === 'processing') {
            setIsStreaming(true);
          } else if (event.status === 'completed') {
            setIsStreaming(false);
            setIsLoading(false);
          }
          break;

        case 'error':
          setError(event.message);
          setConnectionState('error');
          setIsStreaming(false);
          setIsLoading(false);
          break;

        default:
          break;
      }

      // Call user-provided event handler
      config.onEvent?.(event);
    },
    [config]
  );

  /**
   * Handle chat message event
   */
  const handleChatMessage = useCallback((event: ChatMessageEvent) => {
    const message: Message = {
      id: `msg-${Date.now()}-${Math.random()}`,
      role: event.role,
      content: event.content,
      timestamp: event.timestamp ? new Date(event.timestamp) : new Date(),
    };

    setMessages((prev) => [...prev, message]);
  }, []);

  /**
   * Handle connection error
   */
  const handleError = useCallback(
    (err: Error) => {
      console.error('Copilot connection error:', err);
      setError(err.message);
      setConnectionState('error');
      setIsStreaming(false);
      setIsLoading(false);
      config.onError?.(err);
    },
    [config]
  );

  // ============================================================================
  // Actions
  // ============================================================================

  /**
   * Send a message to the agent
   */
  const sendMessage = useCallback(
    async (content: string) => {
      if (!content.trim()) {
        return;
      }

      // Add user message immediately
      const userMessage: Message = {
        id: `msg-${Date.now()}-${Math.random()}`,
        role: 'user',
        content: content.trim(),
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, userMessage]);
      setIsLoading(true);
      setError(null);

      try {
        // Disconnect existing stream
        if (abortControllerRef.current) {
          abortControllerRef.current.abort();
        }

        setConnectionState('connecting');

        // Create new SSE stream
        const controller = await createSSEStream(
          `${config.gatewayUrl}/agui`,
          {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${config.authToken}`,
            },
            body: JSON.stringify({
              session_id: sessionId,
              user_id: config.userId,
              message: content.trim(),
              doctype: config.doctype,
              doc_name: config.docName,
              enabled_industries: config.enabledIndustries,
            }),
          },
          handleEvent,
          handleError
        );

        abortControllerRef.current = controller;
      } catch (err: any) {
        handleError(err);
      }
    },
    [
      config.gatewayUrl,
      config.authToken,
      config.userId,
      config.doctype,
      config.docName,
      config.enabledIndustries,
      sessionId,
      handleEvent,
      handleError,
    ]
  );

  /**
   * Clear message history
   */
  const clearMessages = useCallback(() => {
    setMessages([]);
    setEvents([]);
    setError(null);
  }, []);

  /**
   * Clear error state
   */
  const clearError = useCallback(() => {
    setError(null);
  }, []);

  /**
   * Disconnect from agent
   */
  const disconnect = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    setConnectionState('disconnected');
    setIsStreaming(false);
    setIsLoading(false);
  }, []);

  /**
   * Reconnect to agent
   */
  const reconnect = useCallback(async () => {
    disconnect();
    setError(null);

    try {
      setConnectionState('connecting');

      // Create initial connection without message
      const controller = await createSSEStream(
        `${config.gatewayUrl}/agui`,
        {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.authToken}`,
          },
          body: JSON.stringify({
            session_id: sessionId,
            user_id: config.userId,
            doctype: config.doctype,
            doc_name: config.docName,
            enabled_industries: config.enabledIndustries,
          }),
        },
        handleEvent,
        handleError
      );

      abortControllerRef.current = controller;
    } catch (err: any) {
      handleError(err);
    }
  }, [
    config.gatewayUrl,
    config.authToken,
    config.userId,
    config.doctype,
    config.docName,
    config.enabledIndustries,
    sessionId,
    disconnect,
    handleEvent,
    handleError,
  ]);

  // ============================================================================
  // Effects
  // ============================================================================

  /**
   * Auto-connect on mount if configured
   */
  useEffect(() => {
    if (config.autoConnect) {
      reconnect();
    }

    // Cleanup on unmount
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, [config.autoConnect]); // Only run on mount

  // ============================================================================
  // Return
  // ============================================================================

  return {
    // State
    connectionState,
    messages,
    isStreaming,
    isLoading,
    sessionId,
    error,
    events,

    // Actions
    sendMessage,
    clearMessages,
    clearError,
    disconnect,
    reconnect,
  };
}
