import type { ToolDefinition } from '../../tools/registry';
import { ErpNextTools } from '../../mcp/erpnext';
import type { FrappeAPIClient } from '../../api';

export const mcp_erpnext_list_custom_fields_tool: ToolDefinition = {
  name: 'mcp_erpnext_list_custom_fields',
  description: 'List Custom Fields (optionally for a DocType).',
  inputSchema: ErpNextTools.ListCustomFieldsInput,
  requires_approval: false,
  operation_type: 'read',
  handler: async (input, client: FrappeAPIClient) => {
    const tools = new ErpNextTools(client);
    return tools.listCustomFields(input);
  },
};

