import type { ToolDefinition } from '../../tools/registry';
import { ErpNextTools } from '../../mcp/erpnext';
import type { FrappeAPIClient } from '../../api';

export const mcp_erpnext_list_user_permissions_tool: ToolDefinition = {
  name: 'mcp_erpnext_list_user_permissions',
  description: 'List User Permission entries (optionally by user or allow DocType).',
  inputSchema: ErpNextTools.ListUserPermissionsInput,
  requires_approval: false,
  operation_type: 'read',
  handler: async (input, client: FrappeAPIClient) => {
    const tools = new ErpNextTools(client);
    return tools.listUserPermissions(input);
  },
};

