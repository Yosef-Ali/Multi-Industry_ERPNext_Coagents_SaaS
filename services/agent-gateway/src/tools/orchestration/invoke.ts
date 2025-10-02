/**
 * invoke_subagent - Orchestrator tool for delegating tasks to specialized subagents
 *
 * Creates isolated subagent instances with:
 * - Specialized system prompts from /agents/*.md
 * - Industry-specific tool access
 * - Independent context windows
 * - Streaming response capability
 *
 * Part of Claude Agent SDK orchestrator-worker pattern (T152)
 */

import Anthropic from "@anthropic-ai/sdk";
import {
  loadSubagentConfig,
  getSubagentConfig,
  getMCPServersForSubagent,
  type SubagentConfig,
  type SubagentRegistry
} from "./subagent-loader.js";

export interface InvokeSubagentRequest {
  subagent: string;
  task: string;
  context?: {
    current_doc?: string;
    current_doctype?: string;
    user_role?: string;
    [key: string]: any;
  };
  stream?: boolean;
}

export interface SubagentEvent {
  type: "text" | "tool_use" | "tool_result" | "thinking" | "error" | "complete";
  content: any;
  timestamp: number;
}

export interface InvokeSubagentResult {
  subagent: string;
  task: string;
  events: SubagentEvent[];
  final_response?: string;
  tools_used: string[];
  context_used: any;
  execution_time_ms: number;
  success: boolean;
  error?: string;
}

/**
 * Invoke a specialized subagent to handle a task
 */
export async function invokeSubagent(
  input: InvokeSubagentRequest,
  subagentRegistry: SubagentRegistry,
  openRouterApiKey: string,
  availableMCPServers?: string[]
): Promise<InvokeSubagentResult> {
  const startTime = Date.now();
  const events: SubagentEvent[] = [];
  const toolsUsed = new Set<string>();

  try {
    // Get subagent configuration
    const config = getSubagentConfig(subagentRegistry, input.subagent);

    if (!config) {
      throw new Error(`Subagent not found: ${input.subagent}`);
    }

    // Determine required MCP servers for this subagent
    const requiredServers = getMCPServersForSubagent(config, availableMCPServers || []);

    // Build subagent prompt with context
    const subagentPrompt = buildSubagentPrompt(input.task, input.context || {});

    // Create OpenRouter client (Anthropic-compatible)
    const client = new Anthropic({
      apiKey: openRouterApiKey,
      baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'
    });

    // Get tool definitions for this subagent
    const tools = await getToolDefinitions(config.tools, requiredServers);

    // Execute subagent conversation
    const messages: Anthropic.MessageParam[] = [
      {
        role: "user",
        content: subagentPrompt
      }
    ];

    let finalResponse = "";
    let continueLoop = true;
    let turnCount = 0;
    const maxTurns = 10; // Prevent infinite loops

    while (continueLoop && turnCount < maxTurns) {
      turnCount++;

      const response = await client.messages.create({
        model: config.model,
        max_tokens: 4096,
        system: config.systemPrompt,
        messages,
        tools: tools.length > 0 ? tools : undefined
      });

      // Process response content
      for (const block of response.content) {
        if (block.type === "text") {
          events.push({
            type: "text",
            content: block.text,
            timestamp: Date.now()
          });
          finalResponse += block.text;

        } else if (block.type === "tool_use") {
          events.push({
            type: "tool_use",
            content: {
              tool_name: block.name,
              tool_input: block.input,
              tool_use_id: block.id
            },
            timestamp: Date.now()
          });
          toolsUsed.add(block.name);

          // Execute tool (mock for now - actual execution happens in agent runtime)
          const toolResult = await executeToolMock(block.name, block.input);

          events.push({
            type: "tool_result",
            content: {
              tool_use_id: block.id,
              result: toolResult
            },
            timestamp: Date.now()
          });

          // Add tool result to conversation
          messages.push({
            role: "assistant",
            content: response.content
          });
          messages.push({
            role: "user",
            content: [
              {
                type: "tool_result",
                tool_use_id: block.id,
                content: JSON.stringify(toolResult)
              }
            ]
          });
        }
      }

      // Check if conversation should continue
      if (response.stop_reason === "end_turn" || response.stop_reason === "max_tokens") {
        continueLoop = false;
      } else if (response.stop_reason === "tool_use") {
        // Continue to process tool results
        continueLoop = true;
      }
    }

    events.push({
      type: "complete",
      content: { turns: turnCount },
      timestamp: Date.now()
    });

    return {
      subagent: input.subagent,
      task: input.task,
      events,
      final_response: finalResponse,
      tools_used: Array.from(toolsUsed),
      context_used: input.context || {},
      execution_time_ms: Date.now() - startTime,
      success: true
    };

  } catch (error) {
    events.push({
      type: "error",
      content: { error: String(error) },
      timestamp: Date.now()
    });

    return {
      subagent: input.subagent,
      task: input.task,
      events,
      tools_used: Array.from(toolsUsed),
      context_used: input.context || {},
      execution_time_ms: Date.now() - startTime,
      success: false,
      error: String(error)
    };
  }
}

