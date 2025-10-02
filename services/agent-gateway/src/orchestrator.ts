/**
 * ERPNext Orchestrator Agent
 *
 * Master agent implementing Claude Agent SDK orchestrator-worker pattern:
 * - Classifies user requests (industry, complexity)
 * - Routes to specialized subagents
 * - Aggregates multi-agent results
 * - Manages approval workflow
 * - Coordinates deep research
 *
 * Implements T163: Subagent invocation with context preservation
 */

import Anthropic from "@anthropic-ai/sdk";
import {
  loadAllSubagents,
  classifyRequest,
  invokeSubagent,
  aggregateResults,
  initiateDeepResearch,
  type SubagentRegistry,
  type ClassificationResult,
  type InvokeSubagentResult
} from "./tools/orchestration/index.js";
import {
  createCompleteApprovalWorkflow,
  type ApprovalWorkflow
} from "./hooks/index.js";

export interface OrchestratorConfig {
  openRouterApiKey: string;
  agentsDir: string;
  availableMCPServers?: string[];
  auditLogger?: (entry: any) => void;
}

export interface OrchestratorContext {
  session_id: string;
  correlation_id: string;
  user_id?: string;
  current_doctype?: string;
  current_doc?: string;
  conversation_history?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}

export interface OrchestratorRequest {
  message: string;
  context: OrchestratorContext;
  stream?: boolean;
}

export interface OrchestratorResponse {
  response: string;
  classification?: ClassificationResult;
  subagents_used?: string[];
  execution_time_ms: number;
  success: boolean;
  error?: string;
}

/**
 * Orchestrator Agent - Master routing and coordination
 */
export class OrchestratorAgent {
  private config: OrchestratorConfig;
  private subagentRegistry: SubagentRegistry | null = null;
  private orchestratorConfig: any = null;
  private client: Anthropic;

  constructor(config: OrchestratorConfig) {
    this.config = config;
    this.client = new Anthropic({
      apiKey: config.openRouterApiKey,
      baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'
    });
  }

  /**
   * Initialize orchestrator - load subagent configurations
   */
  async initialize(): Promise<void> {
    console.log("Initializing orchestrator...");

    // Load all subagent configurations
    this.subagentRegistry = await loadAllSubagents(this.config.agentsDir);

    console.log(`Loaded ${Object.keys(this.subagentRegistry).length} subagents`);

    // Load orchestrator configuration
    const orchestratorPath = `${this.config.agentsDir}/orchestrator.md`;
    const { loadSubagentConfig } = await import("./tools/orchestration/index.js");
    this.orchestratorConfig = await loadSubagentConfig(orchestratorPath);

    console.log("Orchestrator initialized successfully");
  }

  /**
   * Process user request - main entry point
   */
  async processRequest(
    request: OrchestratorRequest,
    approvalWorkflow?: ApprovalWorkflow
  ): Promise<OrchestratorResponse> {
    const startTime = Date.now();

    if (!this.subagentRegistry) {
      throw new Error("Orchestrator not initialized. Call initialize() first.");
    }

    try {
      // Step 1: Classify request
      console.log(`[${request.context.correlation_id}] Classifying request...`);

      const classification = await classifyRequest(
        {
          request: request.message,
          current_doctype: request.context.current_doctype,
          conversation_history: request.context.conversation_history
        },
        this.config.openRouterApiKey
      );

      console.log(`[${request.context.correlation_id}] Classification:`, {
        industry: classification.industry,
        complexity: classification.complexity,
        routing: classification.routing_decision,
        confidence: classification.confidence
      });

      // Step 2: Route based on classification
      let response: string;
      let subagentsUsed: string[] = [];

      switch (classification.routing_decision) {
        case "direct":
          // Handle directly with orchestrator
          response = await this.handleDirect(request, classification);
          break;

        case "delegate":
          // Delegate to single subagent
          const delegateResult = await this.delegateToSubagent(
            request,
            classification.requires_subagents[0],
            approvalWorkflow
          );
          response = delegateResult.final_response || "No response from subagent";
          subagentsUsed = [delegateResult.subagent];
          break;

        case "deep_research":
          // Initiate deep research
          const researchResult = await this.conductDeepResearch(
            request,
            classification
          );
          response = researchResult.executive_summary;
          subagentsUsed = ["deep-research"];
          break;

        case "multi_industry":
          // Invoke multiple subagents in parallel
          const multiResults = await this.invokeMultipleSubagents(
            request,
            classification.requires_subagents,
            approvalWorkflow
          );

          // Aggregate results
          const aggregated = await aggregateResults(
            {
              subagent_results: multiResults,
              original_query: request.message,
              aggregation_strategy: "synthesis"
            },
            this.config.openRouterApiKey
          );

          response = aggregated.synthesis;
          subagentsUsed = aggregated.sources;
          break;

        default:
          throw new Error(`Unknown routing decision: ${classification.routing_decision}`);
      }

      return {
        response,
        classification,
        subagents_used: subagentsUsed,
        execution_time_ms: Date.now() - startTime,
        success: true
      };

    } catch (error) {
      console.error(`[${request.context.correlation_id}] Orchestrator error:`, error);

      return {
        response: `Error processing request: ${String(error)}`,
        execution_time_ms: Date.now() - startTime,
        success: false,
        error: String(error)
      };
    }
  }

