/**
 * Frontend Tools Registry Client
 *
 * Fetches available tools from agent-gateway for display in UI
 * Provides tool metadata for rendering tool calls in messages
 */

export type ToolOperationType = 'read' | 'create' | 'update' | 'delete' | 'submit' | 'cancel' | 'bulk';

export type ToolDefinition = {
  name: string;
  description: string;
  operationType: ToolOperationType;
  requiresApproval: boolean;
  industry?: string;
  inputSchema?: {
    type: string;
    description: string;
  };
};

export type ToolsResponse = {
  tools: ToolDefinition[];
  meta: {
    total: number;
    industries: string[];
    stats?: any;
  };
};

// Cache for tools (in-memory, session-duration)
let toolsCache: Map<string, ToolDefinition[]> | null = null;

/**
 * Fetch available tools from Next.js API proxy
 *
 * @param industries - Optional array of industries to filter by
 * @returns Array of tool definitions
 */
export async function fetchAvailableTools(industries: string[] = []): Promise<ToolDefinition[]> {
  const cacheKey = industries.length > 0 ? industries.sort().join(',') : 'default';

  // Check cache first
  if (toolsCache && toolsCache.has(cacheKey)) {
    console.log(`[ToolsRegistry] Using cached tools for: ${cacheKey}`);
    return toolsCache.get(cacheKey)!;
  }

  try {
    // Call Next.js API proxy (which caches with unstable_cache)
    const url = new URL('/api/tools', window.location.origin);

    if (industries.length > 0) {
      url.searchParams.set('industries', industries.join(','));
    }

    console.log(`[ToolsRegistry] Fetching tools from: ${url.toString()}`);

    const response = await fetch(url.toString(), {
      headers: {
        'Content-Type': 'application/json',
      },
      signal: AbortSignal.timeout(5000),
    });

    if (!response.ok) {
      throw new Error(`API returned ${response.status}`);
    }

    const data: ToolsResponse = await response.json();

    console.log(`[ToolsRegistry] ✅ Fetched ${data.tools.length} tools`);

    // Initialize cache if needed
    if (!toolsCache) {
      toolsCache = new Map();
    }

    // Cache the result
    toolsCache.set(cacheKey, data.tools);

    return data.tools;
  } catch (error) {
    console.error('[ToolsRegistry] Failed to fetch tools:', error);

    // Return empty array on error (graceful fallback)
    return [];
  }
}

/**
 * Get tool definition by name
 *
 * @param toolName - Name of the tool
 * @param industries - Optional industries context
 * @returns Tool definition or undefined
 */
export async function getToolDefinition(
  toolName: string,
  industries: string[] = []
): Promise<ToolDefinition | undefined> {
  const tools = await fetchAvailableTools(industries);
  return tools.find(t => t.name === toolName);
}

/**
 * Clear tools cache (for testing or force refresh)
 */
export function clearToolsCache(): void {
  toolsCache = null;
}

/**
 * Get risk level badge color based on operation type and approval requirement
 */
export function getToolRiskColor(tool: ToolDefinition): string {
  if (tool.requiresApproval) {
    return 'red'; // High risk
  }

  if (tool.operationType === 'read') {
    return 'green'; // Low risk
  }

  if (['create', 'update'].includes(tool.operationType)) {
    return 'yellow'; // Medium risk
  }

  if (['delete', 'cancel', 'submit', 'bulk'].includes(tool.operationType)) {
    return 'orange'; // Medium-high risk
  }

  return 'gray'; // Unknown
}

/**
 * Get human-readable risk level
 */
export function getToolRiskLevel(tool: ToolDefinition): 'low' | 'medium' | 'high' {
  if (tool.requiresApproval || ['delete', 'cancel', 'submit'].includes(tool.operationType)) {
    return 'high';
  }

  if (['create', 'update', 'bulk'].includes(tool.operationType)) {
    return 'medium';
  }

  return 'low';
}
