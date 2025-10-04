import type { ToolDefinition } from '../../tools/registry';
import { ErpNextTools } from '../../mcp/erpnext';
import type { FrappeAPIClient } from '../../api';

export const mcp_erpnext_get_system_settings_tool: ToolDefinition = {
  name: 'mcp_erpnext_get_system_settings',
  description: 'Get System Settings (read-only).',
  inputSchema: undefined as any,
  requires_approval: false,
  operation_type: 'read',
  handler: async (_input: any, client: FrappeAPIClient) => {
    const tools = new ErpNextTools(client);
    return tools.getSystemSettings();
  },
};

