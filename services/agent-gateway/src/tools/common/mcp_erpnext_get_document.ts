import type { ToolDefinition } from '../../tools/registry';
import { ErpNextTools } from '../../mcp/erpnext';
import type { FrappeAPIClient } from '../../api';

export const mcp_erpnext_get_document_tool: ToolDefinition = {
  name: 'mcp_erpnext_get_document',
  description: 'Get single document by doctype and name.',
  inputSchema: ErpNextTools.GetDocumentInput,
  requires_approval: false,
  operation_type: 'read',
  handler: async (input, client: FrappeAPIClient) => {
    const tools = new ErpNextTools(client);
    return tools.getDocument(input);
  },
};

