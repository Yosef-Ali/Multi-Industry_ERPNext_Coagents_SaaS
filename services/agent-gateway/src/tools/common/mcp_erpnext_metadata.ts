import { z } from 'zod';
import type { ToolDefinition } from '../../tools/registry';
import { ErpNextTools, IntrospectDocTypeInput, IntrospectDocTypeOutput } from '../../mcp/erpnext';
import type { FrappeAPIClient } from '../../api';

export const mcp_erpnext_introspect_doctype_tool: ToolDefinition = {
  name: 'mcp_erpnext_introspect_doctype',
  description: 'Read-only DocType metadata (fields, types, required flags).',
  inputSchema: IntrospectDocTypeInput,
  requires_approval: false,
  operation_type: 'read',
  handler: async (
    input: z.infer<typeof IntrospectDocTypeInput>,
    client: FrappeAPIClient,
    _userId: string,
    _sessionId: string
  ): Promise<z.infer<typeof IntrospectDocTypeOutput>> => {
    const tools = new ErpNextTools(client);
    return tools.introspectDocType(input);
  },
};

