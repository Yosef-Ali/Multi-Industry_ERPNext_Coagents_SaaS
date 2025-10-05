/**
 * Orchestration Tools - Index
 *
 * Centralized exports for all orchestrator tools implementing
 * Claude Agent SDK best practices:
 * - Request classification and routing
 * - Subagent invocation and management
 * - Multi-agent result aggregation
 * - Deep research initiation
 *
 * Part of Claude Agent SDK orchestrator-worker pattern
 */

// Classification
export {
  classifyRequest,
  classifyRequestTool,
  type ClassificationRequest,
  type ClassificationResult
} from "./classify.js";

// Subagent loader and management
export {
  loadSubagentConfig,
  loadAllSubagents,
  getSubagentConfig,
  getMCPServersForSubagent,
  validateSubagentConfig,
  getSubagentStats,
  type SubagentConfig,
  type SubagentRegistry
} from "./subagent-loader.js";

// Subagent invocation
export {
  invokeSubagent,
  streamSubagent,
  invokeSubagentTool,
  type InvokeSubagentRequest,
  type InvokeSubagentResult,
  type SubagentEvent
} from "./invoke.js";

// Result aggregation
export {
  aggregateResults,
  detectConflicts,
  calculateAggregationConfidence,
  aggregateResultsTool,
  type AggregateRequest,
  type AggregatedResult
} from "./aggregate.js";

// Deep research
export {
  initiateDeepResearch,
  initiateDeepResearchTool,
  type DeepResearchRequest,
  type DeepResearchResult,
  type ResearchFinding
} from "./deep-research.js";

// Import tools for registry
import { classifyRequestTool } from "./classify.js";
import { invokeSubagentTool } from "./invoke.js";
import { aggregateResultsTool } from "./aggregate.js";
import { initiateDeepResearchTool } from "./deep-research.js";

/**
 * Get all orchestration tool definitions for Claude Agent SDK
 */
export function getAllOrchestrationTools() {
  return [
    classifyRequestTool,
    invokeSubagentTool,
    aggregateResultsTool,
    initiateDeepResearchTool
  ];
}

/**
 * Orchestration tool registry
 */
export const ORCHESTRATION_TOOLS = {
  classify_request: classifyRequestTool,
  invoke_subagent: invokeSubagentTool,
  aggregate_results: aggregateResultsTool,
  initiate_deep_research: initiateDeepResearchTool
} as const;

/**
 * Check if a tool is an orchestration tool
 */
export function isOrchestrationTool(toolName: string): boolean {
  return toolName in ORCHESTRATION_TOOLS;
}
