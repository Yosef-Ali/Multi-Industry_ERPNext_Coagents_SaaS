import type { ToolDefinition } from '../../tools/registry';
import { ErpNextTools } from '../../mcp/erpnext';
import type { FrappeAPIClient } from '../../api';

export const mcp_erpnext_list_workspaces_tool: ToolDefinition = {
  name: 'mcp_erpnext_list_workspaces',
  description: 'List Workspaces (optionally public only).',
  inputSchema: ErpNextTools.ListWorkspacesInput,
  requires_approval: false,
  operation_type: 'read',
  handler: async (input, client: FrappeAPIClient) => {
    const tools = new ErpNextTools(client);
    return tools.listWorkspaces(input);
  },
};

