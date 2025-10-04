import type { ToolDefinition } from '../../tools/registry';
import { ErpNextTools } from '../../mcp/erpnext';
import type { FrappeAPIClient } from '../../api';

export const mcp_erpnext_get_installed_apps_tool: ToolDefinition = {
  name: 'mcp_erpnext_get_installed_apps',
  description: 'Get installed apps and versions (from change log).',
  inputSchema: undefined as any, // no input
  requires_approval: false,
  operation_type: 'read',
  handler: async (_input: any, client: FrappeAPIClient) => {
    const tools = new ErpNextTools(client);
    return tools.getInstalledApps();
  },
};

