/**
 * T079: Anthropic Messages API with Streaming and Tool Use Loop
 * Implements real-time streaming, multi-turn tool use, and approval gate integration
 */

import Anthropic from '@anthropic-ai/sdk';
import { ToolRegistry, ToolDefinition } from './tools/registry';
import { AGUIStreamEmitter } from './streaming';
import { CoagentSession } from './session';
import { FrappeAPIClient } from './api';
import { randomUUID } from 'crypto';

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
 * Tool executor interface
 */
export interface ToolExecutor {
  execute(
    toolName: string,
    input: any,
    stream: AGUIStreamEmitter
  ): Promise<any>;
}

/**
 * Anthropic tool definition format (JSON Schema)
 */
interface AnthropicToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

/**
 * Agent wrapper around Anthropic Messages API
 * Implements streaming and multi-turn tool use loop
 */
export class Agent {
  private client: Anthropic;
  private tools: AnthropicToolDefinition[];
  private systemPrompt: string;
  private conversationHistory: Anthropic.MessageParam[] = [];

  constructor(config: {
    client: Anthropic;
    tools: AnthropicToolDefinition[];
    systemPrompt: string;
  }) {
    this.client = config.client;
    this.tools = config.tools;
    this.systemPrompt = config.systemPrompt;
  }

  /**
   * Main chat method with tool use loop
   */
  async chat(
    message: string,
    stream: AGUIStreamEmitter,
    toolExecutor: ToolExecutor
  ): Promise<void> {
    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      content: message
    });

    // Multi-turn tool use loop
    let continueLoop = true;
    let iterationCount = 0;
    const MAX_ITERATIONS = 10; // Prevent infinite loops

    while (continueLoop && iterationCount < MAX_ITERATIONS) {
      iterationCount++;
      continueLoop = await this.executeOneTurn(stream, toolExecutor);
    }

    if (iterationCount >= MAX_ITERATIONS) {
      stream.emitError(
        'max_iterations_exceeded',
        'Conversation exceeded maximum iterations. Please try rephrasing your request.'
      );
    }
  }

  /**
   * Execute one turn of the conversation
   * Returns true if more tool calls are needed
   */
  private async executeOneTurn(
    stream: AGUIStreamEmitter,
    toolExecutor: ToolExecutor
  ): Promise<boolean> {
    // Start streaming from Claude
    const messageStream = this.client.messages.stream({
      model: process.env.OPENROUTER_MODEL || 'zhipu/glm-4-9b-chat',
      max_tokens: 4096,
      system: this.systemPrompt,
      messages: this.conversationHistory,
      tools: this.tools as any
    });

    // Track tool calls and assistant message
    const toolCalls: Array<{ id: string; name: string; input: any }> = [];
    const contentBlocks: any[] = [];

    // Handle streaming events
    messageStream
      .on('text', (textDelta: string) => {
        // Emit text delta to frontend
        stream.emit('message', {
          delta: { type: 'text_delta', text: textDelta }
        });
      })
      .on('contentBlock', (block: any) => {
        if (block.type === 'tool_use') {
          // Claude wants to use a tool
          toolCalls.push({
            id: block.id,
            name: block.name,
            input: block.input
          });

          // Emit tool call to frontend
          stream.emit('tool_call', {
            tool_id: block.id,
            tool_name: block.name,
            input: block.input
          });
        }
        contentBlocks.push(block);
      })
      .on('error', (error: any) => {
        stream.emitError('anthropic_error', error.message || 'An error occurred');
        throw error;
      });

    // Wait for completion
    const finalMessage = await messageStream.finalMessage();

    // Add assistant response to history
    this.conversationHistory.push({
      role: 'assistant',
      content: finalMessage.content
    });

    // If no tool calls, we're done
    if (toolCalls.length === 0) {
      stream.emitStatus('completed', 'Response complete');
      return false; // Stop loop
    }

    // Execute all tool calls and collect results
    const toolResults = await Promise.all(
      toolCalls.map(async (call) => {
        try {
          // Execute the tool (handles approval gates internally)
          const result = await toolExecutor.execute(
            call.name,
            call.input,
            stream
          );

          // Emit result to frontend
          stream.emit('tool_result', {
            tool_id: call.id,
            tool_name: call.name,
            result
          });

          return {
            type: 'tool_result' as const,
            tool_use_id: call.id,
            content: JSON.stringify(result)
          };
        } catch (error: any) {
          // Tool execution failed
          stream.emit('tool_result', {
            tool_id: call.id,
            tool_name: call.name,
            error: error.message,
            is_error: true
          });

          return {
            type: 'tool_result' as const,
            tool_use_id: call.id,
            content: JSON.stringify({ error: error.message }),
            is_error: true
          };
        }
      })
    );

    // Add tool results to history
    this.conversationHistory.push({
      role: 'user',
      content: toolResults as any
    });

    // Continue loop to let Claude respond to tool results
    return true;
  }

  /**
   * Get conversation history (for debugging/logging)
   */
  getConversationHistory(): Anthropic.MessageParam[] {
    return [...this.conversationHistory];
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }
}

/**
 * ERPNext Tool Executor
 * Executes tools with approval gate integration
 */
export class ERPNextToolExecutor implements ToolExecutor {
  private toolRegistry: ToolRegistry;
  private apiClient: FrappeAPIClient;
  private session: CoagentSession;
  private approvalResolvers: Map<string, (approved: boolean) => void> = new Map();

  constructor(
    toolRegistry: ToolRegistry,
    apiClient: FrappeAPIClient,
    session: CoagentSession
  ) {
    this.toolRegistry = toolRegistry;
    this.apiClient = apiClient;
    this.session = session;
  }

