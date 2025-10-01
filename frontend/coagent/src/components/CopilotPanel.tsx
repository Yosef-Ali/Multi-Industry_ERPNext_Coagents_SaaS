/**
 * T096: CopilotPanel Component
 * Side panel container for the copilot interface with toggle functionality
 */

import React, { useState, useRef, useEffect } from 'react';
import { useCopilot, UseCopilotConfig } from '../hooks/useCopilot';
import { EventStream } from './EventStream';

// ============================================================================
// Types
// ============================================================================

export interface CopilotPanelProps {
  config: UseCopilotConfig;
  isOpen?: boolean;
  onToggle?: (isOpen: boolean) => void;
  position?: 'left' | 'right';
  width?: number;
  className?: string;
}

// ============================================================================
// CopilotPanel Component
// ============================================================================

/**
 * CopilotPanel component provides a side panel for agent interactions
 * Features:
 * - Toggleable show/hide functionality
 * - Configurable width (default 400px)
 * - Configurable position (left or right)
 * - Tailwind CSS styling matching ERPNext theme
 * - Header with title and close button
 * - Responsive design
 * - Message input with send button
 * - Real-time event stream display
 */
export const CopilotPanel: React.FC<CopilotPanelProps> = ({
  config,
  isOpen: externalIsOpen,
  onToggle,
  position = 'right',
  width = 400,
  className = '',
}) => {
  // Internal open state (if not controlled)
  const [internalIsOpen, setInternalIsOpen] = useState(false);
  const isControlled = externalIsOpen !== undefined;
  const isOpen = isControlled ? externalIsOpen : internalIsOpen;

  // Message input state
  const [inputValue, setInputValue] = useState('');
  const inputRef = useRef<HTMLTextAreaElement>(null);

  // Use copilot hook
  const copilot = useCopilot(config);

  /**
   * Toggle panel open/close
   */
  const handleToggle = () => {
    const newIsOpen = !isOpen;
    if (!isControlled) {
      setInternalIsOpen(newIsOpen);
    }
    onToggle?.(newIsOpen);
  };

  /**
   * Send message
   */
  const handleSendMessage = async () => {
    const message = inputValue.trim();
    if (!message) return;

    setInputValue('');
    await copilot.sendMessage(message);

    // Focus input after sending
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  /**
   * Handle Enter key in textarea
   */
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  /**
   * Auto-resize textarea based on content
   */
  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.style.height = 'auto';
      inputRef.current.style.height = `${inputRef.current.scrollHeight}px`;
    }
  }, [inputValue]);

  // Position styles
  const positionStyles = position === 'right' ? 'right-0' : 'left-0';
  const transformStyles = isOpen
    ? 'translate-x-0'
    : position === 'right'
    ? 'translate-x-full'
    : '-translate-x-full';

  return (
    <>
      {/* Toggle Button (floating) */}
      {!isOpen && (
        <button
          onClick={handleToggle}
          className={`fixed ${positionStyles} top-1/2 z-40 -translate-y-1/2 rounded-l-lg bg-primary-600 p-3 text-white shadow-lg transition-all hover:bg-primary-700 ${
            position === 'left' ? 'rounded-l-none rounded-r-lg' : ''
          }`}
          style={{ [position]: 0 }}
          aria-label="Open copilot panel"
        >
          <svg
            className="h-6 w-6"
            fill="none"
            stroke="currentColor"
            viewBox="0 0 24 24"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
            />
          </svg>
        </button>
      )}

      {/* Panel */}
      <div
        className={`fixed ${positionStyles} top-0 z-50 h-full bg-white shadow-2xl transition-transform duration-300 ease-in-out ${transformStyles} ${className}`}
        style={{ width: `${width}px` }}
      >
        {/* Header */}
        <div className="flex items-center justify-between border-b border-gray-200 bg-primary-600 px-4 py-3 text-white">
          <div className="flex items-center gap-2">
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z"
              />
            </svg>
            <div>
              <h2 className="text-base font-semibold">
                {config.doctype ? `${config.doctype} Assistant` : 'ERPNext Coagent'}
              </h2>
              {config.docName && (
                <p className="text-xs text-primary-100">{config.docName}</p>
              )}
            </div>
          </div>

          <button
            onClick={handleToggle}
            className="rounded p-1 hover:bg-primary-700 transition-colors"
            aria-label="Close copilot panel"
          >
            <svg
              className="h-5 w-5"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M6 18L18 6M6 6l12 12"
              />
            </svg>
          </button>
        </div>

        {/* Connection Status */}
        <div className="border-b border-gray-200 bg-gray-50 px-4 py-2">
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <div
                className={`h-2 w-2 rounded-full ${
                  copilot.connectionState === 'connected'
                    ? 'bg-green-500'
                    : copilot.connectionState === 'connecting'
                    ? 'bg-yellow-500 animate-pulse'
                    : copilot.connectionState === 'error'
                    ? 'bg-red-500'
                    : 'bg-gray-400'
                }`}
              />
              <span className="text-gray-600 capitalize">{copilot.connectionState}</span>
            </div>
            {copilot.connectionState === 'error' && (
              <button
                onClick={copilot.reconnect}
                className="text-primary-600 hover:text-primary-800"
              >
                Reconnect
              </button>
            )}
            {copilot.messages.length > 0 && (
              <button
                onClick={copilot.clearMessages}
                className="text-gray-600 hover:text-gray-800"
              >
                Clear
              </button>
            )}
          </div>
        </div>

        {/* Error Banner */}
        {copilot.error && (
          <div className="border-b border-red-200 bg-red-50 px-4 py-3">
            <div className="flex items-start justify-between gap-2">
              <div className="flex items-start gap-2">
                <svg
                  className="mt-0.5 h-4 w-4 flex-shrink-0 text-red-600"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                    clipRule="evenodd"
                  />
                </svg>
                <p className="text-sm text-red-800">{copilot.error}</p>
              </div>
              <button
                onClick={copilot.clearError}
                className="text-red-600 hover:text-red-800"
              >
                <svg className="h-4 w-4" fill="currentColor" viewBox="0 0 20 20">
                  <path
                    fillRule="evenodd"
                    d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                    clipRule="evenodd"
                  />
                </svg>
              </button>
            </div>
          </div>
        )}

        {/* Event Stream */}
        <EventStream
          events={copilot.events}
          isStreaming={copilot.isStreaming}
          className="flex-1 h-[calc(100vh-200px)]"
        />

        {/* Input Area */}
        <div className="border-t border-gray-200 bg-white p-4">
          <div className="flex gap-2">
            <textarea
              ref={inputRef}
              value={inputValue}
              onChange={(e) => setInputValue(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={
                copilot.connectionState === 'connected'
                  ? 'Type a message... (Shift+Enter for new line)'
                  : 'Connecting...'
              }
              disabled={copilot.connectionState !== 'connected' || copilot.isLoading}
              className="flex-1 resize-none rounded-lg border border-gray-300 px-3 py-2 text-sm focus:border-primary-500 focus:outline-none focus:ring-1 focus:ring-primary-500 disabled:bg-gray-100 disabled:cursor-not-allowed"
              rows={1}
              style={{ maxHeight: '120px' }}
            />
            <button
              onClick={handleSendMessage}
              disabled={
                !inputValue.trim() ||
                copilot.connectionState !== 'connected' ||
                copilot.isLoading
              }
              className="btn-primary self-end disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {copilot.isLoading ? (
                <svg
                  className="h-5 w-5 animate-spin"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle
                    className="opacity-25"
                    cx="12"
                    cy="12"
                    r="10"
                    stroke="currentColor"
                    strokeWidth="4"
                  />
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  />
                </svg>
              ) : (
                <svg
                  className="h-5 w-5"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8"
                  />
                </svg>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* Backdrop (when open) */}
      {isOpen && (
        <div
          className="fixed inset-0 z-40 bg-black bg-opacity-25"
          onClick={handleToggle}
          aria-hidden="true"
        />
      )}
    </>
  );
};

export default CopilotPanel;
