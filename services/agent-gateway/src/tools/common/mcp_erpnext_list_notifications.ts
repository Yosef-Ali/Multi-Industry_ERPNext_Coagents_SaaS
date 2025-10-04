import type { ToolDefinition } from '../../tools/registry';
import { ErpNextTools } from '../../mcp/erpnext';
import type { FrappeAPIClient } from '../../api';

export const mcp_erpnext_list_notifications_tool: ToolDefinition = {
  name: 'mcp_erpnext_list_notifications',
  description: 'List Notifications (optionally by document_type and enabled status).',
  inputSchema: ErpNextTools.ListNotificationsInput,
  requires_approval: false,
  operation_type: 'read',
  handler: async (input, client: FrappeAPIClient) => {
    const tools = new ErpNextTools(client);
    return tools.listNotifications(input);
  },
};

