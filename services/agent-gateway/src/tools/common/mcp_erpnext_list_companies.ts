import type { ToolDefinition } from '../../tools/registry';
import { ErpNextTools } from '../../mcp/erpnext';
import type { FrappeAPIClient } from '../../api';

export const mcp_erpnext_list_companies_tool: ToolDefinition = {
  name: 'mcp_erpnext_list_companies',
  description: 'List Companies (name, abbreviation, default currency).',
  inputSchema: ErpNextTools.ListCompaniesInput,
  requires_approval: false,
  operation_type: 'read',
  handler: async (input, client: FrappeAPIClient) => {
    const tools = new ErpNextTools(client);
    return tools.listCompanies(input);
  },
};

