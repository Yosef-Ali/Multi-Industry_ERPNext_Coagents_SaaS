import type { ToolDefinition } from '../../tools/registry';
import { ErpNextTools } from '../../mcp/erpnext';
import type { FrappeAPIClient } from '../../api';

export const mcp_erpnext_list_website_routes_tool: ToolDefinition = {
  name: 'mcp_erpnext_list_website_routes',
  description: 'List Website Routes (optionally filter by ref_doctype).',
  inputSchema: ErpNextTools.ListWebsiteRoutesInput,
  requires_approval: false,
  operation_type: 'read',
  handler: async (input, client: FrappeAPIClient) => {
    const tools = new ErpNextTools(client);
    return tools.listWebsiteRoutes(input);
  },
};

