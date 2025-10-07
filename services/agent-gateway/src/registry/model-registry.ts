/**
 * Model Registry Service
 *
 * Centralized model registry that aggregates models from all configured providers.
 * Features:
 * - Daily auto-refresh from OpenRouter API (best-effort)
 * - Static fallback catalog for offline/restricted environments
 * - Legacy model ID normalization
 * - Entitlement-based filtering (guest/regular tiers)
 * - Model capability metadata (context, cost, tools, streaming)
 */

import { z } from 'zod';

// ============================================
// TYPES & SCHEMAS
// ============================================

export const ModelCapabilities = z.object({
  supportsTools: z.boolean().default(true),
  supportsStreaming: z.boolean().default(true),
  supportsVision: z.boolean().default(false),
  supportsJSON: z.boolean().default(true),
  maxContextWindow: z.number().int().positive(),
});

export const ModelPricing = z.object({
  inputCostPer1K: z.number().nonnegative(),
  outputCostPer1K: z.number().nonnegative(),
  currency: z.string().default('USD'),
  isFree: z.boolean(),
});

export const ModelProvider = z.enum(['google', 'openrouter', 'cloudflare', 'anthropic']);

export const ModelTier = z.enum(['free', 'paid']);

export const RegisteredModel = z.object({
  id: z.string(),
  name: z.string(),
  description: z.string(),
  provider: ModelProvider,
  tier: ModelTier,
  capabilities: ModelCapabilities,
  pricing: ModelPricing,
  available: z.boolean().default(true),
  legacyIds: z.array(z.string()).optional(), // For backward compatibility
  metadata: z.record(z.unknown()).optional(),
});

export type ModelCapabilities = z.infer<typeof ModelCapabilities>;
export type ModelPricing = z.infer<typeof ModelPricing>;
export type ModelProvider = z.infer<typeof ModelProvider>;
export type ModelTier = z.infer<typeof ModelTier>;
export type RegisteredModel = z.infer<typeof RegisteredModel>;

export type UserTier = 'guest' | 'regular' | 'premium';

// ============================================
// STATIC FALLBACK CATALOG
// ============================================

/**
 * Static model catalog - Used as fallback when API fetch fails
 * Updated manually to match production models
 */
const STATIC_MODEL_CATALOG: RegisteredModel[] = [
  // Google Gemini (Free tier)
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
    legacyIds: ['gemini-2.0-flash-exp'], // Map old ID to new
  },

  // OpenRouter Gemini Flash Lite
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

  // GLM-4.6 via OpenRouter
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

  // Llama 3.3 70B (Free tier via OpenRouter)
  {
    id: 'meta-llama/llama-3.3-70b-instruct:free',
    name: 'Llama 3.3 70B Instruct',
    description: 'High-quality open model (Free)',
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

  // Mistral Small (Paid)
  {
    id: 'mistralai/mistral-small-3.2-24b-instruct',
    name: 'Mistral Small 3.2',
    description: 'Fast and efficient (Low cost)',
    provider: 'openrouter',
    tier: 'paid',
    capabilities: {
      supportsTools: true,
      supportsStreaming: true,
      supportsVision: false,
      supportsJSON: true,
      maxContextWindow: 128000,
    },
    pricing: {
      inputCostPer1K: 0.0002,
      outputCostPer1K: 0.0006,
      currency: 'USD',
      isFree: false,
    },
    available: true,
  },
];

// ============================================
// MODEL REGISTRY CLASS
// ============================================

export class ModelRegistry {
  private models: Map<string, RegisteredModel> = new Map();
  private legacyIdMap: Map<string, string> = new Map();
  private lastRefresh: Date | null = null;
  private refreshInterval: number = 24 * 60 * 60 * 1000; // 24 hours

  constructor() {
    this.loadStaticCatalog();
  }

  /**
   * Load static catalog into registry
   */
  private loadStaticCatalog(): void {
    console.log('[ModelRegistry] Loading static catalog...');

    for (const model of STATIC_MODEL_CATALOG) {
      this.models.set(model.id, model);

      // Map legacy IDs
      if (model.legacyIds) {
        for (const legacyId of model.legacyIds) {
          this.legacyIdMap.set(legacyId, model.id);
        }
      }
    }

    console.log(`[ModelRegistry] Loaded ${this.models.size} models from static catalog`);
    this.lastRefresh = new Date();
  }

