/**
 * T145: Agent with Universal AI Provider Support
 * Updated agent implementation using the universal provider system
 */

import { IAIProvider, AIMessage, AIToolDefinition, StreamEventHandler } from './ai';
import { ToolRegistry, ToolDefinition } from './tools/registry';
import { AGUIStreamEmitter } from './streaming';
import { CoagentSession } from './session';
import { FrappeAPIClient } from './api';
import { randomUUID } from 'crypto';

/**
 * Agent configuration
 */
export interface UniversalCoagentConfig {
  session: CoagentSession;
  stream: AGUIStreamEmitter;
  erpApiKey: string;
  erpApiSecret: string;
  erpBaseUrl: string;
  aiProvider: IAIProvider; // Universal AI provider
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
 * Universal Agent using IAIProvider interface
 * Works with any AI provider (OpenRouter, Cloudflare, etc.)
 */
export class UniversalAgent {
  private provider: IAIProvider;
  private tools: AIToolDefinition[];
  private systemPrompt: string;
  private conversationHistory: AIMessage[] = [];

  constructor(config: {
    provider: IAIProvider;
    tools: AIToolDefinition[];
    systemPrompt: string;
  }) {
    this.provider = config.provider;
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
      content: message,
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
    // Create stream handler
    const toolCalls: Array<{ id: string; name: string; input: any }> = [];

    const streamHandler: StreamEventHandler = (event) => {
      if (event.type === 'text_delta') {
        // Emit text delta to frontend
        stream.emit('message', {
          delta: { type: 'text_delta', text: event.text },
        });
      } else if (event.type === 'tool_use_start') {
        // Track tool call
        toolCalls.push({
          id: event.id,
          name: event.name,
          input: {}, // Will be populated by tool_input_delta
        });

        // Emit tool call to frontend
        stream.emit('tool_call', {
          tool_id: event.id,
          tool_name: event.name,
          input: {},
        });
      } else if (event.type === 'tool_input_delta') {
        // Update tool call input
        const toolCall = toolCalls.find((tc) => tc.id === event.id);
        if (toolCall) {
          toolCall.input = event.input;
        }
      }
    };

    // Call provider with streaming
    const response = await this.provider.complete(this.conversationHistory, {
      tools: this.tools,
      system: this.systemPrompt,
      maxTokens: 4096,
      stream: true,
      onStream: streamHandler,
    });

    // Add assistant response to history
    this.conversationHistory.push({
      role: 'assistant',
      content: response.content,
    });

    // Check for tool use
    const toolUseBlocks = response.content.filter(
      (block) => block.type === 'tool_use'
    );

    // If no tool calls, we're done
    if (toolUseBlocks.length === 0) {
      stream.emitStatus('completed', 'Response complete');
      return false; // Stop loop
    }

    // Execute all tool calls and collect results
    const toolResults = await Promise.all(
      toolUseBlocks.map(async (block: any) => {
        try {
          // Execute the tool (handles approval gates internally)
          const result = await toolExecutor.execute(block.name, block.input, stream);

          // Emit result to frontend
          stream.emit('tool_result', {
            tool_id: block.id,
            tool_name: block.name,
            result,
          });

          return {
            type: 'tool_result' as const,
            tool_use_id: block.id,
            content: JSON.stringify(result),
          };
        } catch (error: any) {
          // Tool execution failed
          stream.emit('tool_result', {
            tool_id: block.id,
            tool_name: block.name,
            error: error.message,
            is_error: true,
          });

          return {
            type: 'tool_result' as const,
            tool_use_id: block.id,
            content: JSON.stringify({ error: error.message }),
            is_error: true,
          };
        }
      })
    );

    // Add tool results to history
    this.conversationHistory.push({
      role: 'user',
      content: toolResults as any,
    });

    // Continue loop to let model respond to tool results
    return true;
  }

  /**
   * Get conversation history (for debugging/logging)
   */
  getConversationHistory(): AIMessage[] {
    return [...this.conversationHistory];
  }

