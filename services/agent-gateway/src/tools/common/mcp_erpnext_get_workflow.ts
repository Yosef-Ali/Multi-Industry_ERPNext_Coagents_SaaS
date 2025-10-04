import type { ToolDefinition } from '../../tools/registry';
import { ErpNextTools } from '../../mcp/erpnext';
import type { FrappeAPIClient } from '../../api';

export const mcp_erpnext_get_workflow_tool: ToolDefinition = {
  name: 'mcp_erpnext_get_workflow',
  description: 'Get Workflow details by name.',
  inputSchema: ErpNextTools.GetWorkflowInput,
  requires_approval: false,
  operation_type: 'read',
  handler: async (input, client: FrappeAPIClient) => {
    const tools = new ErpNextTools(client);
    return tools.getWorkflow(input);
  },
};

