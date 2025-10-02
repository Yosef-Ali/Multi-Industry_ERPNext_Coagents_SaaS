/**
 * aggregate_results - Orchestrator tool for combining multi-subagent results
 *
 * Synthesizes results from multiple subagents into a coherent response:
 * - Combines findings from parallel subagent execution
 * - Resolves conflicts and inconsistencies
 * - Provides unified summary
 * - Maintains source attribution
 *
 * Part of Claude Agent SDK orchestrator-worker pattern (T153)
 */

import Anthropic from "@anthropic-ai/sdk";
import type { InvokeSubagentResult } from "./invoke.js";

export interface AggregateRequest {
  subagent_results: InvokeSubagentResult[];
  original_query: string;
  aggregation_strategy?: "synthesis" | "comparison" | "consolidation";
  include_sources?: boolean;
}

export interface AggregatedResult {
  synthesis: string;
  sources: string[];
  findings_by_subagent: {
    [subagent: string]: {
      summary: string;
      tools_used: string[];
      execution_time_ms: number;
    };
  };
  conflicts?: Array<{
    issue: string;
    subagents: string[];
    resolution: string;
  }>;
  confidence: number;
  total_execution_time_ms: number;
}

/**
 * Aggregate results from multiple subagents using OpenRouter for intelligent synthesis
 */
export async function aggregateResults(
  input: AggregateRequest,
  openRouterApiKey: string
): Promise<AggregatedResult> {
  const { subagent_results, original_query, aggregation_strategy = "synthesis" } = input;

  // Build aggregation prompt
  const aggregationPrompt = buildAggregationPrompt(
    subagent_results,
    original_query,
    aggregation_strategy
  );

  const client = new Anthropic({
    apiKey: openRouterApiKey,
    baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'
  });

  // Step 1: Combine all subagent results

  try {
    const response = await client.messages.create({
      model: process.env.OPENROUTER_MODEL || "zhipu/glm-4-9b-chat",
      max_tokens: 2048,
      temperature: 0.3, // Moderate temperature for balanced synthesis
      messages: [
        {
          role: "user",
          content: aggregationPrompt
        }
      ]
    });

    const synthesisText = response.content[0].type === "text"
      ? response.content[0].text
      : "";

    // Parse synthesis and detect conflicts
    const { synthesis, conflicts, confidence } = parseSynthesisResponse(synthesisText);

    // Build findings summary
    const findingsBySubagent: AggregatedResult["findings_by_subagent"] = {};
    const sources: string[] = [];
    let totalExecutionTime = 0;

    for (const result of subagent_results) {
      if (result.success) {
        findingsBySubagent[result.subagent] = {
          summary: result.final_response || "No response",
          tools_used: result.tools_used,
          execution_time_ms: result.execution_time_ms
        };
        sources.push(result.subagent);
        totalExecutionTime += result.execution_time_ms;
      }
    }

    return {
      synthesis,
      sources,
      findings_by_subagent: findingsBySubagent,
      conflicts: conflicts.length > 0 ? conflicts : undefined,
      confidence,
      total_execution_time_ms: totalExecutionTime
    };

  } catch (error) {
    console.error("Aggregation error:", error);

    // Fallback to simple concatenation
    return fallbackAggregation(subagent_results, original_query);
  }
}

/**
 * Build prompt for Claude to synthesize multi-subagent results
 */
function buildAggregationPrompt(
  results: InvokeSubagentResult[],
  originalQuery: string,
  strategy: string
): string {
  let prompt = `You are synthesizing results from multiple specialized agents for this query:
"${originalQuery}"

Strategy: ${strategy}

Results from ${results.length} agents:

`;

  for (const result of results) {
    prompt += `\n## ${result.subagent} Agent\n`;
    prompt += `Status: ${result.success ? "✅ Success" : "❌ Failed"}\n`;
    prompt += `Execution time: ${result.execution_time_ms}ms\n`;
    prompt += `Tools used: ${result.tools_used.join(", ") || "None"}\n`;

    if (result.success) {
      prompt += `\n### Response:\n${result.final_response || "No response"}\n`;
    } else {
      prompt += `\n### Error:\n${result.error}\n`;
    }
  }

  prompt += `\n\n## Your Task\n\n`;

  if (strategy === "synthesis") {
    prompt += `Synthesize these findings into a unified, coherent response. Combine complementary information and resolve any contradictions. Provide a clear, actionable summary.`;
  } else if (strategy === "comparison") {
    prompt += `Compare and contrast the findings from each agent. Highlight similarities, differences, and unique insights from each source.`;
  } else if (strategy === "consolidation") {
    prompt += `Consolidate the findings into a structured report. Organize information by topic and cite which agent provided each piece of information.`;
  }

  prompt += `\n\nRespond in this JSON format:
{
  "synthesis": "Your synthesized response here",
  "conflicts": [
    {
      "issue": "Description of conflict",
      "subagents": ["agent1", "agent2"],
      "resolution": "How you resolved it"
    }
  ],
  "confidence": 0.95
}

Rules:
- synthesis: Clear, unified response to the original query
- conflicts: List any contradictions found and how you resolved them (empty array if none)
- confidence: 0.0-1.0 score for synthesis quality`;

  return prompt;
}

