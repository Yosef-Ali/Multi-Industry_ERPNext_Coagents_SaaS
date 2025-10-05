/**
 * T057: bulk_update tool - Update multiple documents
 * High-risk operation with batch size limit, always requires approval
 */

import { z } from 'zod';
import { FrappeAPIClient } from '../../api';
// import { RiskClassifier, DocumentState } from '../../../../../apps/common/risk_classifier';

export const BulkUpdateInputSchema = z.object({
  doctype: z.string().min(1, 'DocType is required'),
  names: z.array(z.string()).min(1, 'At least one document name required').max(50, 'Maximum 50 documents allowed'),
  data: z.record(z.unknown()),
  document_state: z.enum(['draft', 'submitted', 'cancelled']).optional().default('draft'),
});

export type BulkUpdateInput = z.infer<typeof BulkUpdateInputSchema>;

export interface BulkUpdateResult {
  requires_approval: true; // Always for bulk operations
  risk_level: string;
  preview: {
    doctype: string;
    affected_count: number;
    documents: string[];
    data: Record<string, any>;
    operation: 'bulk_update';
    warning: string;
  };
  execute: () => Promise<any>;
}

/**
 * Update multiple documents in bulk
 * ⚠️ ALWAYS requires approval (bulk operation = high risk)
 * Enforces batch size limit of 50 (FR-019)
 */
export async function bulk_update(
  input: BulkUpdateInput,
  client: FrappeAPIClient,
  userId: string,
  sessionId: string
): Promise<BulkUpdateResult> {
  // Validate input (max 50 enforced by schema)
  const validated = BulkUpdateInputSchema.parse(input);

  // Assess risk (bulk operations are always at least medium risk)
  const fields = Object.keys(validated.data);
  // const docState = validated.document_state === 'submitted'
  //   ? DocumentState.SUBMITTED
  //   : validated.document_state === 'cancelled'
  //     ? DocumentState.CANCELLED
  //     : DocumentState.DRAFT;

  // const riskAssessment = RiskClassifier.assess(
  //   'bulk_update',
  //   validated.doctype,
  //   fields,
  //   docState,
  //   validated.names.length, // Bulk operation count
  //   validated.data
  // );

  // Temporary implementation - bulk operations always require approval
  const riskAssessment = {
    requires_approval: true,
    level: 'high',
    reasoning: `Bulk update of ${validated.names.length} ${validated.doctype} documents`,
  };

  // Bulk operations ALWAYS require approval
  return {
    requires_approval: true,
    risk_level: riskAssessment.level,
    preview: {
      doctype: validated.doctype,
      affected_count: validated.names.length,
      documents: validated.names.slice(0, 10), // Show first 10 for preview
      data: validated.data,
      operation: 'bulk_update',
      warning: `This will update ${validated.names.length} document(s). Changes will be applied to all selected documents.`,
    },
    execute: async () => {
      // This function is called after user approves
      const result = await client.bulkUpdate({
        doctype: validated.doctype,
        names: validated.names,
        data: validated.data,
        batchSize: 50,
      });

      return {
        success: true,
        doctype: validated.doctype,
        success_count: result.success_count,
        error_count: result.error_count,
        results: result.results,
        errors: result.errors,
        message: `Successfully updated ${result.success_count} of ${validated.names.length} documents`,
      };
    },
  };
}

// Tool metadata for registry
export const bulk_update_tool = {
  name: 'bulk_update',
  description: 'Update multiple ERPNext documents in bulk (max 50) - ALWAYS requires approval',
  inputSchema: BulkUpdateInputSchema,
  handler: bulk_update,
  requires_approval: true, // Always
  operation_type: 'bulk',
};
