import type { ToolDefinition } from '../../tools/registry';
import { ErpNextTools } from '../../mcp/erpnext';
import type { FrappeAPIClient } from '../../api';

export const mcp_erpnext_get_doctype_permissions_tool: ToolDefinition = {
  name: 'mcp_erpnext_get_doctype_permissions',
  description: 'Get DocType permissions (DocPerms) for a specific DocType.',
  inputSchema: ErpNextTools.GetDocTypePermissionsInput,
  requires_approval: false,
  operation_type: 'read',
  handler: async (input, client: FrappeAPIClient) => {
    const tools = new ErpNextTools(client);
    return tools.getDocTypePermissions(input);
  },
};

