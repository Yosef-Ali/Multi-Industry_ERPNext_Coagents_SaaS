/**
 * initiate_deep_research - Orchestrator tool for complex multi-source investigations
 *
 * Invokes the deep-research subagent for:
 * - Root cause analysis
 * - Multi-source data investigation
 * - Pattern detection and anomaly analysis
 * - Verification and cross-validation
 * - Evidence-based recommendations
 *
 * Part of Claude Agent SDK orchestrator-worker pattern (T154)
 */

import { invokeSubagent, type InvokeSubagentRequest, type InvokeSubagentResult } from "./invoke.js";
import type { SubagentRegistry } from "./subagent-loader.js";

export interface DeepResearchRequest {
  research_question: string;
  scope: {
    time_period?: {
      start_date: string;
      end_date: string;
    };
    modules?: string[]; // ERPNext modules to investigate
    doctypes?: string[]; // Specific DocTypes to analyze
    focus_areas?: string[]; // Specific areas to investigate
  };
  verification_required?: boolean;
  max_data_sources?: number;
  include_recommendations?: boolean;
}

export interface ResearchFinding {
  category: "primary_cause" | "contributing_factor" | "evidence" | "recommendation";
  description: string;
  impact_percentage?: number;
  confidence: number;
  supporting_data: Array<{
    source: string;
    data_point: any;
    verified: boolean;
  }>;
}

export interface DeepResearchResult {
  research_question: string;
  executive_summary: string;
  findings: ResearchFinding[];
  evidence_trail: Array<{
    source: string;
    finding: string;
    verification_status: "verified" | "unverified" | "conflicting";
  }>;
  recommendations?: Array<{
    priority: "immediate" | "short_term" | "long_term";
    description: string;
    expected_impact: string;
    implementation_effort: "low" | "medium" | "high";
  }>;
  verification_summary?: {
    total_sources: number;
    verified_sources: number;
    confidence_score: number;
  };
  methodology: string[];
  execution_time_ms: number;
  success: boolean;
  error?: string;
}

/**
 * Initiate deep research investigation
 */
export async function initiateDeepResearch(
  input: DeepResearchRequest,
  subagentRegistry: SubagentRegistry,
  openRouterApiKey: string,
  availableMCPServers?: string[]
): Promise<DeepResearchResult> {
  const startTime = Date.now();

  try {
    // Build detailed research task for deep-research subagent
    const researchTask = buildResearchTask(input);

    // Prepare context
    const context = {
      scope: input.scope,
      verification_required: input.verification_required !== false,
      max_data_sources: input.max_data_sources || 10,
      include_recommendations: input.include_recommendations !== false
    };

    // Invoke deep-research subagent
    const subagentRequest: InvokeSubagentRequest = {
      subagent: "deep-research",
      task: researchTask,
      context
    };

    const result = await invokeSubagent(
      subagentRequest,
      subagentRegistry,
      openRouterApiKey,
      availableMCPServers
    );

    if (!result.success) {
      throw new Error(result.error || "Deep research failed");
    }

    // Parse research findings from subagent response
    const parsedResult = parseResearchResponse(
      result.final_response || "",
      input.research_question
    );

    return {
      ...parsedResult,
      execution_time_ms: Date.now() - startTime,
      success: true
    };

  } catch (error) {
    console.error("Deep research error:", error);

    return {
      research_question: input.research_question,
      executive_summary: `Research failed: ${String(error)}`,
      findings: [],
      evidence_trail: [],
      methodology: [],
      execution_time_ms: Date.now() - startTime,
      success: false,
      error: String(error)
    };
  }
}

/**
 * Build detailed research task description
 */
