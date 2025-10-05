import type { ToolDefinition } from '../../tools/registry';
import { ErpNextTools } from '../../mcp/erpnext';
import type { FrappeAPIClient } from '../../api';

export const mcp_erpnext_list_dashboard_charts_tool: ToolDefinition = {
  name: 'mcp_erpnext_list_dashboard_charts',
  description: 'List Dashboard Charts (optionally filter by document_type).',
  inputSchema: ErpNextTools.ListDashboardChartsInput,
  requires_approval: false,
  operation_type: 'read',
  handler: async (input, client: FrappeAPIClient) => {
    const tools = new ErpNextTools(client);
    return tools.listDashboardCharts(input);
  },
};

