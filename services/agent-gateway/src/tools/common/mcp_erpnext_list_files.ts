import type { ToolDefinition } from '../../tools/registry';
import { ErpNextTools } from '../../mcp/erpnext';
import type { FrappeAPIClient } from '../../api';

export const mcp_erpnext_list_files_tool: ToolDefinition = {
  name: 'mcp_erpnext_list_files',
  description: 'List files/attachments for a specific document.',
  inputSchema: ErpNextTools.ListFilesInput,
  requires_approval: false,
  operation_type: 'read',
  handler: async (input, client: FrappeAPIClient) => {
    const tools = new ErpNextTools(client);
    return tools.listFiles(input);
  },
};

