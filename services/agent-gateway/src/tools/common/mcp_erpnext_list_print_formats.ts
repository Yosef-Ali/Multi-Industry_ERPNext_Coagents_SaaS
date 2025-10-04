import type { ToolDefinition } from '../../tools/registry';
import { ErpNextTools } from '../../mcp/erpnext';
import type { FrappeAPIClient } from '../../api';

export const mcp_erpnext_list_print_formats_tool: ToolDefinition = {
  name: 'mcp_erpnext_list_print_formats',
  description: 'List Print Formats (optionally for a specific DocType).',
  inputSchema: ErpNextTools.ListPrintFormatsInput,
  requires_approval: false,
  operation_type: 'read',
  handler: async (input, client: FrappeAPIClient) => {
    const tools = new ErpNextTools(client);
    return tools.listPrintFormats(input);
  },
};

