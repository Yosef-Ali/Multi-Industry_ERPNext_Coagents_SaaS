import type { ToolDefinition } from '../../tools/registry';
import { ErpNextTools } from '../../mcp/erpnext';
import type { FrappeAPIClient } from '../../api';

export const mcp_erpnext_list_server_scripts_tool: ToolDefinition = {
  name: 'mcp_erpnext_list_server_scripts',
  description: 'List Server Scripts (optionally by type).',
  inputSchema: ErpNextTools.ListServerScriptsInput,
  requires_approval: false,
  operation_type: 'read',
  handler: async (input, client: FrappeAPIClient) => {
    const tools = new ErpNextTools(client);
    return tools.listServerScripts(input);
  },
};

