import type { ToolDefinition } from '../../tools/registry';
import { ErpNextTools } from '../../mcp/erpnext';
import type { FrappeAPIClient } from '../../api';

export const mcp_erpnext_list_users_tool: ToolDefinition = {
  name: 'mcp_erpnext_list_users',
  description: 'List Users (active only by default).',
  inputSchema: ErpNextTools.ListUsersInput,
  requires_approval: false,
  operation_type: 'read',
  handler: async (input, client: FrappeAPIClient) => {
    const tools = new ErpNextTools(client);
    return tools.listUsers(input);
  },
};

