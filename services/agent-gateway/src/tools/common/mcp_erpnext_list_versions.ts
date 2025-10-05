import type { ToolDefinition } from '../../tools/registry';
import { ErpNextTools } from '../../mcp/erpnext';
import type { FrappeAPIClient } from '../../api';

export const mcp_erpnext_list_versions_tool: ToolDefinition = {
  name: 'mcp_erpnext_list_versions',
  description: 'List Version (audit trail) entries for a specific document.',
  inputSchema: ErpNextTools.ListVersionsInput,
  requires_approval: false,
  operation_type: 'read',
  handler: async (input, client: FrappeAPIClient) => {
    const tools = new ErpNextTools(client);
    return tools.listVersions(input);
  },
};

