import type { ToolDefinition } from '../../tools/registry';
import { ErpNextTools } from '../../mcp/erpnext';
import type { FrappeAPIClient } from '../../api';

export const mcp_erpnext_list_link_fields_tool: ToolDefinition = {
  name: 'mcp_erpnext_list_link_fields',
  description: 'List Link fields for a DocType (optionally filter by target DocType).',
  inputSchema: ErpNextTools.ListLinkFieldsInput,
  requires_approval: false,
  operation_type: 'read',
  handler: async (input, client: FrappeAPIClient) => {
    const tools = new ErpNextTools(client);
    return tools.listLinkFields(input);
  },
};

