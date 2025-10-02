/**
 * Frontend Integration Example: CopilotKit AG-UI with ERPNext Coagent
 * This demonstrates the pattern for integrating the agent-gateway with CopilotKit
 */

"use client";

import { CopilotKit, useCopilotAction, useCopilotReadable } from "@copilotkit/react-core";
import { CopilotSidebar } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";
import { useState, useEffect } from "react";

/**
 * Main App Component
 * Wraps chat interface in CopilotKit provider pointing to /agui endpoint
 */
export default function App() {
  // Get user and document context from URL params
  const searchParams = new URLSearchParams(window.location.search);
  const doctype = searchParams.get('doctype') || undefined;
  const name = searchParams.get('name') || undefined;

  return (
    <CopilotKit
      runtimeUrl="/agui"
      agent="erpnext_coagent"
      publicApiKey={getAuthToken()}
      showDevConsole={process.env.NODE_ENV === 'development'}
    >
      <CoagentPanel doctype={doctype} name={name} />
    </CopilotKit>
  );
}

/**
 * Coagent Panel Component
 * Renders chat interface and handles approval prompts
 */
function CoagentPanel({ doctype, name }: { doctype?: string; name?: string }) {
  const [documentContext, setDocumentContext] = useState<any>(null);

  // Make document context readable to Copilot
  useCopilotReadable({
    description: "The current ERPNext document context",
    value: {
      doctype,
      name,
      ...documentContext,
    },
  });

  // Fetch document data if doctype and name are provided
  useEffect(() => {
    if (doctype && name) {
      // Fetch document data from ERPNext API
      // This is a placeholder - implement actual API call
      setDocumentContext({
        doctype,
        name,
        loaded: true,
      });
    }
  }, [doctype, name]);

  // Register approval action handler with renderAndWaitForResponse
  useCopilotAction({
    name: "approval_gate",
    description: "Handle approval prompts for high-risk operations",
    available: "frontend",
    parameters: [
      {
        name: "prompt_id",
        type: "string",
        description: "Unique ID for this approval prompt",
        required: true,
      },
      {
        name: "message",
        type: "string",
        description: "Approval message to display",
        required: true,
      },
      {
        name: "preview",
        type: "object",
        description: "Preview of the operation to approve",
        required: true,
      },
      {
        name: "risk_level",
        type: "string",
        description: "Risk level: low, medium, high",
        required: true,
      },
    ],
    renderAndWaitForResponse: ({ args, respond, status }) => {
      return (
        <div className={`approval-dialog risk-${args.risk_level}`}>
          <h3>{args.message}</h3>
          <div className="preview-container">
            <pre>{JSON.stringify(args.preview, null, 2)}</pre>
          </div>
          <div className={`approval-actions ${status !== "executing" ? "hidden" : ""}`}>
            <button
              onClick={() => respond?.("CANCEL")}
              disabled={status !== "executing"}
              className="btn-cancel"
            >
              Cancel
            </button>
            <button
              onClick={() => respond?.("APPROVE")}
              disabled={status !== "executing"}
              className="btn-approve"
            >
              Approve
            </button>
          </div>
        </div>
      );
    },
  });

  return (
    <CopilotSidebar
      defaultOpen={true}
      clickOutsideToClose={false}
      labels={{
        title: doctype ? `${doctype} Assistant` : "ERPNext Coagent",
        initial: doctype
          ? `I'm ready to assist with this ${doctype}. What would you like to do?`
          : "Hello! How can I help you with ERPNext today?",
        placeholder: "Ask me anything about ERPNext...",
      }}
      observabilityHooks={{
        onChatExpanded: () => {
          console.log("Copilot sidebar opened");
        },
        onChatMinimized: () => {
          console.log("Copilot sidebar closed");
        },
        onMessageSent: (message) => {
          console.log("Message sent:", message);
        },
      }}
    />
  );
}

/**
 * Helper functions (to be implemented based on ERPNext integration)
 */

function getAuthToken(): string {
  // Get ERPNext API token or session token
  // For development: use development token
  if (process.env.NODE_ENV === 'development') {
    return 'dev_token_for_testing';
  }

  // @ts-ignore
  return window.frappe?.csrf_token || '';
}