/**
 * Build prompt for subagent with context
 */
function buildSubagentPrompt(task: string, context: any): string {
  let prompt = task;

  // Add context information if available
  if (Object.keys(context).length > 0) {
    prompt += "\n\n## Context\n";

    if (context.current_doctype) {
      prompt += `- Current DocType: ${context.current_doctype}\n`;
    }

    if (context.current_doc) {
      prompt += `- Current Document: ${context.current_doc}\n`;
    }

    if (context.user_role) {
      prompt += `- User Role: ${context.user_role}\n`;
    }

    // Add any additional context
    const standardKeys = ["current_doctype", "current_doc", "user_role"];
    const additionalContext = Object.entries(context)
      .filter(([key]) => !standardKeys.includes(key));

    if (additionalContext.length > 0) {
      prompt += "\n## Additional Context\n";
      for (const [key, value] of additionalContext) {
        prompt += `- ${key}: ${JSON.stringify(value)}\n`;
      }
    }
  }

  return prompt;
}

/**
 * Get tool definitions for subagent based on allowed tools
 */
async function getToolDefinitions(
  allowedTools: string[],
  mcpServers: string[]
): Promise<Anthropic.Tool[]> {
  // In production, this would load actual tool schemas from MCP servers
  // For now, return mock tool definitions

  const toolDefinitions: Anthropic.Tool[] = [];

  // Common ERPNext tools
  if (allowedTools.includes("search_doc")) {
    toolDefinitions.push({
      name: "search_doc",
      description: "Search for documents in ERPNext",
      input_schema: {
        type: "object",
        properties: {
          doctype: { type: "string", description: "DocType to search" },
          filters: { type: "object", description: "Search filters" },
          fields: { type: "array", items: { type: "string" }, description: "Fields to return" },
          limit: { type: "number", description: "Max results" }
        },
        required: ["doctype"]
      }
    });
  }

  if (allowedTools.includes("get_doc")) {
    toolDefinitions.push({
      name: "get_doc",
      description: "Get a specific document from ERPNext",
      input_schema: {
        type: "object",
        properties: {
          doctype: { type: "string", description: "DocType name" },
          name: { type: "string", description: "Document name/ID" }
        },
        required: ["doctype", "name"]
      }
    });
  }

  if (allowedTools.includes("create_doc")) {
    toolDefinitions.push({
      name: "create_doc",
      description: "Create a new document in ERPNext",
      input_schema: {
        type: "object",
        properties: {
          doctype: { type: "string", description: "DocType name" },
          data: { type: "object", description: "Document data" }
        },
        required: ["doctype", "data"]
      }
    });
  }

  // Workflow bridge tool
  if (allowedTools.includes("execute_workflow_graph")) {
    toolDefinitions.push({
      name: "execute_workflow_graph",
      description: "Execute industry-specific LangGraph workflow",
      input_schema: {
        type: "object",
        properties: {
          graph_name: {
            type: "string",
            description: "Workflow graph name",
            enum: [
              "hotel_o2c",
              "hospital_admissions",
              "manufacturing_mto",
              "retail_order_fulfillment",
              "education_admissions"
            ]
          },
          initial_state: {
            type: "object",
            description: "Initial workflow state"
          }
        },
        required: ["graph_name", "initial_state"]
      }
    });
  }

  // Industry-specific tools would be added here based on allowedTools
  // This is simplified for now

  return toolDefinitions;
}