/**
 * Parse Claude's synthesis response
 */
function parseSynthesisResponse(responseText: string): {
  synthesis: string;
  conflicts: Array<{ issue: string; subagents: string[]; resolution: string }>;
  confidence: number;
} {
  try {
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in synthesis response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    return {
      synthesis: parsed.synthesis || responseText,
      conflicts: parsed.conflicts || [],
      confidence: parsed.confidence || 0.8
    };

  } catch (error) {
    console.error("Failed to parse synthesis response:", error);

    return {
      synthesis: responseText,
      conflicts: [],
      confidence: 0.7
    };
  }
}

/**
 * Fallback aggregation when Claude API fails
 */
function fallbackAggregation(
  results: InvokeSubagentResult[],
  originalQuery: string
): AggregatedResult {
  const successfulResults = results.filter(r => r.success);
  const sources = successfulResults.map(r => r.subagent);

  let synthesis = `Results for: "${originalQuery}"\n\n`;

  const findingsBySubagent: AggregatedResult["findings_by_subagent"] = {};
  let totalExecutionTime = 0;

  for (const result of successfulResults) {
    synthesis += `## ${result.subagent}\n`;
    synthesis += `${result.final_response || "No response"}\n\n`;

    findingsBySubagent[result.subagent] = {
      summary: result.final_response || "No response",
      tools_used: result.tools_used,
      execution_time_ms: result.execution_time_ms
    };

    totalExecutionTime += result.execution_time_ms;
  }

  const failedResults = results.filter(r => !r.success);
  if (failedResults.length > 0) {
    synthesis += `\n## Errors\n`;
    for (const result of failedResults) {
      synthesis += `- ${result.subagent}: ${result.error}\n`;
    }
  }

  return {
    synthesis,
    sources,
    findings_by_subagent: findingsBySubagent,
    confidence: successfulResults.length / results.length,
    total_execution_time_ms: totalExecutionTime
  };
}

/**
 * Detect conflicts in multi-subagent results
 */
export function detectConflicts(results: InvokeSubagentResult[]): Array<{
  issue: string;
  subagents: string[];
  details: any;
}> {
  const conflicts: Array<{ issue: string; subagents: string[]; details: any }> = [];

  // Example: Check for contradictory numerical values
  const numericalFindings: Map<string, Array<{ subagent: string; value: number }>> = new Map();

  for (const result of results) {
    if (!result.success || !result.final_response) continue;

    // Extract numbers from response (simplified)
    const numbers = result.final_response.match(/\d+(\.\d+)?/g);
    if (numbers) {
      for (const num of numbers) {
        const value = parseFloat(num);
        const key = `number_${value}`;

        if (!numericalFindings.has(key)) {
          numericalFindings.set(key, []);
        }
        numericalFindings.get(key)!.push({
          subagent: result.subagent,
          value
        });
      }
    }
  }

  // Check for significant variance in reported numbers
  for (const [key, findings] of numericalFindings.entries()) {
    if (findings.length > 1) {
      const values = findings.map(f => f.value);
      const mean = values.reduce((a, b) => a + b, 0) / values.length;
      const variance = values.reduce((sum, val) => sum + Math.pow(val - mean, 2), 0) / values.length;
      const stdDev = Math.sqrt(variance);

      if (stdDev > mean * 0.1) { // >10% variation
        conflicts.push({
          issue: `Numerical inconsistency detected`,
          subagents: findings.map(f => f.subagent),
          details: {
            values: findings,
            mean,
            std_dev: stdDev
          }
        });
      }
    }
  }

  return conflicts;
}

/**
 * Calculate confidence score for aggregated results
 */
export function calculateAggregationConfidence(
  results: InvokeSubagentResult[],
  conflicts: any[]
): number {
  const successRate = results.filter(r => r.success).length / results.length;
  const conflictPenalty = conflicts.length * 0.1;

  const confidence = Math.max(0, Math.min(1, successRate - conflictPenalty));

  return Math.round(confidence * 100) / 100;
}

/**
 * Tool definition for Claude Agent SDK
 */
export const aggregateResultsTool = {
  name: "aggregate_results",
  description: "Synthesize and combine results from multiple subagents into unified response",
  input_schema: {
    type: "object",
    properties: {
      subagent_results: {
        type: "array",
        description: "Array of results from subagent invocations",
        items: {
          type: "object",
          properties: {
            subagent: { type: "string" },
            task: { type: "string" },
            final_response: { type: "string" },
            tools_used: { type: "array", items: { type: "string" } },
            success: { type: "boolean" },
            error: { type: "string" }
          }
        }
      },
      original_query: {
        type: "string",
        description: "The original user query being answered"
      },
      aggregation_strategy: {
        type: "string",
        description: "How to combine results",
        enum: ["synthesis", "comparison", "consolidation"]
      },
      include_sources: {
        type: "boolean",
        description: "Include source attribution in response"
      }
    },
    required: ["subagent_results", "original_query"]
  }
};
