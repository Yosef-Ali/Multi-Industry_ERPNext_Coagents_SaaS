/**
 * T055: cancel_doc tool - Cancel document (change docstatus to 2)
 * High-risk operation, always requires approval
 */

import { z } from 'zod';
import { FrappeAPIClient } from '../../api';

export const CancelDocInputSchema = z.object({
  doctype: z.string().min(1, 'DocType is required'),
  name: z.string().min(1, 'Document name is required'),
  reason: z.string().optional(),
});

export type CancelDocInput = z.infer<typeof CancelDocInputSchema>;

export interface CancelDocResult {
  requires_approval: true;
  risk_level: 'high';
  preview: {
    doctype: string;
    name: string;
    operation: 'cancel';
    reason?: string;
    warning: string;
  };
  execute: () => Promise<any>;
}

/**
 * Cancel document (move to cancelled state)
 * ⚠️ ALWAYS requires approval (high-risk operation)
 */
export async function cancel_doc(
  input: CancelDocInput,
  client: FrappeAPIClient,
  userId: string,
  sessionId: string
): Promise<CancelDocResult> {
  // Validate input
  const validated = CancelDocInputSchema.parse(input);

  // Cancel operation is ALWAYS high risk
  return {
    requires_approval: true,
    risk_level: 'high',
    preview: {
      doctype: validated.doctype,
      name: validated.name,
      operation: 'cancel',
      reason: validated.reason,
      warning: 'Cancelling a document reverses its effects. This action is permanent.',
    },
    execute: async () => {
      // This function is called after user approves
      const result = await client.cancelDoc({
        doctype: validated.doctype,
        name: validated.name,
      });

      return {
        success: true,
        doctype: validated.doctype,
        name: validated.name,
        docstatus: 2,
        message: `Document cancelled${validated.reason ? ': ' + validated.reason : ''}`,
      };
    },
  };
}

// Tool metadata for registry
export const cancel_doc_tool = {
  name: 'cancel_doc',
  description: 'Cancel ERPNext document (reverses effects) - ALWAYS requires approval',
  inputSchema: CancelDocInputSchema,
  handler: cancel_doc,
  requires_approval: true, // Always
  operation_type: 'cancel',
};