function buildResearchTask(input: DeepResearchRequest): string {
  let task = `# Deep Research Investigation\n\n`;
  task += `## Research Question\n${input.research_question}\n\n`;

  // Scope
  task += `## Scope\n`;

  if (input.scope.time_period) {
    task += `- Time Period: ${input.scope.time_period.start_date} to ${input.scope.time_period.end_date}\n`;
  }

  if (input.scope.modules && input.scope.modules.length > 0) {
    task += `- ERPNext Modules: ${input.scope.modules.join(", ")}\n`;
  }

  if (input.scope.doctypes && input.scope.doctypes.length > 0) {
    task += `- DocTypes to Analyze: ${input.scope.doctypes.join(", ")}\n`;
  }

  if (input.scope.focus_areas && input.scope.focus_areas.length > 0) {
    task += `- Focus Areas: ${input.scope.focus_areas.join(", ")}\n`;
  }

  task += `\n## Requirements\n`;
  task += `- Verification: ${input.verification_required !== false ? "Required" : "Optional"}\n`;
  task += `- Max Data Sources: ${input.max_data_sources || 10}\n`;
  task += `- Include Recommendations: ${input.include_recommendations !== false ? "Yes" : "No"}\n`;

  task += `\n## Expected Output\n`;
  task += `Provide a comprehensive research report with:\n`;
  task += `1. Executive summary (2-3 sentences)\n`;
  task += `2. Primary cause identification with confidence level\n`;
  task += `3. Contributing factors with impact percentages\n`;
  task += `4. Evidence trail from all sources consulted\n`;
  task += `5. Verification status for critical findings\n`;

  if (input.include_recommendations !== false) {
    task += `6. Actionable recommendations prioritized by impact\n`;
  }

  task += `\nFollow your deep research methodology as defined in your system prompt.`;

  return task;
}

/**
 * Parse research response into structured findings
 */
function parseResearchResponse(
  responseText: string,
  researchQuestion: string
): Omit<DeepResearchResult, "execution_time_ms" | "success" | "error"> {
  // Try to extract structured sections from response
  const sections = {
    executive_summary: extractSection(responseText, "Executive Summary", "Investigation Methodology"),
    methodology: extractSection(responseText, "Investigation Methodology", "Findings"),
    findings: extractSection(responseText, "Findings", "Evidence Trail"),
    evidence: extractSection(responseText, "Evidence Trail", "Recommendations"),
    recommendations: extractSection(responseText, "Recommendations", "Impact Forecast")
  };

  // Parse findings
  const findings = parseFindings(sections.findings || "");

  // Parse evidence trail
  const evidenceTrail = parseEvidenceTrail(sections.evidence || "");

  // Parse recommendations
  const recommendations = parseRecommendations(sections.recommendations || "");

  // Parse methodology
  const methodology = parseMethodology(sections.methodology || "");

  // Extract executive summary
  const executiveSummary = sections.executive_summary?.trim() ||
    extractFirstParagraph(responseText) ||
    "Research investigation completed.";

  // Calculate verification summary
  const verificationSummary = calculateVerificationSummary(evidenceTrail);

  return {
    research_question: researchQuestion,
    executive_summary: executiveSummary,
    findings,
    evidence_trail: evidenceTrail,
    recommendations: recommendations && recommendations.length > 0 ? recommendations : undefined,
    verification_summary: verificationSummary,
    methodology
  };
}

/**
 * Extract section from markdown-style research report
 */
function extractSection(text: string, startMarker: string, endMarker: string): string | null {
  const startRegex = new RegExp(`##?\\s*${startMarker}`, "i");
  const endRegex = new RegExp(`##?\\s*${endMarker}`, "i");

  const startMatch = text.match(startRegex);
  if (!startMatch) return null;

  const startIndex = startMatch.index! + startMatch[0].length;
  const endMatch = text.slice(startIndex).match(endRegex);

  const endIndex = endMatch ? startIndex + endMatch.index! : text.length;

  return text.slice(startIndex, endIndex).trim();
}

/**
 * Parse findings from text
 */
function parseFindings(text: string): ResearchFinding[] {
  const findings: ResearchFinding[] = [];

  // Look for numbered findings
  const findingMatches = text.matchAll(/(\d+)\.\s*\*\*(.+?)\*\*\s*\((\d+)%.*?\)[\s\S]*?(?=\d+\.\s*\*\*|$)/g);

  for (const match of findingMatches) {
    const [, , title, impactStr] = match;
    const impact = parseInt(impactStr, 10);

    const category = title.toLowerCase().includes("primary") ? "primary_cause" : "contributing_factor";

    findings.push({
      category,
      description: title.trim(),
      impact_percentage: impact,
      confidence: 0.85, // Default confidence
      supporting_data: []
    });
  }

  return findings;
}

