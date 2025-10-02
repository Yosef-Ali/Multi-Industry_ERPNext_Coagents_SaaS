/**
 * classify_request - Orchestrator tool for request classification
 *
 * Analyzes user requests to determine:
 * - Industry context (hotel, hospital, manufacturing, retail, education, general)
 * - Task complexity (simple, multi_step, deep_research)
 * - Required subagents
 * - Confidence score
 *
 * Part of Claude Agent SDK orchestrator-worker pattern (T151)
 */

import Anthropic from "@anthropic-ai/sdk";
import {
  retryWithBackoff,
  globalCircuitBreaker,
  globalCostTracker,
  DEFAULT_RETRY_CONFIG
} from "../../utils/openrouter-error-handler.js";
import { validateModel, DEFAULT_MODEL } from "../../config/environment.js";

export interface ClassificationRequest {
  request: string;
  current_doctype?: string;
  conversation_history?: Array<{
    role: "user" | "assistant";
    content: string;
  }>;
}

export interface ClassificationResult {
  industry: "hotel" | "hospital" | "manufacturing" | "retail" | "education" | "general" | "multi_industry";
  complexity: "simple" | "multi_step" | "deep_research";
  requires_subagents: string[];
  confidence: number;
  reasoning: string;
  routing_decision: "direct" | "delegate" | "deep_research" | "multi_industry";
}

/**
 * Classification patterns for industry detection
 */
const INDUSTRY_PATTERNS = {
  hotel: {
    keywords: [
      "room", "reservation", "check-in", "check-out", "guest", "folio",
      "occupancy", "adr", "revpar", "hotel", "booking", "stay"
    ],
    doctypes: ["Room", "Room Type", "Reservation", "Folio"],
    workflows: ["hotel_o2c", "hotel_cancellation", "hotel_group_booking"]
  },
  hospital: {
    keywords: [
      "patient", "appointment", "encounter", "clinical", "lab", "medication",
      "order set", "admission", "discharge", "diagnosis", "census", "payer"
    ],
    doctypes: ["Patient", "Appointment", "Encounter", "Lab Test", "Medication", "Order Set"],
    workflows: ["hospital_admissions", "hospital_discharge", "order_fulfillment"]
  },
  manufacturing: {
    keywords: [
      "material", "bom", "work order", "production", "manufacturing",
      "inventory", "warehouse", "stock", "requisition", "capacity"
    ],
    doctypes: ["Work Order", "BOM", "Item", "Stock Entry", "Job Card"],
    workflows: ["manufacturing_mto", "manufacturing_completion"]
  },
  retail: {
    keywords: [
      "sales order", "inventory", "stock", "customer", "delivery",
      "fulfillment", "pos", "product", "warehouse", "shipment"
    ],
    doctypes: ["Sales Order", "Delivery Note", "POS Invoice", "Customer"],
    workflows: ["retail_order_fulfillment", "retail_replenishment", "retail_returns"]
  },
  education: {
    keywords: [
      "student", "applicant", "admission", "interview", "program",
      "course", "academic", "enrollment", "application", "shortlist"
    ],
    doctypes: ["Student Applicant", "Student", "Program", "Course", "Academic Term"],
    workflows: ["education_admissions", "education_enrollment", "interview_scheduling"]
  }
};

/**
 * Complexity indicators
 */
const COMPLEXITY_INDICATORS = {
  simple: {
    patterns: [
      /^(show|get|find|view|display|list)/i,
      /^what is/i,
      /^how many/i,
      /single (document|record|item)/i
    ],
    max_operations: 1
  },
  multi_step: {
    patterns: [
      /^(create|process|schedule|complete|fulfill)/i,
      /(and then|followed by|next)/i,
      /(workflow|process|pipeline)/i
    ],
    min_operations: 2,
    max_operations: 5
  },
  deep_research: {
    patterns: [
      /^(why|analyze|investigate|explain)/i,
      /(root cause|reason for|what caused)/i,
      /(compare|trend|pattern|anomaly)/i,
      /(across|multiple|all)/i
    ],
    min_data_sources: 5,
    requires_verification: true
  }
};