  /**
   * Handle request directly (simple queries)
   */
  private async handleDirect(
    request: OrchestratorRequest,
    classification: ClassificationResult
  ): Promise<string> {
    // For simple queries, use orchestrator's own capabilities
    // This would typically use common tools directly

    const prompt = `${request.message}\n\nContext: ${JSON.stringify(request.context)}`;

    const response = await this.client.messages.create({
      model: this.orchestratorConfig?.model || process.env.OPENROUTER_MODEL || "zhipu/glm-4-9b-chat",
      max_tokens: 2048,
      system: this.orchestratorConfig?.systemPrompt || "You are a helpful ERPNext assistant.",
      messages: [
        {
          role: "user",
          content: prompt
        }
      ]
    });

    const text = response.content[0].type === "text"
      ? response.content[0].text
      : "";

    return text;
  }

  /**
   * Delegate to single subagent
   */
  private async delegateToSubagent(
    request: OrchestratorRequest,
    subagentName: string,
    approvalWorkflow?: ApprovalWorkflow
  ): Promise<InvokeSubagentResult> {
    if (!this.subagentRegistry) {
      throw new Error("Subagent registry not loaded");
    }

    console.log(`[${request.context.correlation_id}] Delegating to ${subagentName}...`);

    const result = await invokeSubagent(
      {
        subagent: subagentName,
        task: request.message,
        context: {
          current_doc: request.context.current_doc,
          current_doctype: request.context.current_doctype,
          user_role: request.context.user_id,
          session_id: request.context.session_id,
          correlation_id: request.context.correlation_id
        }
      },
      this.subagentRegistry,
      this.config.openRouterApiKey,
      this.config.availableMCPServers
    );

    return result;
  }

  /**
   * Conduct deep research investigation
   */
  private async conductDeepResearch(
    request: OrchestratorRequest,
    classification: ClassificationResult
  ) {
    if (!this.subagentRegistry) {
      throw new Error("Subagent registry not loaded");
    }

    console.log(`[${request.context.correlation_id}] Initiating deep research...`);

    // Parse research scope from request
    const scope = this.parseResearchScope(request.message);

    const result = await initiateDeepResearch(
      {
        research_question: request.message,
        scope,
        verification_required: true,
        include_recommendations: true
      },
      this.subagentRegistry,
      this.config.openRouterApiKey,
      this.config.availableMCPServers
    );

    return result;
  }

