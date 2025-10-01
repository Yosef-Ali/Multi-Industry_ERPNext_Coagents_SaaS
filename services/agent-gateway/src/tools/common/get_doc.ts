/**
 * T051: get_doc tool - Retrieve single document
 * Read-only operation, no approval required
 */

import { z } from 'zod';
import { FrappeAPIClient } from '../../api';

export const GetDocInputSchema = z.object({
  doctype: z.string().min(1, 'DocType is required'),
  name: z.string().min(1, 'Document name is required'),
});

export type GetDocInput = z.infer<typeof GetDocInputSchema>;

export interface GetDocResult {
  document: any;
  requires_approval: false;
  execution_time_ms: number;
}

/**
 * Retrieve single document by DocType and name
 * ✅ No approval required (read-only operation)
 */
export async function get_doc(
  input: GetDocInput,
  client: FrappeAPIClient
): Promise<GetDocResult> {
  const startTime = Date.now();

  // Validate input
  const validated = GetDocInputSchema.parse(input);

  // Execute get via Frappe API
  const result = await client.getDoc({
    doctype: validated.doctype,
    name: validated.name,
  });

  const executionTime = Date.now() - startTime;

  return {
    document: result.document,
    requires_approval: false, // Read-only
    execution_time_ms: executionTime,
  };
}

// Tool metadata for registry
export const get_doc_tool = {
  name: 'get_doc',
  description: 'Retrieve single ERPNext document by DocType and name',
  inputSchema: GetDocInputSchema,
  handler: get_doc,
  requires_approval: false,
  operation_type: 'read',
};
