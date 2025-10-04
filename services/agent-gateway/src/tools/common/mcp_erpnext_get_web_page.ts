import type { ToolDefinition } from '../../tools/registry';
import { ErpNextTools } from '../../mcp/erpnext';
import type { FrappeAPIClient } from '../../api';

export const mcp_erpnext_get_web_page_tool: ToolDefinition = {
  name: 'mcp_erpnext_get_web_page',
  description: 'Get Web Page by name.',
  inputSchema: ErpNextTools.GetWebPageInput,
  requires_approval: false,
  operation_type: 'read',
  handler: async (input, client: FrappeAPIClient) => {
    const tools = new ErpNextTools(client);
    return tools.getWebPage(input);
  },
};

