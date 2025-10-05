import { z } from 'zod';
import type { ToolDefinition } from '../../tools/registry';
import { Context7Client, Context7SearchInput, Context7SearchOutput } from '../../mcp/context7';
import type { FrappeAPIClient } from '../../api';

export const mcp_context7_docs_search_tool: ToolDefinition = {
  name: 'mcp_context7_docs_search',
  description: 'Search Context7 for ERPNext/Frappe docs/snippets/examples to ground planning/code.',
  inputSchema: Context7SearchInput,
  requires_approval: false,
  operation_type: 'read',
  handler: async (
    input: z.infer<typeof Context7SearchInput>,
    _client: FrappeAPIClient,
    _userId: string,
    _sessionId: string
  ): Promise<z.infer<typeof Context7SearchOutput>> => {
    const client = new Context7Client();
    return client.searchDocs(input);
  },
};