/**
 * Parse evidence trail
 */
function parseEvidenceTrail(text: string): DeepResearchResult["evidence_trail"] {
  const trail: DeepResearchResult["evidence_trail"] = [];

  // Look for bullet points with sources
  const evidenceMatches = text.matchAll(/-\s*(.+?):\s*(.+?)(?:\n|$)/g);

  for (const match of evidenceMatches) {
    const [, source, finding] = match;

    const verification_status = finding.includes("✅") ? "verified"
      : finding.includes("⚠️") ? "conflicting"
        : "unverified";

    trail.push({
      source: source.trim(),
      finding: finding.replace(/[✅⚠️❌]/g, "").trim(),
      verification_status
    });
  }

  return trail;
}

/**
 * Parse recommendations
 */
function parseRecommendations(text: string): DeepResearchResult["recommendations"] {
  const recommendations: NonNullable<DeepResearchResult["recommendations"]> = [];

  // Look for numbered recommendations
  const recMatches = text.matchAll(/(\d+)\.\s*(.+?)(?:\n|$)/g);

  for (const match of recMatches) {
    const [, , description] = match;

    const priority = description.toLowerCase().includes("immediate") ? "immediate"
      : description.toLowerCase().includes("long") ? "long_term"
        : "short_term";

    recommendations.push({
      priority,
      description: description.trim(),
      expected_impact: "TBD",
      implementation_effort: "medium"
    });
  }

  return recommendations;
}

/**
 * Parse methodology steps
 */
function parseMethodology(text: string): string[] {
  const steps: string[] = [];

  const methodMatches = text.matchAll(/-\s*(.+?)(?:\n|$)/g);

  for (const match of methodMatches) {
    steps.push(match[1].trim());
  }

  return steps;
}

/**
 * Extract first paragraph for executive summary
 */
function extractFirstParagraph(text: string): string {
  const paragraphs = text.split("\n\n");
  return paragraphs[0]?.trim() || "";
}

/**
 * Calculate verification summary
 */
function calculateVerificationSummary(evidenceTrail: DeepResearchResult["evidence_trail"]): DeepResearchResult["verification_summary"] {
  const total = evidenceTrail.length;
  const verified = evidenceTrail.filter(e => e.verification_status === "verified").length;

  const confidence = total > 0 ? verified / total : 0;

  return {
    total_sources: total,
    verified_sources: verified,
    confidence_score: Math.round(confidence * 100) / 100
  };
}

/**
 * Tool definition for Claude Agent SDK
 */
export const initiateDeepResearchTool = {
  name: "initiate_deep_research",
  description: "Launch deep research investigation for complex multi-source analysis",
  input_schema: {
    type: "object",
    properties: {
      research_question: {
        type: "string",
        description: "The research question to investigate"
      },
      scope: {
        type: "object",
        description: "Research scope parameters",
        properties: {
          time_period: {
            type: "object",
            properties: {
              start_date: { type: "string", format: "date" },
              end_date: { type: "string", format: "date" }
            }
          },
          modules: {
            type: "array",
            items: { type: "string" },
            description: "ERPNext modules to investigate"
          },
          doctypes: {
            type: "array",
            items: { type: "string" },
            description: "Specific DocTypes to analyze"
          },
          focus_areas: {
            type: "array",
            items: { type: "string" },
            description: "Specific focus areas"
          }
        }
      },
      verification_required: {
        type: "boolean",
        description: "Whether to spawn verification subagent (default: true)"
      },
      max_data_sources: {
        type: "number",
        description: "Maximum data sources to consult (default: 10)"
      },
      include_recommendations: {
        type: "boolean",
        description: "Include actionable recommendations (default: true)"
      }
    },
    required: ["research_question", "scope"]
  }
};
