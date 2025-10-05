import type { ToolDefinition } from '../../tools/registry';
import { ErpNextTools } from '../../mcp/erpnext';
import type { FrappeAPIClient } from '../../api';

export const mcp_erpnext_list_uoms_tool: ToolDefinition = {
  name: 'mcp_erpnext_list_uoms',
  description: 'List UOMs (must_be_whole_number, enabled).',
  inputSchema: ErpNextTools.ListUOMsInput,
  requires_approval: false,
  operation_type: 'read',
  handler: async (input, client: FrappeAPIClient) => {
    const tools = new ErpNextTools(client);
    return tools.listUOMs(input);
  },
};