/**
 * Classify a user request using OpenRouter for intelligent analysis
 */
export async function classifyRequest(
  input: ClassificationRequest,
  openRouterApiKey: string
): Promise<ClassificationResult> {
  const client = new Anthropic({
    apiKey: openRouterApiKey,
    baseURL: process.env.OPENROUTER_BASE_URL || 'https://openrouter.ai/api/v1'
  });
  const model = validateModel(process.env.OPENROUTER_MODEL || DEFAULT_MODEL);

  // Build classification prompt
  const classificationPrompt = buildClassificationPrompt(input);

  try {
    const response = await globalCircuitBreaker.execute(() =>
      retryWithBackoff(
        () => client.messages.create({
          model,
          max_tokens: 1024,
          temperature: 0.1,
          messages: [
            {
              role: "user",
              content: classificationPrompt
            }
          ]
        }),
        DEFAULT_RETRY_CONFIG,
        (err, attempt, delay) => {
          console.warn(
            `classify_request retry ${attempt}/${DEFAULT_RETRY_CONFIG.maxRetries} in ${delay}ms: ${err.message}`
          );
        }
      )
    );

    if (response.usage) {
      globalCostTracker.recordUsage(
        response.model || model,
        response.usage.input_tokens ?? 0,
        response.usage.output_tokens ?? 0
      );
    }

    // Parse classification response
    const responseText = response.content[0].type === "text"
      ? response.content[0].text
      : "";

    const classification = parseClassificationResponse(responseText, input);

    return classification;

  } catch (error) {
    console.error("Classification error:", error);

    // Fallback to pattern-based classification
    return fallbackClassification(input);
  }
}

/**
 * Build structured prompt for Claude to classify the request
 */
function buildClassificationPrompt(args: ClassificationRequest): string {
  const { request, current_doctype, conversation_history } = args;

  const historyContext = conversation_history && conversation_history.length > 0
    ? `\n\nConversation history:\n${conversation_history.map(msg =>
      `${msg.role}: ${msg.content}`
    ).join("\n")}`
    : "";

  const doctypeContext = current_doctype
    ? `\n\nUser is currently viewing: ${current_doctype} DocType`
    : "";

  return `You are a request classifier for an ERPNext multi-industry coagent system.

Classify this user request:
"${request}"${doctypeContext}${historyContext}

Industries:
- hotel: Room management, reservations, check-in/out, occupancy
- hospital: Patient care, appointments, clinical orders, billing
- manufacturing: Production, BOM, work orders, materials
- retail: Sales orders, inventory, fulfillment, POS
- education: Admissions, students, programs, interviews
- general: Cross-industry operations (invoices, payments, reports)
- multi_industry: Requires multiple industry specialists

Complexity:
- simple: Single operation, read-only query (e.g., "Show Invoice INV-001")
- multi_step: 2-5 operations, workflow execution (e.g., "Create order and fulfill")
- deep_research: Complex investigation, multiple data sources (e.g., "Why did A/R increase?")

Respond in this EXACT JSON format:
{
  "industry": "hotel|hospital|manufacturing|retail|education|general|multi_industry",
  "complexity": "simple|multi_step|deep_research",
  "requires_subagents": ["subagent1", "subagent2"],
  "confidence": 0.95,
  "reasoning": "Brief explanation of classification",
  "routing_decision": "direct|delegate|deep_research|multi_industry"
}

Rules:
- requires_subagents: List specific subagent names (e.g., ["hotel", "hospital"])
- confidence: 0.0 to 1.0 (use 0.7+ threshold for routing)
- routing_decision:
  * "direct" - Orchestrator handles directly (simple queries, general operations)
  * "delegate" - Single subagent (industry-specific single/multi-step)
  * "deep_research" - Deep research subagent (complex investigation)
  * "multi_industry" - Multiple subagents in parallel`;
}

/**
 * Parse Claude's classification response into structured result
 */
