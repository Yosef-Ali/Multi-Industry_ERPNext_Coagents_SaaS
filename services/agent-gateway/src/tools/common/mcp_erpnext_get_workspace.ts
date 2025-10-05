import type { ToolDefinition } from '../../tools/registry';
import { ErpNextTools } from '../../mcp/erpnext';
import type { FrappeAPIClient } from '../../api';

export const mcp_erpnext_get_workspace_tool: ToolDefinition = {
  name: 'mcp_erpnext_get_workspace',
  description: 'Get a Workspace by name.',
  inputSchema: ErpNextTools.GetWorkspaceInput,
  requires_approval: false,
  operation_type: 'read',
  handler: async (input, client: FrappeAPIClient) => {
    const tools = new ErpNextTools(client);
    return tools.getWorkspace(input);
  },
};

