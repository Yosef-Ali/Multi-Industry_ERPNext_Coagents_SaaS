import type { ToolDefinition } from '../../tools/registry';
import { ErpNextTools } from '../../mcp/erpnext';
import type { FrappeAPIClient } from '../../api';

export const mcp_erpnext_list_custom_scripts_tool: ToolDefinition = {
  name: 'mcp_erpnext_list_custom_scripts',
  description: 'List Custom Scripts (optionally filter by DocType or script_type).',
  inputSchema: ErpNextTools.ListCustomScriptsInput,
  requires_approval: false,
  operation_type: 'read',
  handler: async (input, client: FrappeAPIClient) => {
    const tools = new ErpNextTools(client);
    return tools.listCustomScripts(input);
  },
};

