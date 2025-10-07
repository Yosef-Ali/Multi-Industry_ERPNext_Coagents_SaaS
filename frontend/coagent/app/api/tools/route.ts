/**
 * Tools API Proxy
 *
 * Proxies requests to agent-gateway /api/tools with caching
 * Features:
 * - 1-hour cache using Next.js unstable_cache
 * - Graceful fallback to empty array on error
 * - Industry-based filtering support
 */

import { unstable_cache as cache } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/session';

// ============================================
// TYPES (should match lib/tools/registry.ts)
// ============================================

export type ToolOperationType = 'read' | 'create' | 'update' | 'delete' | 'submit' | 'cancel' | 'bulk';

export type AvailableTool = {
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
  tools: AvailableTool[];
  meta: {
    total: number;
    industries: string[];
    stats?: any;
  };
};

// ============================================
// CACHED FETCH FUNCTION
// ============================================

/**
 * Fetch tools from agent-gateway with caching
 */
const fetchToolsFromGateway = cache(
  async (industries: string[] = []): Promise<ToolsResponse> => {
    const gatewayUrl =
      process.env.AGENT_GATEWAY_URL || process.env.NEXT_PUBLIC_AGENT_GATEWAY_URL || 'http://localhost:3001';

    try {
      console.log(`[ToolsAPI] Fetching tools from gateway: ${gatewayUrl}`);

      const url = new URL('/api/tools', gatewayUrl);
      if (industries.length > 0) {
        url.searchParams.set('industries', industries.join(','));
      }

      const response = await fetch(url.toString(), {
        headers: {
          'Content-Type': 'application/json',
        },
        // Timeout after 5 seconds
        signal: AbortSignal.timeout(5000),
      });

      if (!response.ok) {
        throw new Error(`Gateway returned ${response.status}: ${response.statusText}`);
      }

      const data = await response.json();

      if (!data.tools || !Array.isArray(data.tools)) {
        throw new Error('Invalid response format from gateway');
      }

      console.log(`[ToolsAPI] ✅ Fetched ${data.tools.length} tools from gateway`);

      return {
        tools: data.tools,
        meta: data.meta || {
          total: data.tools.length,
          industries: industries,
        },
      };
    } catch (error) {
      console.error('[ToolsAPI] ⚠️ Failed to fetch from gateway:', error);
      console.log('[ToolsAPI] Falling back to empty tool list');

      // Return empty array on error (graceful fallback)
      return {
        tools: [],
        meta: {
          total: 0,
          industries: industries,
          error: error instanceof Error ? error.message : 'Unknown error',
        },
      };
    }
  },
  ['tools-cache'], // Cache key
  {
    revalidate: 3600, // 1 hour
    tags: ['tools'],
  }
);

// ============================================
// API ROUTE
// ============================================

export async function GET(request: NextRequest) {
  try {
    // Get user session (optional - tools can be public)
    const session = await auth();

    // Parse query parameters
    const { searchParams } = new URL(request.url);
    const industriesParam = searchParams.get('industries');
    const industries = industriesParam ? industriesParam.split(',').map(i => i.trim()) : [];

    // Fetch tools (cached)
    const data = await fetchToolsFromGateway(industries);

    // Return tools
    return NextResponse.json({
      tools: data.tools,
      meta: {
        ...data.meta,
        cached: true,
        timestamp: new Date().toISOString(),
        userId: session?.user?.id,
      },
    });
  } catch (error) {
    console.error('[ToolsAPI] Error in API route:', error);

    // Fallback to empty array on any error
    return NextResponse.json({
      tools: [],
      meta: {
        total: 0,
        industries: [],
        fallback: true,
        error: error instanceof Error ? error.message : 'Unknown error',
        timestamp: new Date().toISOString(),
      },
    });
  }
}

/**
 * Revalidate cache on demand
 */
export async function POST(request: NextRequest) {
  try {
    const { revalidateTag } = await import('next/cache');

    // Revalidate tools cache
    revalidateTag('tools');

    return NextResponse.json({
      success: true,
      message: 'Tools cache revalidated',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[ToolsAPI] Error revalidating cache:', error);

    return NextResponse.json(
      {
        error: 'Failed to revalidate cache',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
