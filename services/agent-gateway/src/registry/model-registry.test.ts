/**
 * Model Registry Tests
 *
 * Tests for model registry with fallback scenarios
 */

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import {
  ModelRegistry,
  getModelRegistry,
  resetModelRegistry,
  initializeModelRegistry,
} from './model-registry';

describe('ModelRegistry', () => {
  beforeEach(() => {
    resetModelRegistry();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('Static Catalog', () => {
    it('should load static catalog on initialization', () => {
      const registry = new ModelRegistry();
      const stats = registry.getStats();

      expect(stats.totalModels).toBeGreaterThan(0);
      expect(stats.freeModels).toBeGreaterThan(0);
      expect(stats.lastRefresh).not.toBeNull();
    });

    it('should have required models in static catalog', () => {
      const registry = new ModelRegistry();

      // Check for required free models
      expect(registry.getModel('gemini-2.5-pro')).toBeDefined();
      expect(registry.getModel('z-ai/glm-4.6')).toBeDefined();
    });

    it('should map legacy IDs correctly', () => {
      const registry = new ModelRegistry();

      const normalizedId = registry.normalizeModelId('gemini-2.0-flash-exp');
      expect(normalizedId).toBe('gemini-2.5-pro');

      const model = registry.getModel('gemini-2.0-flash-exp');
      expect(model?.id).toBe('gemini-2.5-pro');
    });
  });

  describe('Model Filtering', () => {
    it('should filter models by tier', () => {
      const registry = new ModelRegistry();

      const freeModels = registry.getModelsByTier('free');
      const paidModels = registry.getModelsByTier('paid');

      expect(freeModels.every(m => m.tier === 'free')).toBe(true);
      expect(paidModels.every(m => m.tier === 'paid')).toBe(true);
    });

    it('should filter models by provider', () => {
      const registry = new ModelRegistry();

      const googleModels = registry.getModelsByProvider('google');
      const openrouterModels = registry.getModelsByProvider('openrouter');

      expect(googleModels.every(m => m.provider === 'google')).toBe(true);
      expect(openrouterModels.every(m => m.provider === 'openrouter')).toBe(true);
    });

    it('should filter models by user tier', () => {
      const registry = new ModelRegistry();

      const guestModels = registry.getModelsForUserTier('guest');
      const regularModels = registry.getModelsForUserTier('regular');
      const premiumModels = registry.getModelsForUserTier('premium');

      // Guests get free models only
      expect(guestModels.every(m => m.tier === 'free')).toBe(true);

      // Regular users get free models only (for now)
      expect(regularModels.every(m => m.tier === 'free')).toBe(true);

      // Premium users get all models
      expect(premiumModels.length).toBeGreaterThanOrEqual(guestModels.length);
    });
  });

  describe('Model Availability', () => {
    it('should check model availability', () => {
      const registry = new ModelRegistry();

      expect(registry.isModelAvailable('gemini-2.5-pro')).toBe(true);
      expect(registry.isModelAvailable('non-existent-model')).toBe(false);
    });
  });

  describe('OpenRouter Refresh', () => {
    it('should gracefully handle failed API refresh', async () => {
      // Mock fetch to fail
      global.fetch = vi.fn().mockRejectedValue(new Error('Network error'));

      const registry = new ModelRegistry();
      await registry.refreshFromOpenRouter();

      const stats = registry.getStats();

      // Should still have static catalog
      expect(stats.totalModels).toBeGreaterThan(0);
      expect(stats.lastRefresh).not.toBeNull();
    });

    it('should skip refresh without API key', async () => {
      const originalEnv = process.env.OPENROUTER_API_KEY;
      delete process.env.OPENROUTER_API_KEY;

      const registry = new ModelRegistry();
      await registry.refreshFromOpenRouter();

      const stats = registry.getStats();

      // Should still have static catalog
      expect(stats.totalModels).toBeGreaterThan(0);

      // Restore env
      process.env.OPENROUTER_API_KEY = originalEnv;
    });

    it('should handle invalid API response gracefully', async () => {
      // Mock fetch to return invalid data
      global.fetch = vi.fn().mockResolvedValue({
        ok: true,
        json: async () => ({ invalid: 'data' }),
      });

      const registry = new ModelRegistry();
      await registry.refreshFromOpenRouter();

      const stats = registry.getStats();

      // Should still have static catalog
      expect(stats.totalModels).toBeGreaterThan(0);
    });
  });

  describe('Auto-Refresh', () => {
    it('should not refresh if recently refreshed', async () => {
      const registry = new ModelRegistry();

      // Spy on refreshFromOpenRouter
      const refreshSpy = vi.spyOn(registry as any, 'refreshFromOpenRouter');

      await registry.autoRefreshIfNeeded();

      // Should not call refresh (just initialized)
      expect(refreshSpy).not.toHaveBeenCalled();
    });
  });

  describe('Singleton', () => {
    it('should return same instance from getModelRegistry', () => {
      const registry1 = getModelRegistry();
      const registry2 = getModelRegistry();

      expect(registry1).toBe(registry2);
    });

    it('should reset singleton with resetModelRegistry', () => {
      const registry1 = getModelRegistry();
      resetModelRegistry();
      const registry2 = getModelRegistry();

      expect(registry1).not.toBe(registry2);
    });

    it('should initialize with auto-refresh', async () => {
      const registry = await initializeModelRegistry();

      expect(registry).toBeDefined();
      expect(registry.getStats().totalModels).toBeGreaterThan(0);
    });
  });

  describe('Stats', () => {
    it('should return accurate stats', () => {
      const registry = new ModelRegistry();
      const stats = registry.getStats();

      expect(stats.totalModels).toBeGreaterThan(0);
      expect(stats.byProvider).toBeDefined();
      expect(stats.byTier).toBeDefined();
      expect(stats.freeModels).toBeGreaterThan(0);
      expect(stats.lastRefresh).not.toBeNull();
    });
  });
});