  async execute(
    toolName: string,
    input: any,
    stream: AGUIStreamEmitter
  ): Promise<any> {
    // Get tool definition
    const tool = this.toolRegistry.getTool(toolName);
    if (!tool) {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    // Assess risk
    const risk = this.toolRegistry.assessToolRisk(toolName, input);

    // Check if approval is required
    if (risk.requires_approval) {
      const approved = await this.waitForApproval(
        toolName,
        input,
        risk,
        stream
      );

      if (!approved) {
        throw new Error('User cancelled the operation');
      }
    }

    // Execute the tool
    const result = await this.toolRegistry.executeTool(
      toolName,
      input,
      this.apiClient,
      this.session.user_id,
      this.session.session_id
    );

    return result;
  }

  private async waitForApproval(
    toolName: string,
    input: any,
    risk: any,
    stream: AGUIStreamEmitter
  ): Promise<boolean> {
    // Generate unique prompt ID
    const promptId = randomUUID();

    // Emit approval prompt to frontend
    stream.emit('ui_prompt', {
      prompt_id: promptId,
      type: 'approval',
      details: {
        operation: toolName,
        input,
        risk_level: risk.level,
        risk_reasoning: risk.reasoning,
        preview: this.generatePreview(toolName, input)
      }
    });

    // Wait for user response (will be resolved by handleApprovalResponse)
    return new Promise((resolve) => {
      this.approvalResolvers.set(promptId, resolve);
    });
  }

  private generatePreview(toolName: string, input: any): string {
    // Generate human-readable preview of the action
    switch (toolName) {
      case 'create_doc':
        return `Create new ${input.doctype}:\n${JSON.stringify(input.doc, null, 2)}`;
      case 'update_doc':
        return `Update ${input.doctype} ${input.name}:\n${JSON.stringify(input.doc, null, 2)}`;
      case 'submit_doc':
        return `Submit ${input.doctype}: ${input.name}`;
      case 'cancel_doc':
        return `Cancel ${input.doctype}: ${input.name}`;
      default:
        return JSON.stringify(input, null, 2);
    }
  }

  /**
   * Resolve approval (called by handleApprovalResponse)
   */
  resolveApproval(promptId: string, approved: boolean): void {
    const resolver = this.approvalResolvers.get(promptId);
    if (resolver) {
      resolver(approved);
      this.approvalResolvers.delete(promptId);
    }
  }
}

/**
 * Convert internal tool definitions to Anthropic format
 */
function convertToAnthropicTools(tools: ToolDefinition[]): AnthropicToolDefinition[] {
  return tools.map(tool => {
    // Convert Zod schema to JSON Schema
    // For now, we'll use a simplified approach
    // TODO: Implement proper Zod to JSON Schema conversion
    return {
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: 'object',
        properties: {}, // TODO: Extract from Zod schema
        required: []
      }
    };
  });
}

/**
 * Create Claude Agent with tools for session
 */
export async function createCoagent(config: CoagentConfig): Promise<{
  agent: Agent;
  toolExecutor: ERPNextToolExecutor;
}> {
  const { session, stream, erpApiKey, erpApiSecret, erpBaseUrl } = config;

  // Get tools based on enabled industries
  const toolRegistry = new ToolRegistry(session.enabled_industries);
  const tools = toolRegistry.getAllTools();

  console.log(
    `[Agent] Creating agent for session ${session.session_id} with ${tools.length} tools`
  );
  console.log(
    `[Agent] Enabled industries: ${session.enabled_industries.join(', ') || 'common only'}`
  );

  // Convert tools to Anthropic format
  const anthropicTools = convertToAnthropicTools(tools);

  // Build system prompt based on context
  const systemPrompt = buildSystemPrompt(session);

  // Create OpenRouter client (Anthropic-compatible)
  const anthropicClient = new Anthropic({
    apiKey: process.env.OPENROUTER_API_KEY || '',
    baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1',
  });

  // Create agent instance
  const agent = new Agent({
    client: anthropicClient,
    tools: anthropicTools,
    systemPrompt,
  });

  // Create tool executor
  const { createFrappeClientWithAPIKey } = await import('./api');
  const apiClient = createFrappeClientWithAPIKey(
    erpBaseUrl,
    erpApiKey,
    erpApiSecret
  );

  const toolExecutor = new ERPNextToolExecutor(
    toolRegistry,
    apiClient,
    session
  );

  return { agent, toolExecutor };
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
  toolExecutor: ERPNextToolExecutor,
  message: string,
  stream: AGUIStreamEmitter
): Promise<void> {
  try {
    // Emit processing status
    stream.emitStatus('processing', 'Processing your request...');

    // Execute agent with tool use loop
    await agent.chat(message, stream, toolExecutor);

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
  toolExecutor: ERPNextToolExecutor,
  promptId: string,
  response: 'approve' | 'cancel',
  stream: AGUIStreamEmitter
): Promise<void> {
  try {
    // Emit user response
    stream.emit('ui_response', {
      prompt_id: promptId,
      response
    });

    if (response === 'approve') {
      // Resume tool execution with approval
      stream.emitStatus('processing', 'Executing approved action...');
      toolExecutor.resolveApproval(promptId, true);
      stream.emitStatus('completed', 'Action completed successfully');
    } else {
      // Cancel tool execution
      stream.emitStatus('cancelled', 'Action cancelled by user');
      toolExecutor.resolveApproval(promptId, false);
      stream.emit('message', {
        role: 'assistant',
        content: 'Understood. The action has been cancelled.'
      });
    }
  } catch (error: any) {
    console.error('[Agent] Approval handling error:', error);
    stream.emitError('approval_error', 'Failed to process approval response');
    throw error;
  }
}
