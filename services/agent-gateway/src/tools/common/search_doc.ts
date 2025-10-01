/**
 * T050: search_doc tool - Search documents with filters
 * Read-only operation, no approval required
 */

import { z } from 'zod';
import { FrappeAPIClient } from '../../api';

export const SearchDocInputSchema = z.object({
  doctype: z.string().min(1, 'DocType is required'),
  filters: z.record(z.unknown()).optional(),
  fields: z.array(z.string()).optional(),
  limit: z.number().int().positive().max(100).optional().default(20),
  order_by: z.string().optional(),
});

export type SearchDocInput = z.infer<typeof SearchDocInputSchema>;

export interface SearchDocResult {
  documents: any[];
  total: number;
  requires_approval: false;
  execution_time_ms: number;
}

/**
 * Search documents by DocType with optional filters
 * ✅ No approval required (read-only operation)
 */
export async function search_doc(
  input: SearchDocInput,
  client: FrappeAPIClient
): Promise<SearchDocResult> {
  const startTime = Date.now();

  // Validate input
  const validated = SearchDocInputSchema.parse(input);

  // Execute search via Frappe API
  const result = await client.searchDoc({
    doctype: validated.doctype,
    filters: validated.filters,
    fields: validated.fields,
    limit: validated.limit,
    order_by: validated.order_by,
  });

  const executionTime = Date.now() - startTime;

  return {
    documents: result.documents,
    total: result.total,
    requires_approval: false, // Read-only
    execution_time_ms: executionTime,
  };
}

// Tool metadata for registry
export const search_doc_tool = {
  name: 'search_doc',
  description: 'Search ERPNext documents by DocType with filters',
  inputSchema: SearchDocInputSchema,
  handler: search_doc,
  requires_approval: false,
  operation_type: 'read',
};