  /**
   * Clear conversation history
   */
  clearHistory(): void {
    this.conversationHistory = [];
  }

  /**
   * Get provider info
   */
  getProviderInfo() {
    return {
      name: this.provider.name,
      model: this.provider.model,
      pricing: this.provider.getModelPricing(),
    };
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
      const approved = await this.waitForApproval(toolName, input, risk, stream);

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
        preview: this.generatePreview(toolName, input),
      },
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
 * Convert internal tool definitions to universal format
 */
function convertToUniversalTools(tools: ToolDefinition[]): AIToolDefinition[] {
  return tools.map((tool) => {
    // Convert Zod schema to JSON Schema
    // For now, we'll use a simplified approach
    // TODO: Implement proper Zod to JSON Schema conversion
    return {
      name: tool.name,
      description: tool.description,
      input_schema: {
        type: 'object',
        properties: {}, // TODO: Extract from Zod schema
        required: [],
      },
    };
  });
}

/**
 * Create Universal Agent with tools for session
 */
export async function createUniversalCoagent(
  config: UniversalCoagentConfig
): Promise<{
  agent: UniversalAgent;
  toolExecutor: ERPNextToolExecutor;
}> {
  const { session, stream, erpApiKey, erpApiSecret, erpBaseUrl, aiProvider } = config;

  // Get tools based on enabled industries
  const toolRegistry = new ToolRegistry(session.enabled_industries);
  const tools = toolRegistry.getAllTools();

  console.log(
    `[UniversalAgent] Creating agent for session ${session.session_id} with ${tools.length} tools`
  );
  console.log(
    `[UniversalAgent] Enabled industries: ${session.enabled_industries.join(', ') || 'common only'}`
  );
  console.log(`[UniversalAgent] AI Provider: ${aiProvider.name} | Model: ${aiProvider.model}`);

  // Convert tools to universal format
  const universalTools = convertToUniversalTools(tools);

  // Build system prompt based on context
  const systemPrompt = buildSystemPrompt(session);

  // Create agent instance
  const agent = new UniversalAgent({
    provider: aiProvider,
    tools: universalTools,
    systemPrompt,
  });

  // Create tool executor
  const { createFrappeClientWithAPIKey } = await import('./api');
  const apiClient = createFrappeClientWithAPIKey(erpBaseUrl, erpApiKey, erpApiSecret);

  const toolExecutor = new ERPNextToolExecutor(toolRegistry, apiClient, session);

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
export async function executeUniversalAgent(
  agent: UniversalAgent,
  toolExecutor: ERPNextToolExecutor,
  message: string,
  stream: AGUIStreamEmitter
): Promise<void> {
  try {
    // Emit processing status
    stream.emitStatus('processing', 'Processing your request...');

    // Log provider info
    const providerInfo = agent.getProviderInfo();
    console.log(
      `[UniversalAgent] Using ${providerInfo.name} (${providerInfo.model}) | ` +
      `Cost: $${providerInfo.pricing.inputCostPer1K}/1K input, $${providerInfo.pricing.outputCostPer1K}/1K output`
    );

    // Execute agent with tool use loop
    await agent.chat(message, stream, toolExecutor);

    // Emit completion status
    stream.emitStatus('completed', 'Request completed successfully');
  } catch (error: any) {
    console.error('[UniversalAgent] Execution error:', error);

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
export async function handleUniversalApprovalResponse(
  toolExecutor: ERPNextToolExecutor,
  promptId: string,
  response: 'approve' | 'cancel',
  stream: AGUIStreamEmitter
): Promise<void> {
  try {
    // Emit user response
    stream.emit('ui_response', {
      prompt_id: promptId,
      response,
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
        content: 'Understood. The action has been cancelled.',
      });
    }
  } catch (error: any) {
    console.error('[UniversalAgent] Approval handling error:', error);
    stream.emitError('approval_error', 'Failed to process approval response');
    throw error;
  }
}