function parseClassificationResponse(
  responseText: string,
  args: ClassificationRequest
): ClassificationResult {
  try {
    // Extract JSON from response (handle markdown code blocks)
    const jsonMatch = responseText.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error("No JSON found in response");
    }

    const parsed = JSON.parse(jsonMatch[0]);

    // Validate required fields
    if (!parsed.industry || !parsed.complexity || !parsed.routing_decision) {
      throw new Error("Missing required classification fields");
    }

    return {
      industry: parsed.industry,
      complexity: parsed.complexity,
      requires_subagents: parsed.requires_subagents || [],
      confidence: parsed.confidence || 0.8,
      reasoning: parsed.reasoning || "Classification completed",
      routing_decision: parsed.routing_decision
    };

  } catch (error) {
    console.error("Failed to parse classification response:", error);
    return fallbackClassification(args);
  }
}

/**
 * Fallback pattern-based classification when Claude API fails
 */
function fallbackClassification(args: ClassificationRequest): ClassificationResult {
  const { request, current_doctype } = args;
  const requestLower = request.toLowerCase();

  // Detect industry
  let industry: ClassificationResult["industry"] = "general";
  let matchedIndustries: string[] = [];
  let maxScore = 0;

  for (const [industryName, patterns] of Object.entries(INDUSTRY_PATTERNS)) {
    let score = 0;

    // Keyword matching
    for (const keyword of patterns.keywords) {
      if (requestLower.includes(keyword.toLowerCase())) {
        score += 2;
      }
    }

    // DocType matching
    if (current_doctype && patterns.doctypes.includes(current_doctype)) {
      score += 5;
    }

    // Workflow mention
    for (const workflow of patterns.workflows) {
      if (requestLower.includes(workflow.replace(/_/g, " "))) {
        score += 3;
      }
    }

    if (score > 0) {
      matchedIndustries.push(industryName);
    }

    if (score > maxScore) {
      maxScore = score;
      industry = industryName as ClassificationResult["industry"];
    }
  }

  // Multi-industry detection
  if (matchedIndustries.length > 1) {
    industry = "multi_industry";
  }

  // Detect complexity
  let complexity: ClassificationResult["complexity"] = "simple";

  for (const [level, indicators] of Object.entries(COMPLEXITY_INDICATORS)) {
    for (const pattern of indicators.patterns) {
      if (pattern.test(request)) {
        complexity = level as ClassificationResult["complexity"];
        break;
      }
    }
  }

  // Determine routing
  let routing_decision: ClassificationResult["routing_decision"] = "direct";
  let requires_subagents: string[] = [];

  if (complexity === "deep_research") {
    routing_decision = "deep_research";
    requires_subagents = ["deep-research"];
  } else if (industry === "multi_industry") {
    routing_decision = "multi_industry";
    requires_subagents = matchedIndustries;
  } else if (industry !== "general" && complexity !== "simple") {
    routing_decision = "delegate";
    requires_subagents = [industry];
  }

  const confidence = maxScore > 5 ? 0.85 : maxScore > 2 ? 0.70 : 0.60;

  return {
    industry,
    complexity,
    requires_subagents,
    confidence,
    reasoning: `Pattern-based classification: ${industry} industry, ${complexity} complexity (score: ${maxScore})`,
    routing_decision
  };
}

/**
 * Tool definition for Claude Agent SDK
 */
export const classifyRequestTool = {
  name: "classify_request",
  description: "Classify user request to determine industry context, task complexity, and routing decision",
  input_schema: {
    type: "object",
    properties: {
      request: {
        type: "string",
        description: "The user's request to classify"
      },
      current_doctype: {
        type: "string",
        description: "Current DocType being viewed (optional)"
      },
      conversation_history: {
        type: "array",
        description: "Previous conversation messages for context (optional)",
        items: {
          type: "object",
          properties: {
            role: { type: "string", enum: ["user", "assistant"] },
            content: { type: "string" }
          },
          required: ["role", "content"]
        }
      }
    },
    required: ["request"]
  }
};
