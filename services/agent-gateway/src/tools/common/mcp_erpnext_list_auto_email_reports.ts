import type { ToolDefinition } from '../../tools/registry';
import { ErpNextTools } from '../../mcp/erpnext';
import type { FrappeAPIClient } from '../../api';

export const mcp_erpnext_list_auto_email_reports_tool: ToolDefinition = {
  name: 'mcp_erpnext_list_auto_email_reports',
  description: 'List Auto Email Reports (optionally by ref_doctype).',
  inputSchema: ErpNextTools.ListAutoEmailReportsInput,
  requires_approval: false,
  operation_type: 'read',
  handler: async (input, client: FrappeAPIClient) => {
    const tools = new ErpNextTools(client);
    return tools.listAutoEmailReports(input);
  },
};

