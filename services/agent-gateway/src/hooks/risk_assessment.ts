/**
 * Risk Assessment Hook using RiskClassifier
 *
 * Implements Claude Agent SDK hook for risk classification:
 * - Field sensitivity analysis
 * - Document state evaluation
 * - Operation scope assessment
 * - Configurable risk thresholds
 *
 * Integrates with Python RiskClassifier from apps/common/risk_classifier.py (T166)
 */

import type { ToolUseBlock } from "@anthropic-ai/sdk/resources/messages.js";

export type RiskLevel = "low" | "medium" | "high";

export type FieldSensitivity = "low" | "medium" | "high";

export type DocumentState = "draft" | "submitted" | "cancelled";

export interface RiskAssessment {
  level: RiskLevel;
  score: number; // 0.0 to 1.0
  factors: {
    field_sensitivity?: FieldSensitivity;
    document_state?: DocumentState;
    operation_scope?: string;
    bulk_count?: number;
    [key: string]: any;
  };
  requires_approval: boolean;
  reasoning: string;
}

/**
 * Field sensitivity mapping
 * Aligned with Python RiskClassifier (apps/common/risk_classifier.py)
 */
const SENSITIVE_FIELDS: { [field: string]: FieldSensitivity } = {
  // Financial fields - HIGH risk
  "grand_total": "high",
  "total": "high",
  "paid_amount": "high",
  "outstanding_amount": "high",
  "rate": "high",
  "amount": "high",
  "price": "high",
  "discount": "high",
  "tax_amount": "high",

  // Status/Workflow fields - HIGH risk
  "status": "high",
  "workflow_state": "high",
  "docstatus": "high",
  "approved_by": "high",
  "approval_status": "high",

  // Relationship fields - MEDIUM risk
  "customer": "medium",
  "supplier": "medium",
  "item_code": "medium",
  "warehouse": "medium",
  "company": "medium",
  "cost_center": "medium",
  "project": "medium",

  // Date/Time fields - MEDIUM risk
  "posting_date": "medium",
  "delivery_date": "medium",
  "due_date": "medium",
  "transaction_date": "medium",

  // Text/Note fields - LOW risk
  "notes": "low",
  "description": "low",
  "remarks": "low",
  "comments": "low",
  "subject": "low"
};

/**
 * Risk thresholds (configurable)
 */
const RISK_THRESHOLDS = {
  low_threshold: 0.3,
  high_threshold: 0.7,
  bulk_size_threshold: 10 // Operations affecting >10 docs = higher risk
};

/**
 * RiskAssessmentHook - Evaluates operation risk before execution
 */
export class RiskAssessmentHook {
  private customFieldSensitivity?: { [field: string]: FieldSensitivity };
  private customThresholds?: Partial<typeof RISK_THRESHOLDS>;

  constructor(options?: {
    customFieldSensitivity?: { [field: string]: FieldSensitivity };
    customThresholds?: Partial<typeof RISK_THRESHOLDS>;
  }) {
    this.customFieldSensitivity = options?.customFieldSensitivity;
    this.customThresholds = options?.customThresholds;
  }

  /**
   * Assess risk for a tool use operation
   */
  assess(
    toolUse: ToolUseBlock,
    context?: {
      document_state?: DocumentState;
      current_doctype?: string;
      [key: string]: any;
    }
  ): RiskAssessment {
    const input = toolUse.input as any;
    const operation = this.mapToolToOperation(toolUse.name);

    // Extract fields being modified
    const fields = this.extractFields(toolUse.name, input);

    // Determine document state
    const documentState = context?.document_state ||
      input.document_state ||
      this.inferDocumentState(input);

    // Determine operation count
    const operationCount = this.getOperationCount(toolUse.name, input);

    // Calculate risk score
    const { score, factors } = this.calculateRiskScore(
      operation,
      fields,
      documentState,
      operationCount,
      input
    );

    // Determine risk level
    const level = this.scoreToLevel(score);

    // Check if approval required
    const requires_approval = level === "medium" || level === "high";

    // Generate reasoning
    const reasoning = this.generateReasoning(
      operation,
      level,
      factors,
      toolUse.name
    );

    return {
      level,
      score,
      factors,
      requires_approval,
      reasoning
    };
  }

  /**
   * Map tool name to operation type
   */
  private mapToolToOperation(toolName: string): string {
    const mapping: { [key: string]: string } = {
      "create_doc": "create",
      "update_doc": "update",
      "submit_doc": "submit",
      "cancel_doc": "cancel",
      "delete_doc": "delete",
      "bulk_update": "bulk_update",
      "create_reservation": "create",
      "create_order_set": "create",
      "schedule_interview": "create",
      "execute_workflow_graph": "workflow"
    };

    return mapping[toolName] || "unknown";
  }

  /**
   * Extract fields from tool input
   */
  private extractFields(toolName: string, input: any): string[] {
    const fields: string[] = [];

    if (toolName === "update_doc" && input.updates) {
      fields.push(...Object.keys(input.updates));
    } else if (toolName === "create_doc" && input.data) {
      fields.push(...Object.keys(input.data));
    } else if (toolName === "bulk_update" && input.updates && input.updates.length > 0) {
      // Get fields from first update item
      fields.push(...Object.keys(input.updates[0] || {}));
    }

    return fields;
  }

  /**
   * Infer document state from input
   */
  private inferDocumentState(input: any): DocumentState {
    if (input.docstatus === 1) return "submitted";
    if (input.docstatus === 2) return "cancelled";
    return "draft";
  }

