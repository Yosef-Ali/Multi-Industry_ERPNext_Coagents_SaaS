/**
 * T094: CopilotKitProvider Setup in App.tsx
 * Main application component with CopilotKit integration
 */

import React from 'react';
import { CopilotKit } from '@copilotkit/react-core';
import { CopilotPanel } from './components/CopilotPanel';
import { ApprovalDialogContainer } from './components/ApprovalDialog';
import { UseCopilotConfig } from './hooks/useCopilot';

// ============================================================================
// Environment Configuration
// ============================================================================

/**
 * Get configuration from environment variables
 */
function getConfig() {
  // Get gateway URL from environment or use default
  const gatewayUrl = import.meta.env.VITE_GATEWAY_URL || 'http://localhost:3000';

  // Get auth token from environment or ERPNext session
  const authToken = getAuthToken();

  // Get user ID from ERPNext session
  const userId = getCurrentUserId();

  // Get document context from URL params
  const searchParams = new URLSearchParams(window.location.search);
  const doctype = searchParams.get('doctype') || undefined;
  const docName = searchParams.get('name') || undefined;

  // Get enabled industries from ERPNext settings
  const enabledIndustries = getEnabledIndustries();

  return {
    gatewayUrl,
    authToken,
    userId,
    doctype,
    docName,
    enabledIndustries,
  };
}

/**
 * Get authentication token
 * In production, this should come from ERPNext session
 */
function getAuthToken(): string {
  // Try to get from environment
  const envToken = import.meta.env.VITE_AUTH_TOKEN;
  if (envToken) {
    return envToken;
  }

  // Try to get from ERPNext session (if embedded)
  if (typeof window !== 'undefined' && (window as any).frappe) {
    const frappe = (window as any).frappe;
    return frappe.csrf_token || frappe.session?.user || '';
  }

  // Development fallback
  if (import.meta.env.DEV) {
    return 'dev_token_for_testing';
  }

  console.warn('No authentication token found');
  return '';
}

/**
 * Get current user ID
 * In production, this should come from ERPNext session
 */
function getCurrentUserId(): string {
  // Try to get from ERPNext session (if embedded)
  if (typeof window !== 'undefined' && (window as any).frappe) {
    const frappe = (window as any).frappe;
    return frappe.session?.user || 'Guest';
  }

  // Development fallback
  if (import.meta.env.DEV) {
    return 'dev_user@example.com';
  }

  return 'Guest';
}

/**
 * Get enabled industries from ERPNext settings
 * In production, this should come from ERPNext site config
 */
function getEnabledIndustries(): string[] {
  // Try to get from ERPNext (if embedded)
  if (typeof window !== 'undefined' && (window as any).frappe) {
    const frappe = (window as any).frappe;
    if (frappe.boot?.enabled_industries) {
      return frappe.boot.enabled_industries;
    }
  }

  // Development fallback - all industries enabled
  return ['hotel', 'hospital', 'manufacturing', 'retail', 'education'];
}

// ============================================================================
// App Component
// ============================================================================

/**
 * Main App component with CopilotKit integration
 *
 * Features:
 * - CopilotKitProvider connected to /agui endpoint
 * - Bearer token authentication from environment
 * - Error handling for connection failures
 * - Document context support
 * - ApprovalDialog integration
 * - CopilotPanel with toggle functionality
 */
