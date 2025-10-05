/**
 * T052: create_doc tool - Create new document
 * Write operation with risk assessment and approval gate
 */

import { z } from 'zod';
import { FrappeAPIClient } from '../../api';
// import { RiskClassifier, DocumentState } from '../../../../../apps/common/risk_classifier';

export const CreateDocInputSchema = z.object({
  doctype: z.string().min(1, 'DocType is required'),
  data: z.record(z.unknown()),
});

export type CreateDocInput = z.infer<typeof CreateDocInputSchema>;

export interface CreateDocResult {
  requires_approval: boolean;
  risk_level?: string;
  preview?: {
    doctype: string;
    data: Record<string, any>;
    operation: 'create';
  };
  execute?: () => Promise<any>;
  document?: any; // If low risk and auto-executed
  execution_time_ms?: number;
}

/**
 * Create new document with risk assessment and approval gate
 * ⚠️ Requires approval for medium/high risk operations
 */
export async function create_doc(
  input: CreateDocInput,
  client: FrappeAPIClient,
  userId: string,
  sessionId: string
): Promise<CreateDocResult> {
  const startTime = Date.now();

  // Validate input
  const validated = CreateDocInputSchema.parse(input);

  // Assess risk (FR-010) - TODO: Restore when RiskClassifier is available
  const fields = Object.keys(validated.data);
  // const riskAssessment = RiskClassifier.assess(
  //   'create',
  //   validated.doctype,
  //   fields,
  //   DocumentState.DRAFT, // New documents are draft
  //   1, // Single document
  //   validated.data
  // );

  // Temporary implementation
  const riskAssessment = {
    requires_approval: true, // Default to requiring approval for creates
    level: 'medium',
    reasoning: 'Create operation on ' + validated.doctype,
  };

  // If low risk, execute immediately
  if (!riskAssessment.requires_approval) {
    const result = await client.createDoc({
      doctype: validated.doctype,
      data: validated.data,
    });

    return {
      requires_approval: false,
      document: result.document,
      execution_time_ms: Date.now() - startTime,
    };
  }

  // Medium/High risk - return approval request
  return {
    requires_approval: true,
    risk_level: riskAssessment.level,
    preview: {
      doctype: validated.doctype,
      data: validated.data,
      operation: 'create',
    },
    execute: async () => {
      // This function is called after user approves
      const result = await client.createDoc({
        doctype: validated.doctype,
        data: validated.data,
      });

      return {
        success: true,
        document: result.document,
        doctype: validated.doctype,
        name: result.name,
      };
    },
  };
}

// Tool metadata for registry
export const create_doc_tool = {
  name: 'create_doc',
  description: 'Create new ERPNext document with approval gate for high-risk operations',
  inputSchema: CreateDocInputSchema,
  handler: create_doc,
  requires_approval: true, // Conditional based on risk
  operation_type: 'create' as const,
};