  /**
   * Get operation count (for bulk operations)
   */
  private getOperationCount(toolName: string, input: any): number {
    if (toolName === "bulk_update" && Array.isArray(input.updates)) {
      return input.updates.length;
    }
    return 1;
  }

  /**
   * Calculate risk score (0.0 to 1.0)
   */
  private calculateRiskScore(
    operation: string,
    fields: string[],
    documentState: DocumentState,
    operationCount: number,
    data: any
  ): { score: number; factors: RiskAssessment["factors"] } {
    let score = 0.0;
    const factors: RiskAssessment["factors"] = {};

    // 1. Operation type base score
    const operationScores: { [key: string]: number } = {
      "create": 0.3,
      "update": 0.4,
      "submit": 0.7,
      "cancel": 0.8,
      "delete": 0.9,
      "bulk_update": 0.6,
      "workflow": 0.7
    };
    score += operationScores[operation] || 0.5;

    // 2. Field sensitivity
    const fieldSensitivity = this.assessFieldSensitivity(fields);
    factors.field_sensitivity = fieldSensitivity;

    const sensitivityScores: { [key in FieldSensitivity]: number } = {
      "low": 0.0,
      "medium": 0.2,
      "high": 0.4
    };
    score += sensitivityScores[fieldSensitivity];

    // 3. Document state
    factors.document_state = documentState;

    const stateScores: { [key in DocumentState]: number } = {
      "draft": 0.0,
      "submitted": 0.3,
      "cancelled": 0.2
    };
    score += stateScores[documentState];

    // 4. Operation scope (bulk operations)
    if (operationCount > 1) {
      factors.operation_scope = "bulk";
      factors.bulk_count = operationCount;

      const thresholds = { ...RISK_THRESHOLDS, ...this.customThresholds };

      if (operationCount > thresholds.bulk_size_threshold) {
        score += 0.3; // Large bulk operation
      } else {
        score += 0.1; // Small bulk operation
      }
    } else {
      factors.operation_scope = "single";
    }

    // Normalize score to 0.0-1.0 range
    score = Math.min(1.0, Math.max(0.0, score));

    return { score, factors };
  }

  /**
   * Assess field sensitivity
   */
  private assessFieldSensitivity(fields: string[]): FieldSensitivity {
    if (fields.length === 0) return "low";

    const allSensitivities = fields.map(field => {
      const customSensitivity = this.customFieldSensitivity?.[field];
      if (customSensitivity) return customSensitivity;

      return SENSITIVE_FIELDS[field] || "low";
    });

    // Return highest sensitivity found
    if (allSensitivities.includes("high")) return "high";
    if (allSensitivities.includes("medium")) return "medium";
    return "low";
  }

  /**
   * Convert score to risk level
   */
  private scoreToLevel(score: number): RiskLevel {
    const thresholds = { ...RISK_THRESHOLDS, ...this.customThresholds };

    if (score >= thresholds.high_threshold) return "high";
    if (score >= thresholds.low_threshold) return "medium";
    return "low";
  }

  /**
   * Generate risk reasoning explanation
   */
  private generateReasoning(
    operation: string,
    level: RiskLevel,
    factors: RiskAssessment["factors"],
    toolName: string
  ): string {
    const parts: string[] = [];

    // Base operation risk
    if (operation === "submit") {
      parts.push("Submitting locks document and triggers workflow");
    } else if (operation === "cancel") {
      parts.push("Cancelling reverses submitted document");
    } else if (operation === "delete") {
      parts.push("Deletion is irreversible");
    } else if (operation === "workflow") {
      parts.push("Workflow may create multiple documents");
    }

    // Field sensitivity
    if (factors.field_sensitivity === "high") {
      parts.push("modifies sensitive financial/status fields");
    } else if (factors.field_sensitivity === "medium") {
      parts.push("modifies relationship/date fields");
    }

    // Document state
    if (factors.document_state === "submitted") {
      parts.push("affects submitted document");
    }

    // Bulk operations
    if (factors.operation_scope === "bulk") {
      parts.push(`bulk operation (${factors.bulk_count} documents)`);
    }

    // Tool-specific reasoning
    if (toolName === "create_order_set") {
      parts.push("clinical orders affect patient care");
    } else if (toolName === "execute_workflow_graph") {
      parts.push("multi-step business process");
    }

    const reasoning = parts.join(", ");
    return reasoning.charAt(0).toUpperCase() + reasoning.slice(1);
  }
}

/**
 * Create risk classifier function for tools
 */
export function createRiskClassifier(options?: {
  customFieldSensitivity?: { [field: string]: FieldSensitivity };
  customThresholds?: Partial<typeof RISK_THRESHOLDS>;
}): (toolName: string, toolInput: any, context: any) => RiskLevel {
  const hook = new RiskAssessmentHook(options);

  return (toolName: string, toolInput: any, context: any): RiskLevel => {
    const toolUse: ToolUseBlock = {
      type: "tool_use",
      id: "temp",
      name: toolName,
      input: toolInput
    };

    const assessment = hook.assess(toolUse, context);
    return assessment.level;
  };
}

/**
 * Export for integration with approval hook
 */
export function assessToolRisk(
  toolUse: ToolUseBlock,
  context?: any
): RiskAssessment {
  const hook = new RiskAssessmentHook();
  return hook.assess(toolUse, context);
}
