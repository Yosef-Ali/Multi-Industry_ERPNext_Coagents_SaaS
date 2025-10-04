import { z } from 'zod';
import type { ToolDefinition } from '../../tools/registry';
import { ErpNextTools, RunReportInput, RunReportOutput } from '../../mcp/erpnext';
import type { FrappeAPIClient } from '../../api';

export const mcp_erpnext_run_report_tool: ToolDefinition = {
  name: 'mcp_erpnext_run_report',
  description: 'Run an ERPNext query report with optional filters (read-only).',
  inputSchema: RunReportInput,
  requires_approval: false,
  operation_type: 'read',
  handler: async (
    input: z.infer<typeof RunReportInput>,
    client: FrappeAPIClient,
    _userId: string,
    _sessionId: string
  ): Promise<z.infer<typeof RunReportOutput>> => {
    const tools = new ErpNextTools(client);
    return tools.runReport(input);
  },
};

