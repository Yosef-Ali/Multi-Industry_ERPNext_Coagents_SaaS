import type { ToolDefinition } from '../../tools/registry';
import { ErpNextTools } from '../../mcp/erpnext';
import type { FrappeAPIClient } from '../../api';

export const mcp_erpnext_count_docs_tool: ToolDefinition = {
  name: 'mcp_erpnext_count_docs',
  description: 'Get count of documents for a DocType with optional filters (uses frappe.client.get_count).',
  inputSchema: ErpNextTools.CountDocsInput,
  requires_approval: false,
  operation_type: 'read',
  handler: async (input, client: FrappeAPIClient) => {
    const tools = new ErpNextTools(client);
    return tools.countDocs(input);
  },
};

