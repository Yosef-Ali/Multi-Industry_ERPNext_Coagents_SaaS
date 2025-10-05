import type { ToolDefinition } from '../../tools/registry';
import { ErpNextTools } from '../../mcp/erpnext';
import type { FrappeAPIClient } from '../../api';

export const mcp_erpnext_list_workflows_tool: ToolDefinition = {
  name: 'mcp_erpnext_list_workflows',
  description: 'List Workflows (optionally by document_type).',
  inputSchema: ErpNextTools.ListWorkflowsInput,
  requires_approval: false,
  operation_type: 'read',
  handler: async (input, client: FrappeAPIClient) => {
    const tools = new ErpNextTools(client);
    return tools.listWorkflows(input);
  },
};

