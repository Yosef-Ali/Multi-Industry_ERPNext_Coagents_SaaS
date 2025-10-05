import type { ToolDefinition } from '../../tools/registry';
import { ErpNextTools } from '../../mcp/erpnext';
import type { FrappeAPIClient } from '../../api';

export const mcp_erpnext_list_scheduled_jobs_tool: ToolDefinition = {
  name: 'mcp_erpnext_list_scheduled_jobs',
  description: 'List Scheduled Job Types (optionally by method).',
  inputSchema: ErpNextTools.ListScheduledJobsInput,
  requires_approval: false,
  operation_type: 'read',
  handler: async (input, client: FrappeAPIClient) => {
    const tools = new ErpNextTools(client);
    return tools.listScheduledJobs(input);
  },
};

