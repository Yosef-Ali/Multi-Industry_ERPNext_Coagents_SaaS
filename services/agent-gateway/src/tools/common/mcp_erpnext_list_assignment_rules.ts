import type { ToolDefinition } from '../../tools/registry';
import { ErpNextTools } from '../../mcp/erpnext';
import type { FrappeAPIClient } from '../../api';

export const mcp_erpnext_list_assignment_rules_tool: ToolDefinition = {
  name: 'mcp_erpnext_list_assignment_rules',
  description: 'List Assignment Rules (optionally by document_type and disabled filter).',
  inputSchema: ErpNextTools.ListAssignmentRulesInput,
  requires_approval: false,
  operation_type: 'read',
  handler: async (input, client: FrappeAPIClient) => {
    const tools = new ErpNextTools(client);
    return tools.listAssignmentRules(input);
  },
};

