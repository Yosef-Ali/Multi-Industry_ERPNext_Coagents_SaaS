import type { ToolDefinition } from '../../tools/registry';
import { ErpNextTools } from '../../mcp/erpnext';
import type { FrappeAPIClient } from '../../api';

export const mcp_erpnext_list_web_pages_tool: ToolDefinition = {
  name: 'mcp_erpnext_list_web_pages',
  description: 'List Web Pages (optionally published only).',
  inputSchema: ErpNextTools.ListWebPagesInput,
  requires_approval: false,
  operation_type: 'read',
  handler: async (input, client: FrappeAPIClient) => {
    const tools = new ErpNextTools(client);
    return tools.listWebPages(input);
  },
};

