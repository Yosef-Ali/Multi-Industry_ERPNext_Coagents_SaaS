import type { ToolDefinition } from '../../tools/registry';
import { ErpNextTools } from '../../mcp/erpnext';
import type { FrappeAPIClient } from '../../api';

export const mcp_erpnext_list_countries_tool: ToolDefinition = {
  name: 'mcp_erpnext_list_countries',
  description: 'List Countries (code, enabled).',
  inputSchema: ErpNextTools.ListCountriesInput,
  requires_approval: false,
  operation_type: 'read',
  handler: async (input, client: FrappeAPIClient) => {
    const tools = new ErpNextTools(client);
    return tools.listCountries(input);
  },
};

