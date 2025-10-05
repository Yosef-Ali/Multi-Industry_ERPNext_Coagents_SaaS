import { z } from 'zod';
import type { ToolDefinition } from '../../tools/registry';
import { ErpNextTools, SearchRecordsInput, SearchRecordsOutput } from '../../mcp/erpnext';
import type { FrappeAPIClient } from '../../api';

export const mcp_erpnext_search_records_tool: ToolDefinition = {
  name: 'mcp_erpnext_search_records',
  description: 'Search ERPNext records by doctype and query (read-only).',
  inputSchema: SearchRecordsInput,
  requires_approval: false,
  operation_type: 'read',
  handler: async (
    input: z.infer<typeof SearchRecordsInput>,
    client: FrappeAPIClient,
    _userId: string,
    _sessionId: string
  ): Promise<z.infer<typeof SearchRecordsOutput>> => {
    const tools = new ErpNextTools(client);
    return tools.searchRecords(input);
  },
};