  /**
   * Refresh model catalog from OpenRouter API (best-effort)
   */
  async refreshFromOpenRouter(): Promise<void> {
    const apiKey = process.env.OPENROUTER_API_KEY;

    if (!apiKey) {
      console.log('[ModelRegistry] No OpenRouter API key - using static catalog only');
      return;
    }

    try {
      console.log('[ModelRegistry] Fetching models from OpenRouter API...');

      const response = await fetch('https://openrouter.ai/api/v1/models', {
        headers: {
          'Authorization': `Bearer ${apiKey}`,
        },
      });

      if (!response.ok) {
        throw new Error(`OpenRouter API error: ${response.status}`);
      }

      const data = await response.json();

      if (!data.data || !Array.isArray(data.data)) {
        throw new Error('Invalid response format from OpenRouter');
      }

      let updatedCount = 0;

      for (const apiModel of data.data) {
        // Only process models we're interested in (free tier or specific paid models)
        const modelId = apiModel.id;

        // Check if this model is in our static catalog
        const existingModel = this.models.get(modelId);

        if (existingModel) {
          // Update pricing and availability from API
          const updatedModel: RegisteredModel = {
            ...existingModel,
            pricing: {
              inputCostPer1K: apiModel.pricing?.prompt || existingModel.pricing.inputCostPer1K,
              outputCostPer1K: apiModel.pricing?.completion || existingModel.pricing.outputCostPer1K,
              currency: 'USD',
              isFree: (apiModel.pricing?.prompt || 0) === 0 && (apiModel.pricing?.completion || 0) === 0,
            },
            capabilities: {
              ...existingModel.capabilities,
              maxContextWindow: apiModel.context_length || existingModel.capabilities.maxContextWindow,
            },
            available: true,
          };

          this.models.set(modelId, updatedModel);
          updatedCount++;
        }
      }

      this.lastRefresh = new Date();
      console.log(`[ModelRegistry] ✅ Refreshed ${updatedCount} models from OpenRouter API`);

    } catch (error) {
      console.warn('[ModelRegistry] ⚠️ Failed to refresh from OpenRouter API:', error);
      console.log('[ModelRegistry] Falling back to static catalog');
    }
  }

  /**
   * Auto-refresh if needed (daily)
   */
  async autoRefreshIfNeeded(): Promise<void> {
    if (!this.lastRefresh) {
      await this.refreshFromOpenRouter();
      return;
    }

    const elapsed = Date.now() - this.lastRefresh.getTime();

    if (elapsed > this.refreshInterval) {
      console.log('[ModelRegistry] Auto-refresh triggered (24h elapsed)');
      await this.refreshFromOpenRouter();
    }
  }

  /**
   * Normalize model ID (handle legacy IDs)
   */
  normalizeModelId(modelId: string): string {
    // Check if this is a legacy ID
    const canonicalId = this.legacyIdMap.get(modelId);

    if (canonicalId) {
      console.log(`[ModelRegistry] Normalized legacy ID: ${modelId} → ${canonicalId}`);
      return canonicalId;
    }

    return modelId;
  }

  /**
   * Get model by ID
   */
  getModel(modelId: string): RegisteredModel | undefined {
    const normalizedId = this.normalizeModelId(modelId);
    return this.models.get(normalizedId);
  }

  /**
   * Get all models
   */
  getAllModels(): RegisteredModel[] {
    return Array.from(this.models.values());
  }

  /**
   * Get models by provider
   */
  getModelsByProvider(provider: ModelProvider): RegisteredModel[] {
    return this.getAllModels().filter(m => m.provider === provider);
  }

  /**
   * Get models by tier
   */
  getModelsByTier(tier: ModelTier): RegisteredModel[] {
    return this.getAllModels().filter(m => m.tier === tier);
  }

  /**
   * Get models available for user tier
   */
  getModelsForUserTier(userTier: UserTier): RegisteredModel[] {
    const allModels = this.getAllModels();

    switch (userTier) {
      case 'guest':
        // Guests get free models only
        return allModels.filter(m => m.tier === 'free');

      case 'regular':
        // Regular users get free models only (for now)
        return allModels.filter(m => m.tier === 'free');

      case 'premium':
        // Premium users get all models
        return allModels;

      default:
        return allModels.filter(m => m.tier === 'free');
    }
  }

  /**
   * Check if model is available
   */
  isModelAvailable(modelId: string): boolean {
    const model = this.getModel(modelId);
    return model?.available || false;
  }

  /**
   * Get registry stats
   */
  getStats(): {
    totalModels: number;
    byProvider: Record<string, number>;
    byTier: Record<string, number>;
    freeModels: number;
    lastRefresh: Date | null;
  } {
    const allModels = this.getAllModels();

    const byProvider: Record<string, number> = {};
    const byTier: Record<string, number> = {};

    for (const model of allModels) {
      byProvider[model.provider] = (byProvider[model.provider] || 0) + 1;
      byTier[model.tier] = (byTier[model.tier] || 0) + 1;
    }

    return {
      totalModels: this.models.size,
      byProvider,
      byTier,
      freeModels: allModels.filter(m => m.pricing.isFree).length,
      lastRefresh: this.lastRefresh,
    };
  }
}

// ============================================
// SINGLETON INSTANCE
// ============================================

let globalRegistry: ModelRegistry | null = null;

/**
 * Get or create global model registry
 */
export function getModelRegistry(): ModelRegistry {
  if (!globalRegistry) {
    globalRegistry = new ModelRegistry();
  }
  return globalRegistry;
}

/**
 * Initialize registry with auto-refresh
 */
export async function initializeModelRegistry(): Promise<ModelRegistry> {
  const registry = getModelRegistry();
  await registry.autoRefreshIfNeeded();
  return registry;
}

/**
 * Reset global registry (for testing)
 */
export function resetModelRegistry(): void {
  globalRegistry = null;
}