/**
 * Mock tool execution (in production, this would call actual MCP tools)
 */
async function executeToolMock(toolName: string, input: any): Promise<any> {
  // Simulate tool execution delay
  await new Promise(resolve => setTimeout(resolve, 100));

  // Return mock results based on tool type
  switch (toolName) {
    case "search_doc":
      return {
        success: true,
        data: [
          { name: "DOC-001", title: "Sample Document" }
        ],
        count: 1
      };

    case "get_doc":
      return {
        success: true,
        data: {
          name: input.name,
          doctype: input.doctype,
          creation: "2025-10-02",
          modified: "2025-10-02"
        }
      };

    case "execute_workflow_graph":
      return {
        success: true,
        graph: input.graph_name,
        final_state: {
          ...input.initial_state,
          status: "completed",
          steps_completed: ["step_1", "step_2", "step_3"]
        },
        execution_time_ms: 2500
      };

    default:
      return {
        success: true,
        message: `Tool ${toolName} executed successfully`
      };
  }
}

/**
 * Stream subagent execution (for real-time updates)
 */
export async function* streamSubagent(
  input: InvokeSubagentRequest,
  registry: SubagentRegistry,
  openRouterApiKey: string,
  availableMCPServers: string[] = []
): AsyncGenerator<SubagentEvent> {
  const config = getSubagentConfig(registry, input.subagent);

  if (!config) {
    yield {
      type: "error",
      content: { error: `Subagent not found: ${input.subagent}` },
      timestamp: Date.now()
    };
    return;
  }

  const client = new Anthropic({
    apiKey: openRouterApiKey,
    baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'
  });
  const subagentPrompt = buildSubagentPrompt(input.task, input.context || {});
  const tools = await getToolDefinitions(config.tools, availableMCPServers);

  try {
    const stream = await client.messages.stream({
      model: config.model,
      max_tokens: 4096,
      system: config.systemPrompt,
      messages: [{ role: "user", content: subagentPrompt }],
      tools: tools.length > 0 ? tools : undefined
    });

    for await (const event of stream) {
      if (event.type === "content_block_delta") {
        if (event.delta.type === "text_delta") {
          yield {
            type: "text",
            content: event.delta.text,
            timestamp: Date.now()
          };
        }
      } else if (event.type === "content_block_start") {
        if (event.content_block.type === "tool_use") {
          yield {
            type: "tool_use",
            content: {
              tool_name: event.content_block.name,
              tool_use_id: event.content_block.id
            },
            timestamp: Date.now()
          };
        }
      }
    }

    yield {
      type: "complete",
      content: {},
      timestamp: Date.now()
    };

  } catch (error) {
    yield {
      type: "error",
      content: { error: String(error) },
      timestamp: Date.now()
    };
  }
}

/**
 * Tool definition for Claude Agent SDK
 */
export const invokeSubagentTool = {
  name: "invoke_subagent",
  description: "Delegate task to specialized industry subagent with isolated context",
  input_schema: {
    type: "object",
    properties: {
      subagent: {
        type: "string",
        description: "Subagent name",
        enum: [
          "hotel-specialist",
          "hospital-specialist",
          "manufacturing-specialist",
          "retail-specialist",
          "education-specialist",
          "deep-research"
        ]
      },
      task: {
        type: "string",
        description: "Task description for the subagent"
      },
      context: {
        type: "object",
        description: "Additional context (current document, user role, etc.)",
        properties: {
          current_doc: { type: "string" },
          current_doctype: { type: "string" },
          user_role: { type: "string" }
        }
      },
      stream: {
        type: "boolean",
        description: "Enable streaming responses (default: false)"
      }
    },
    required: ["subagent", "task"]
  }
};
