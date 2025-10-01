/**
 * Frontend Integration Example: CopilotKit AG-UI with ERPNext Coagent
 * This demonstrates the pattern for integrating the agent-gateway with CopilotKit
 */

import { CopilotKit, useCopilotAction } from "@copilotkit/react-core";
import { CopilotChat } from "@copilotkit/react-ui";
import "@copilotkit/react-ui/styles.css";

/**
 * Main App Component
 * Wraps chat interface in CopilotKit provider pointing to /agui endpoint
 */
export default function App() {
  // Get user and document context from URL params
  const searchParams = new URLSearchParams(window.location.search);
  const doctype = searchParams.get('doctype');
  const name = searchParams.get('name');
  const userId = getCurrentUserId(); // From ERPNext session

  return (
    <CopilotKit
      runtimeUrl="/agui"
      headers={{
        'Authorization': `Bearer ${getAuthToken()}`,
        'Content-Type': 'application/json',
      }}
      body={{
        user_id: userId,
        doctype: doctype || undefined,
        doc_name: name || undefined,
        enabled_industries: getEnabledIndustries(), // From ERPNext settings
      }}
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
  // Register approval action handler
  useCopilotAction({
    name: "approval_gate",
    description: "Handle approval prompts for high-risk operations",
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
    handler: async ({ prompt_id, message, preview, risk_level }) => {
      // Show approval UI and wait for user response
      const response = await showApprovalDialog({
        promptId: prompt_id,
        message,
        preview,
        riskLevel: risk_level,
      });

      return { response }; // 'approve' or 'cancel'
    },
  });

  return (
    <div className="coagent-container">
      {doctype && name && (
        <div className="context-banner">
          <span className="doctype-badge">{doctype}</span>
          <span className="doc-name">{name}</span>
        </div>
      )}

      <CopilotChat
        labels={{
          title: doctype ? `${doctype} Assistant` : "ERPNext Coagent",
          initial: doctype
            ? `I'm ready to assist with this ${doctype}. What would you like to do?`
            : "Hello! How can I help you with ERPNext today?",
        }}
        makeSystemMessage={(message) => {
          return {
            ...message,
            role: "system",
          };
        }}
      />
    </div>
  );
}

/**
 * Show approval dialog to user
 * Returns promise that resolves when user approves/cancels
 */
async function showApprovalDialog(params: {
  promptId: string;
  message: string;
  preview: any;
  riskLevel: string;
}): Promise<'approve' | 'cancel'> {
  return new Promise((resolve) => {
    // Create modal dialog
    const dialog = document.createElement('div');
    dialog.className = `approval-dialog risk-${params.riskLevel}`;
    dialog.innerHTML = `
      <div class="approval-overlay">
        <div class="approval-modal">
          <h3>${params.message}</h3>
          <div class="preview-container">
            <pre>${JSON.stringify(params.preview, null, 2)}</pre>
          </div>
          <div class="approval-actions">
            <button class="btn-cancel" data-response="cancel">Cancel</button>
            <button class="btn-approve" data-response="approve">Approve</button>
          </div>
        </div>
      </div>
    `;

    // Handle button clicks
    dialog.querySelectorAll('button').forEach(button => {
      button.addEventListener('click', (e) => {
        const response = (e.target as HTMLElement).dataset.response as 'approve' | 'cancel';
        document.body.removeChild(dialog);
        resolve(response);
      });
    });

    document.body.appendChild(dialog);
  });
}

/**
 * Helper functions (to be implemented based on ERPNext integration)
 */

function getCurrentUserId(): string {
  // Extract from ERPNext session
  // @ts-ignore
  return window.frappe?.session?.user || 'Guest';
}

function getAuthToken(): string {
  // Get ERPNext API token or session token
  // For development: use development token
  if (process.env.NODE_ENV === 'development') {
    return 'dev_token_for_testing';
  }

  // @ts-ignore
  return window.frappe?.csrf_token || '';
}

function getEnabledIndustries(): string[] {
  // Get from ERPNext site config or user settings
  // For now, return all industries
  return ['hotel', 'hospital', 'manufacturing', 'retail', 'education'];
}
