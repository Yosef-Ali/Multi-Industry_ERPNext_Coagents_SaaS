import type { ToolDefinition } from '../../tools/registry';
import { ErpNextTools } from '../../mcp/erpnext';
import type { FrappeAPIClient } from '../../api';

export const mcp_erpnext_list_auto_repeat_tool: ToolDefinition = {
  name: 'mcp_erpnext_list_auto_repeat',
  description: 'List Auto Repeat entries (optionally by reference_doctype or status).',
  inputSchema: ErpNextTools.ListAutoRepeatInput,
  requires_approval: false,
  operation_type: 'read',
  handler: async (input, client: FrappeAPIClient) => {
    const tools = new ErpNextTools(client);
    return tools.listAutoRepeat(input);
  },
};

