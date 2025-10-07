/**
 * Models API Proxy
 *
 * Proxies requests to agent-gateway /api/models with caching
 * Features:
 * - 1-hour cache using Next.js unstable_cache
 * - Graceful fallback to static catalog on error
 * - Session-based entitlement filtering
 */

import { unstable_cache as cache } from 'next/cache';
import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/session';
import type { UserType } from '@/lib/session';

// ============================================
// TYPES
// ============================================

export type ModelCapabilities = {
  supportsTools: boolean;
  supportsStreaming: boolean;
  supportsVision: boolean;
  supportsJSON: boolean;
  maxContextWindow: number;
};

export type ModelPricing = {
  inputCostPer1K: number;
  outputCostPer1K: number;
  currency: string;
  isFree: boolean;
};

export type ModelProvider = 'google' | 'openrouter' | 'cloudflare' | 'anthropic';
export type ModelTier = 'free' | 'paid';

export type AvailableModel = {
  id: string;
  name: string;
  description: string;
  provider: ModelProvider;
  tier: ModelTier;
  capabilities: ModelCapabilities;
  pricing: ModelPricing;
  available: boolean;
  legacyIds?: string[];
  metadata?: Record<string, unknown>;
};

// ============================================
// STATIC FALLBACK CATALOG
// ============================================

/**
 * Minimal static fallback - Used when agent-gateway is unreachable
 */
const FALLBACK_MODELS: AvailableModel[] = [
  {
    id: 'gemini-2.5-pro',
    name: 'Gemini 2.5 Pro',
    description: 'Most capable - Best quality (Free)',
    provider: 'google',
    tier: 'free',
    capabilities: {
      supportsTools: true,
      supportsStreaming: true,
      supportsVision: true,
      supportsJSON: true,
      maxContextWindow: 2000000,
    },
    pricing: {
      inputCostPer1K: 0,
      outputCostPer1K: 0,
      currency: 'USD',
      isFree: true,
    },
    available: true,
  },
  {
    id: 'google/gemini-2.5-flash-lite-preview-09-2025',
    name: 'Gemini 2.5 Flash Lite',
    description: 'Lightweight and fast (Free)',
    provider: 'openrouter',
    tier: 'free',
    capabilities: {
      supportsTools: true,
      supportsStreaming: true,
      supportsVision: false,
      supportsJSON: true,
      maxContextWindow: 1000000,
    },
    pricing: {
      inputCostPer1K: 0,
      outputCostPer1K: 0,
      currency: 'USD',
      isFree: true,
    },
    available: true,
  },
  {
    id: 'z-ai/glm-4.6',
    name: 'GLM-4.6',
    description: 'Alternative reasoning model (Free)',
    provider: 'openrouter',
    tier: 'free',
    capabilities: {
      supportsTools: true,
      supportsStreaming: true,
      supportsVision: false,
      supportsJSON: true,
      maxContextWindow: 128000,
    },
    pricing: {
      inputCostPer1K: 0,
      outputCostPer1K: 0,
      currency: 'USD',
      isFree: true,
    },
    available: true,
  },
];

// ============================================
// CACHED FETCH FUNCTION
// ============================================

/**
 * Fetch models from agent-gateway with caching
 */
const fetchModelsFromGateway = cache(
  async (userTier: string): Promise<AvailableModel[]> => {
    const gatewayUrl =
      process.env.AGENT_GATEWAY_URL || process.env.NEXT_PUBLIC_AGENT_GATEWAY_URL || 'http://localhost:3001';

    try {
      console.log(`[ModelsAPI] Fetching models from gateway: ${gatewayUrl}`);

      const url = new URL('/api/models', gatewayUrl);
      url.searchParams.set('tier', userTier);

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

      if (!data.models || !Array.isArray(data.models)) {
        throw new Error('Invalid response format from gateway');
      }

      console.log(`[ModelsAPI] ✅ Fetched ${data.models.length} models from gateway`);

      return data.models as AvailableModel[];
    } catch (error) {
      console.error('[ModelsAPI] ⚠️ Failed to fetch from gateway:', error);
      console.log('[ModelsAPI] Falling back to static catalog');

      // Return fallback catalog
      return FALLBACK_MODELS;
    }
  },
  ['models-cache'], // Cache key
  {
    revalidate: 3600, // 1 hour
    tags: ['models'],
  }
);

// ============================================
// API ROUTE
// ============================================

export async function GET(request: NextRequest) {
  try {
    // Get user session
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json(
        {
          error: 'Unauthorized',
          message: 'User session required',
        },
        { status: 401 }
      );
    }

    const userType: UserType = session.user.type;

    // Map user type to tier
    const userTier = userType === 'guest' ? 'guest' : 'regular';

    // Fetch models (cached)
    const models = await fetchModelsFromGateway(userTier);

    // Return models
    return NextResponse.json({
      models,
      meta: {
        total: models.length,
        userTier,
        cached: true,
        timestamp: new Date().toISOString(),
      },
    });
  } catch (error) {
    console.error('[ModelsAPI] Error in API route:', error);

    // Fallback to static catalog on any error
    return NextResponse.json({
      models: FALLBACK_MODELS,
      meta: {
        total: FALLBACK_MODELS.length,
        userTier: 'guest',
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

    // Revalidate models cache
    revalidateTag('models');

    return NextResponse.json({
      success: true,
      message: 'Models cache revalidated',
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    console.error('[ModelsAPI] Error revalidating cache:', error);

    return NextResponse.json(
      {
        error: 'Failed to revalidate cache',
        message: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 }
    );
  }
}
