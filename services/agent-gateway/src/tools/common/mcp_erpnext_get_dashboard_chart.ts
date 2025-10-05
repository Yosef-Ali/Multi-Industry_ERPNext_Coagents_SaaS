import type { ToolDefinition } from '../../tools/registry';
import { ErpNextTools } from '../../mcp/erpnext';
import type { FrappeAPIClient } from '../../api';

export const mcp_erpnext_get_dashboard_chart_tool: ToolDefinition = {
  name: 'mcp_erpnext_get_dashboard_chart',
  description: 'Get Dashboard Chart details by name.',
  inputSchema: ErpNextTools.GetDashboardChartInput,
  requires_approval: false,
  operation_type: 'read',
  handler: async (input, client: FrappeAPIClient) => {
    const tools = new ErpNextTools(client);
    return tools.getDashboardChart(input);
  },
};

