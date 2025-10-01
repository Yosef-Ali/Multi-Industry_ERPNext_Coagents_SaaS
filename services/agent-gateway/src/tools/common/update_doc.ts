/**
 * T053: update_doc tool - Update existing document
 * Write operation with risk assessment and approval gate
 */

import { z } from 'zod';
import { FrappeAPIClient } from '../../api';
import { RiskClassifier, DocumentState } from '../../../../../apps/common/risk_classifier';

export const UpdateDocInputSchema = z.object({
  doctype: z.string().min(1, 'DocType is required'),
  name: z.string().min(1, 'Document name is required'),
  data: z.record(z.unknown()),
  document_state: z.enum(['draft', 'submitted', 'cancelled']).optional().default('draft'),
});

export type UpdateDocInput = z.infer<typeof UpdateDocInputSchema>;

export interface UpdateDocResult {
  requires_approval: boolean;
  risk_level?: string;
  preview?: {
    doctype: string;
    name: string;
    data: Record<string, any>;
    operation: 'update';
  };
  execute?: () => Promise<any>;
  document?: any;
  execution_time_ms?: number;
}

/**
 * Update existing document with risk assessment and approval gate
 * ⚠️ Requires approval for medium/high risk operations
 */
export async function update_doc(
  input: UpdateDocInput,
  client: FrappeAPIClient,
  userId: string,
  sessionId: string
): Promise<UpdateDocResult> {
  const startTime = Date.now();

  // Validate input
  const validated = UpdateDocInputSchema.parse(input);

  // Assess risk (FR-010)
  const fields = Object.keys(validated.data);
  const docState = validated.document_state === 'submitted'
    ? DocumentState.SUBMITTED
    : validated.document_state === 'cancelled'
    ? DocumentState.CANCELLED
    : DocumentState.DRAFT;

  const riskAssessment = RiskClassifier.assess(
    'update',
    validated.doctype,
    fields,
    docState,
    1, // Single document
    validated.data
  );

  // If low risk, execute immediately
  if (!riskAssessment.requires_approval) {
    const result = await client.updateDoc({
      doctype: validated.doctype,
      name: validated.name,
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
      name: validated.name,
      data: validated.data,
      operation: 'update',
    },
    execute: async () => {
      // This function is called after user approves
      const result = await client.updateDoc({
        doctype: validated.doctype,
        name: validated.name,
        data: validated.data,
      });

      return {
        success: true,
        document: result.document,
        doctype: validated.doctype,
        name: validated.name,
      };
    },
  };
}

// Tool metadata for registry
export const update_doc_tool = {
  name: 'update_doc',
  description: 'Update existing ERPNext document with approval gate for high-risk operations',
  inputSchema: UpdateDocInputSchema,
  handler: update_doc,
  requires_approval: true, // Conditional based on risk
  operation_type: 'update',
};
