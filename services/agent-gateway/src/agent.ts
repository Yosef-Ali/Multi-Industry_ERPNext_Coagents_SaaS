/**
 * T079: Claude Agent SDK Initialization with Tool Registry
 * Initialize Claude Agent with dynamic tool loading based on enabled industries
 */

import { Agent, AgentConfig } from '@anthropic-ai/claude-agent-sdk';
import { getToolRegistry } from './tools/registry';
import { AGUIStreamEmitter } from './streaming';
import { CoagentSession } from './session';

/**
 * Agent configuration
 */
export interface CoagentConfig {
  session: CoagentSession;
  stream: AGUIStreamEmitter;
  erpApiKey: string;
  erpApiSecret: string;
  erpBaseUrl: string;
}

/**
 * Create Claude Agent with tools for session
 */
export async function createCoagent(config: CoagentConfig): Promise<Agent> {
  const { session, stream, erpApiKey, erpApiSecret, erpBaseUrl } = config;

  // Get tools based on enabled industries
  const tools = getToolRegistry(session.enabled_industries);

  console.log(
    `[Agent] Creating agent for session ${session.session_id} with ${tools.length} tools`
  );
  console.log(
    `[Agent] Enabled industries: ${session.enabled_industries.join(', ') || 'common only'}`
  );

  // Build system prompt based on context
  const systemPrompt = buildSystemPrompt(session);

  // Agent configuration
  const agentConfig: AgentConfig = {
    name: 'erpnext-coagent',
    description: 'ERPNext Coagent Assistant',
    tools,
    systemPrompt,
    secrets: {
      erp_api_key: erpApiKey,
      erp_api_secret: erpApiSecret,
      erp_base_url: erpBaseUrl,
    },
    // Stream callbacks for AG-UI integration
    callbacks: {
      onToolCall: (toolName: string, input: any, toolCallId?: string) => {
        stream.emitToolCall(toolName, input, toolCallId);
      },
      onToolResult: (toolName: string, result: any, success: boolean, toolCallId?: string) => {
        stream.emitToolResult(toolName, result, success, toolCallId);
      },
      onMessage: (content: string) => {
        stream.emitMessage('assistant', content);
      },
      onError: (error: any) => {
        stream.emitError('agent_error', error.message || 'Agent error occurred');
      },
    },
  };

  const agent = new Agent(agentConfig);

  return agent;
}

/**
 * Build system prompt based on session context
 */
function buildSystemPrompt(session: CoagentSession): string {
  const parts: string[] = [
    'You are an ERPNext Coagent Assistant, helping users interact with their ERPNext system through natural language.',
    '',
    '## Your Capabilities',
    'You can search, view, create, update, and submit ERPNext documents across multiple industries.',
    'You have access to reports, analytics, and industry-specific workflows.',
    '',
    '## Important Guidelines',
    '1. **Always confirm before write operations** - Creating, updating, submitting, or canceling documents requires user approval',
    "2. **Be precise with data** - When dealing with amounts, dates, or quantities, always verify the user's intent",
    '3. **Explain what you find** - When showing reports or documents, provide context and insights',
    '4. **Ask clarifying questions** - If a request is ambiguous, ask for clarification',
    '5. **Respect permissions** - Users can only perform actions they have permissions for in ERPNext',
    '',
  ];

  // Add context about current document
  if (session.doctype && session.doc_name) {
    parts.push('## Current Context');
    parts.push(`You are currently assisting with ${session.doctype}: ${session.doc_name}`);
    parts.push(
      'The user may ask questions about this document or request changes to it. Always reference the current document when relevant.'
    );
    parts.push('');
  }

  // Add industry-specific context
  if (session.enabled_industries.length > 0) {
    parts.push('## Enabled Industries');
    parts.push('You have access to specialized tools for the following industries:');
    parts.push('');

    if (session.enabled_industries.includes('hotel')) {
      parts.push(
        '- **Hotel Management**: Room availability, reservations, occupancy reports, guest management'
      );
    }
    if (session.enabled_industries.includes('hospital')) {
      parts.push(
        '- **Hospital/Healthcare**: Patient management, order sets, census reports, accounts receivable by payer'
      );
    }
    if (session.enabled_industries.includes('manufacturing')) {
      parts.push(
        '- **Manufacturing**: Material availability, BOM explosions, production planning, work orders'
      );
    }
    if (session.enabled_industries.includes('retail')) {
      parts.push(
        '- **Retail**: Inventory checks, sales analytics, order fulfillment, customer insights'
      );
    }
    if (session.enabled_industries.includes('education')) {
      parts.push(
        '- **Education**: Applicant workflows, admissions, interview scheduling, student management'
      );
    }

    parts.push('');
  }

  // Add response guidelines
  parts.push('## Response Style');
  parts.push('- Be concise but informative');
  parts.push('- Use formatting (tables, lists) when showing multiple items');
  parts.push('- Always include relevant document IDs or names for reference');
  parts.push('- Explain any technical terms or status codes');
  parts.push('');

  // Add approval workflow context
  parts.push('## Approval Workflow');
  parts.push(
    'For high-risk operations (creates, updates, submits, cancels), you will present a preview to the user for approval.'
  );
  parts.push(
    'The UI will show a confirmation dialog with the proposed changes. Wait for user approval before proceeding.'
  );
  parts.push('If the user cancels, acknowledge and ask if they want to modify the request.');
  parts.push('');

  // Add error handling guidance
  parts.push('## Error Handling');
  parts.push(
    'If a tool returns an error (permissions, validation, not found), explain the error clearly to the user.'
  );
  parts.push('Suggest alternative actions or ask for corrections when appropriate.');
  parts.push('Never expose technical stack traces or internal error details to users.');

  return parts.join('\n');
}

/**
 * Execute agent with user message
 */
export async function executeAgent(
  agent: Agent,
  message: string,
  stream: AGUIStreamEmitter
): Promise<void> {
  try {
    // Emit processing status
    stream.emitStatus('processing', 'Processing your request...');

    // Execute agent (SDK handles streaming via callbacks)
    await agent.chat(message);

    // Emit completion status
    stream.emitStatus('completed', 'Request completed successfully');
  } catch (error: any) {
    console.error('[Agent] Execution error:', error);

    // Emit error to stream
    stream.emitError(
      'agent_execution_error',
      'Failed to process your request. Please try again.',
      {
        message: error.message,
      }
    );

    throw error;
  }
}

/**
 * Handle approval response from user
 */
export async function handleApprovalResponse(
  agent: Agent,
  promptId: string,
  response: 'approve' | 'cancel',
  stream: AGUIStreamEmitter
): Promise<void> {
  try {
    // Emit user response
    stream.emitApprovalResponse(promptId, response);

    if (response === 'approve') {
      // Resume agent execution with approval
      stream.emitStatus('processing', 'Executing approved action...');
      await agent.resumeWithApproval(promptId);
      stream.emitStatus('completed', 'Action completed successfully');
    } else {
      // Cancel agent execution
      stream.emitStatus('cancelled', 'Action cancelled by user');
      await agent.cancel(promptId);
      stream.emitMessage('assistant', 'Understood. The action has been cancelled.');
    }
  } catch (error: any) {
    console.error('[Agent] Approval handling error:', error);
    stream.emitError('approval_error', 'Failed to process approval response');
    throw error;
  }
}