  /**
   * Invoke multiple subagents in parallel
   */
  private async invokeMultipleSubagents(
    request: OrchestratorRequest,
    subagentNames: string[],
    approvalWorkflow?: ApprovalWorkflow
  ): Promise<InvokeSubagentResult[]> {
    if (!this.subagentRegistry) {
      throw new Error("Subagent registry not loaded");
    }

    console.log(`[${request.context.correlation_id}] Invoking ${subagentNames.length} subagents in parallel...`);

    // Invoke all subagents in parallel
    const promises = subagentNames.map(subagentName =>
      this.delegateToSubagent(request, subagentName, approvalWorkflow)
    );

    const results = await Promise.all(promises);

    return results;
  }

  /**
   * Parse research scope from natural language request
   */
  private parseResearchScope(message: string): any {
    const scope: any = {};

    // Extract time period mentions
    const timePatterns = [
      /last\s+(\d+)\s+(day|week|month|year)s?/i,
      /this\s+(week|month|quarter|year)/i,
      /in\s+(\w+\s+\d{4})/i // e.g., "in September 2024"
    ];

    for (const pattern of timePatterns) {
      const match = message.match(pattern);
      if (match) {
        // Would implement actual date parsing here
        scope.time_period = {
          start_date: "2025-09-01",
          end_date: "2025-09-30"
        };
        break;
      }
    }

    // Extract module mentions
    const modules: string[] = [];
    if (message.toLowerCase().includes("hospital") || message.toLowerCase().includes("healthcare")) {
      modules.push("Healthcare");
    }
    if (message.toLowerCase().includes("hotel") || message.toLowerCase().includes("hospitality")) {
      modules.push("Hotel");
    }
    if (message.toLowerCase().includes("manufacturing") || message.toLowerCase().includes("production")) {
      modules.push("Manufacturing");
    }
    if (message.toLowerCase().includes("retail") || message.toLowerCase().includes("sales")) {
      modules.push("Selling");
    }
    if (message.toLowerCase().includes("inventory") || message.toLowerCase().includes("stock")) {
      modules.push("Stock");
    }

    if (modules.length > 0) {
      scope.modules = modules;
    }

    return scope;
  }

  /**
   * Get subagent registry statistics
   */
  getSubagentStats() {
    if (!this.subagentRegistry) {
      return null;
    }

    const { getSubagentStats } = require("./tools/orchestration/index.js");
    return getSubagentStats(this.subagentRegistry);
  }

  /**
   * Health check
   */
  async healthCheck(): Promise<{ healthy: boolean; details: any }> {
    try {
      const stats = this.getSubagentStats();

      return {
        healthy: this.subagentRegistry !== null,
        details: {
          subagents_loaded: stats?.totalSubagents || 0,
          orchestrator_loaded: this.orchestratorConfig !== null,
          subagent_stats: stats
        }
      };
    } catch (error) {
      return {
        healthy: false,
        details: {
          error: String(error)
        }
      };
    }
  }
}

/**
 * Factory function to create orchestrator
 */
export async function createOrchestrator(
  config: OrchestratorConfig
): Promise<OrchestratorAgent> {
  const orchestrator = new OrchestratorAgent(config);
  await orchestrator.initialize();
  return orchestrator;
}

/**
 * Streaming orchestrator response
 */
export async function* streamOrchestratorResponse(
  orchestrator: OrchestratorAgent,
  request: OrchestratorRequest,
  approvalWorkflow?: ApprovalWorkflow
): AsyncGenerator<any> {
  // Yield classification event
  yield {
    type: "classification_start",
    timestamp: Date.now()
  };

  // Process request
  const result = await orchestrator.processRequest(request, approvalWorkflow);

  // Yield classification result
  if (result.classification) {
    yield {
      type: "classification_complete",
      data: result.classification,
      timestamp: Date.now()
    };
  }

  // Yield subagent events
  if (result.subagents_used && result.subagents_used.length > 0) {
    yield {
      type: "subagents_invoked",
      data: {
        subagents: result.subagents_used
      },
      timestamp: Date.now()
    };
  }

  // Yield final response
  yield {
    type: "response_complete",
    data: {
      response: result.response,
      execution_time_ms: result.execution_time_ms
    },
    timestamp: Date.now()
  };

  // Yield completion
  yield {
    type: "orchestration_complete",
    timestamp: Date.now()
  };
}
