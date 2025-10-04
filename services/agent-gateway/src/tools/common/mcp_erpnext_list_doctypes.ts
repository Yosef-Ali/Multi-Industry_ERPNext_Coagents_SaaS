import type { ToolDefinition } from '../../tools/registry';
import { ErpNextTools } from '../../mcp/erpnext';
import type { FrappeAPIClient } from '../../api';

export const mcp_erpnext_list_doctypes_tool: ToolDefinition = {
  name: 'mcp_erpnext_list_doctypes',
  description: 'List DocTypes (optionally filter by module, exclude child tables by default).',
  inputSchema: ErpNextTools.ListDocTypesInput,
  requires_approval: false,
  operation_type: 'read',
  handler: async (input, client: FrappeAPIClient) => {
    const tools = new ErpNextTools(client);
    return tools.listDocTypes(input);
  },
};

