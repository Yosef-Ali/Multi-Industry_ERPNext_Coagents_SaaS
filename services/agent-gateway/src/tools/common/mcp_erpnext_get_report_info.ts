import type { ToolDefinition } from '../../tools/registry';
import { ErpNextTools } from '../../mcp/erpnext';
import type { FrappeAPIClient } from '../../api';

export const mcp_erpnext_get_report_info_tool: ToolDefinition = {
  name: 'mcp_erpnext_get_report_info',
  description: 'Get single Report document (metadata/details).',
  inputSchema: ErpNextTools.GetReportInfoInput,
  requires_approval: false,
  operation_type: 'read',
  handler: async (input, client: FrappeAPIClient) => {
    const tools = new ErpNextTools(client);
    return tools.getReportInfo(input);
  },
};

