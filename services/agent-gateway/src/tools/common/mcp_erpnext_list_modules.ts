import type { ToolDefinition } from '../../tools/registry';
import { ErpNextTools } from '../../mcp/erpnext';
import type { FrappeAPIClient } from '../../api';

export const mcp_erpnext_list_modules_tool: ToolDefinition = {
  name: 'mcp_erpnext_list_modules',
  description: 'List Module Def entries (optionally filter by app_name).',
  inputSchema: ErpNextTools.ListModulesInput,
  requires_approval: false,
  operation_type: 'read',
  handler: async (input, client: FrappeAPIClient) => {
    const tools = new ErpNextTools(client);
    return tools.listModules(input);
  },
};