export default function App() {
  const config = getConfig();
  const [error, setError] = React.useState<string | null>(null);
  const [isPanelOpen, setIsPanelOpen] = React.useState(false);

  /**
   * Validate configuration on mount
   */
  React.useEffect(() => {
    if (!config.authToken) {
      setError('Authentication token not found. Please log in to ERPNext.');
    } else if (!config.gatewayUrl) {
      setError('Agent gateway URL not configured.');
    } else {
      setError(null);
    }
  }, [config.authToken, config.gatewayUrl]);

  /**
   * Handle configuration errors
   */
  if (error) {
    return (
      <div className="flex h-screen items-center justify-center bg-gray-50">
        <div className="max-w-md rounded-lg border border-red-300 bg-red-50 p-6">
          <div className="flex items-start gap-3">
            <svg
              className="mt-0.5 h-6 w-6 flex-shrink-0 text-red-600"
              fill="currentColor"
              viewBox="0 0 20 20"
            >
              <path
                fillRule="evenodd"
                d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z"
                clipRule="evenodd"
              />
            </svg>
            <div>
              <h3 className="text-lg font-semibold text-red-900">Configuration Error</h3>
              <p className="mt-1 text-sm text-red-700">{error}</p>
              <div className="mt-4">
                <h4 className="text-sm font-medium text-red-900">Troubleshooting:</h4>
                <ul className="mt-2 list-inside list-disc space-y-1 text-sm text-red-700">
                  <li>Ensure you are logged in to ERPNext</li>
                  <li>Check that the agent gateway is running at {config.gatewayUrl}</li>
                  <li>Verify VITE_GATEWAY_URL environment variable is set correctly</li>
                  <li>Check browser console for additional error details</li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  /**
   * CopilotKit configuration
   */
  const copilotConfig: UseCopilotConfig = {
    gatewayUrl: config.gatewayUrl,
    authToken: config.authToken,
    userId: config.userId,
    doctype: config.doctype,
    docName: config.docName,
    enabledIndustries: config.enabledIndustries,
    autoConnect: false, // Don't auto-connect, wait for user to open panel
    onEvent: (event) => {
      // Log events in development
      if (import.meta.env.DEV) {
        console.log('[AG-UI Event]', event);
      }
    },
    onError: (error) => {
      console.error('[Copilot Error]', error);
      setError(error.message);
    },
  };

  return (
    <CopilotKit
      runtimeUrl={`${config.gatewayUrl}/agui`}
      headers={{
        'Authorization': `Bearer ${config.authToken}`,
        'Content-Type': 'application/json',
      }}
      body={{
        user_id: config.userId,
        doctype: config.doctype,
        doc_name: config.docName,
        enabled_industries: config.enabledIndustries,
      }}
    >
      <div className="h-screen w-full bg-gray-50">
        {/* Main Content Area */}
        <div className="flex h-full flex-col">
          {/* Header */}
          <header className="border-b border-gray-200 bg-white px-6 py-4 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-gray-900">ERPNext Coagent</h1>
                {config.doctype && (
                  <p className="text-sm text-gray-600">
                    {config.doctype}
                    {config.docName && (
                      <>
                        {' '}
                        / <span className="font-medium">{config.docName}</span>
                      </>
                    )}
                  </p>
                )}
              </div>

              <button
                onClick={() => setIsPanelOpen(true)}
                className="btn-primary flex items-center gap-2"
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
                    d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z"
                  />
                </svg>
                <span>Open Assistant</span>
              </button>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-auto p-6">
            <div className="mx-auto max-w-4xl">
              <div className="rounded-lg border border-gray-200 bg-white p-8 shadow-sm">
                <div className="text-center">
                  <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-primary-100">
                    <svg
                      className="h-8 w-8 text-primary-600"
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
                  </div>
                  <h2 className="mb-2 text-xl font-semibold text-gray-900">
                    Welcome to ERPNext Coagent
                  </h2>
                  <p className="mb-6 text-gray-600">
                    Your AI-powered assistant for ERPNext. Click "Open Assistant" to get started.
                  </p>
                  <div className="space-y-3 text-left">
                    <div className="flex items-start gap-3">
                      <div className="mt-1 flex-shrink-0">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-600">
                          ✓
                        </div>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Query Documents</p>
                        <p className="text-sm text-gray-600">
                          Search and retrieve information from your ERPNext data
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-1 flex-shrink-0">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-600">
                          ✓
                        </div>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Create & Update Records</p>
                        <p className="text-sm text-gray-600">
                          Use natural language to manage your business data
                        </p>
                      </div>
                    </div>
                    <div className="flex items-start gap-3">
                      <div className="mt-1 flex-shrink-0">
                        <div className="flex h-6 w-6 items-center justify-center rounded-full bg-green-100 text-green-600">
                          ✓
                        </div>
                      </div>
                      <div>
                        <p className="font-medium text-gray-900">Run Reports & Analytics</p>
                        <p className="text-sm text-gray-600">
                          Get insights from your data with intelligent analysis
                        </p>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </main>
        </div>

        {/* Copilot Panel */}
        <CopilotPanel
          config={copilotConfig}
          isOpen={isPanelOpen}
          onToggle={setIsPanelOpen}
          position="right"
          width={400}
        />

        {/* Approval Dialog Container */}
        <ApprovalDialogContainer />
      </div>
    </CopilotKit>
  );
}
