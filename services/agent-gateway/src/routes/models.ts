/**
 * Models API Route
 *
 * Exposes model registry via HTTP endpoints
 * - GET /api/models - List available models (filtered by user tier)
 * - GET /api/models/:id - Get specific model details
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { getModelRegistry, initializeModelRegistry, type UserTier } from '../registry/model-registry';

const router = Router();

// ============================================
// REQUEST SCHEMAS
// ============================================

const ListModelsQuerySchema = z.object({
  tier: z.enum(['guest', 'regular', 'premium']).optional(),
  provider: z.enum(['google', 'openrouter', 'cloudflare', 'anthropic']).optional(),
  onlyFree: z.enum(['true', 'false']).optional().transform(val => val === 'true'),
});

// ============================================
// ENDPOINTS
// ============================================

/**
 * GET /api/models
 * List available models with optional filtering
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    // Parse query parameters
    const query = ListModelsQuerySchema.parse(req.query);

    // Initialize registry (triggers auto-refresh if needed)
    const registry = await initializeModelRegistry();

    // Get models based on user tier
    let models = query.tier
      ? registry.getModelsForUserTier(query.tier)
      : registry.getAllModels();

    // Filter by provider if specified
    if (query.provider) {
      models = models.filter(m => m.provider === query.provider);
    }

    // Filter to free models only if specified
    if (query.onlyFree) {
      models = models.filter(m => m.pricing.isFree);
    }

    // Get registry stats
    const stats = registry.getStats();

    res.json({
      models,
      meta: {
        total: models.length,
        totalInRegistry: stats.totalModels,
        lastRefresh: stats.lastRefresh,
        filter: query,
      },
    });

  } catch (error) {
    console.error('[ModelsAPI] Error listing models:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: error.errors,
      });
    }

    res.status(500).json({
      error: 'Failed to fetch models',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/models/:id
 * Get specific model details by ID
 */
router.get('/:id', async (req: Request, res: Response) => {
  try {
    const modelId = req.params.id;

    if (!modelId) {
      return res.status(400).json({
        error: 'Model ID is required',
      });
    }

    // Initialize registry
    const registry = await initializeModelRegistry();

    // Get model (handles legacy ID normalization)
    const model = registry.getModel(modelId);

    if (!model) {
      return res.status(404).json({
        error: 'Model not found',
        modelId,
      });
    }

    res.json({
      model,
      meta: {
        requestedId: modelId,
        canonicalId: registry.normalizeModelId(modelId),
      },
    });

  } catch (error) {
    console.error('[ModelsAPI] Error fetching model:', error);

    res.status(500).json({
      error: 'Failed to fetch model',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * POST /api/models/refresh
 * Manually trigger refresh from OpenRouter API (admin only)
 */
router.post('/refresh', async (req: Request, res: Response) => {
  try {
    // TODO: Add authentication check for admin users

    const registry = getModelRegistry();

    console.log('[ModelsAPI] Manual refresh triggered');

    await registry.refreshFromOpenRouter();

    const stats = registry.getStats();

    res.json({
      success: true,
      message: 'Model registry refreshed successfully',
      stats,
    });

  } catch (error) {
    console.error('[ModelsAPI] Error refreshing models:', error);

    res.status(500).json({
      error: 'Failed to refresh models',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/models/stats
 * Get registry statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    const registry = getModelRegistry();
    const stats = registry.getStats();

    res.json({
      stats,
    });

  } catch (error) {
    console.error('[ModelsAPI] Error fetching stats:', error);

    res.status(500).json({
      error: 'Failed to fetch stats',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
