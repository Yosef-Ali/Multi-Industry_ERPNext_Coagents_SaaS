import type { ToolDefinition } from '../../tools/registry';
import { ErpNextTools } from '../../mcp/erpnext';
import type { FrappeAPIClient } from '../../api';

export const mcp_erpnext_list_property_setters_tool: ToolDefinition = {
  name: 'mcp_erpnext_list_property_setters',
  description: 'List Property Setters (optionally filtered by DocType/field).',
  inputSchema: ErpNextTools.ListPropertySettersInput,
  requires_approval: false,
  operation_type: 'read',
  handler: async (input, client: FrappeAPIClient) => {
    const tools = new ErpNextTools(client);
    return tools.listPropertySetters(input);
  },
};

