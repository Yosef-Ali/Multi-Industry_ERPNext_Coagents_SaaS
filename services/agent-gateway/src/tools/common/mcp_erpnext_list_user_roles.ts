import type { ToolDefinition } from '../../tools/registry';
import { ErpNextTools } from '../../mcp/erpnext';
import type { FrappeAPIClient } from '../../api';

export const mcp_erpnext_list_user_roles_tool: ToolDefinition = {
  name: 'mcp_erpnext_list_user_roles',
  description: 'List roles for a given User.',
  inputSchema: ErpNextTools.ListUserRolesInput,
  requires_approval: false,
  operation_type: 'read',
  handler: async (input, client: FrappeAPIClient) => {
    const tools = new ErpNextTools(client);
    return tools.listUserRoles(input);
  },
};

