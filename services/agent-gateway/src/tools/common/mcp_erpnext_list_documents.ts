import type { ToolDefinition } from '../../tools/registry';
import { ErpNextTools } from '../../mcp/erpnext';
import type { FrappeAPIClient } from '../../api';

export const mcp_erpnext_list_documents_tool: ToolDefinition = {
  name: 'mcp_erpnext_list_documents',
  description: 'Generic list documents tool (doctype, filters, fields, order_by, limit).',
  inputSchema: ErpNextTools.ListDocumentsInput,
  requires_approval: false,
  operation_type: 'read',
  handler: async (input, client: FrappeAPIClient) => {
    const tools = new ErpNextTools(client);
    return tools.listDocuments(input);
  },
};

