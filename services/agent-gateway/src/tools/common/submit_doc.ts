/**
 * T054: submit_doc tool - Submit document (change docstatus to 1)
 * High-risk operation, always requires approval
 */

import { z } from 'zod';
import { FrappeAPIClient } from '../../api';

export const SubmitDocInputSchema = z.object({
  doctype: z.string().min(1, 'DocType is required'),
  name: z.string().min(1, 'Document name is required'),
});

export type SubmitDocInput = z.infer<typeof SubmitDocInputSchema>;

export interface SubmitDocResult {
  requires_approval: true; // Always requires approval
  risk_level: 'high';
  preview: {
    doctype: string;
    name: string;
    operation: 'submit';
    warning: string;
  };
  execute: () => Promise<any>;
}

/**
 * Submit document (move to submitted state)
 * ⚠️ ALWAYS requires approval (high-risk operation)
 */
export async function submit_doc(
  input: SubmitDocInput,
  client: FrappeAPIClient,
  userId: string,
  sessionId: string
): Promise<SubmitDocResult> {
  // Validate input
  const validated = SubmitDocInputSchema.parse(input);

  // Submit operation is ALWAYS high risk
  return {
    requires_approval: true,
    risk_level: 'high',
    preview: {
      doctype: validated.doctype,
      name: validated.name,
      operation: 'submit',
      warning: 'Submitting a document makes it immutable. This action cannot be undone without cancellation.',
    },
    execute: async () => {
      // This function is called after user approves
      const result = await client.submitDoc({
        doctype: validated.doctype,
        name: validated.name,
      });

      return {
        success: true,
        doctype: validated.doctype,
        name: validated.name,
        docstatus: 1,
        message: 'Document submitted successfully',
      };
    },
  };
}

// Tool metadata for registry
export const submit_doc_tool = {
  name: 'submit_doc',
  description: 'Submit ERPNext document (makes it immutable) - ALWAYS requires approval',
  inputSchema: SubmitDocInputSchema,
  handler: submit_doc,
  requires_approval: true, // Always
  operation_type: 'submit',
};
