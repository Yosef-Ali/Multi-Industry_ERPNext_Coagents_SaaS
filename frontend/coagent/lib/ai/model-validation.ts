/**
 * Model Validation Utilities
 *
 * Runtime validation of model IDs against available models
 * Ensures requests use valid, configured models
 */

import { fetchAvailableModels, getModelByIdWithFallback, type ChatModel } from './models';
import { isModelConfigured } from './providers';

export type ModelValidationResult = {
  isValid: boolean;
  model?: ChatModel;
  error?: string;
  suggestedModel?: ChatModel;
};

/**
 * Validate model ID against available models from backend
 *
 * @param modelId - Model ID to validate
 * @param userTier - User tier for entitlement check
 * @returns Validation result with model or error
 */
export async function validateModelId(
  modelId: string,
  userTier: 'guest' | 'regular' | 'premium' = 'guest'
): Promise<ModelValidationResult> {
  try {
    // Fetch available models from backend
    const availableModels = await fetchAvailableModels();

    // Try to find model (handles legacy IDs)
    const model = getModelByIdWithFallback(modelId, availableModels);

    if (!model) {
      // Model not found in registry
      const suggestedModel = availableModels.find(m => m.available) || availableModels[0];

      return {
        isValid: false,
        error: `Model '${modelId}' not found in registry`,
        suggestedModel,
      };
    }

    // Check if model is available
    if (model.available === false) {
      const suggestedModel = availableModels.find(m => m.available && m.tier === model.tier) || availableModels[0];

      return {
        isValid: false,
        model,
        error: `Model '${modelId}' is currently unavailable`,
        suggestedModel,
      };
    }

    // Check if model is configured (API keys available)
    if (!isModelConfigured(model.id)) {
      const suggestedModel = availableModels.find(m => m.available && isModelConfigured(m.id)) || availableModels[0];

      return {
        isValid: false,
        model,
        error: `Model '${modelId}' requires API key configuration`,
        suggestedModel,
      };
    }

    // Valid model
    return {
      isValid: true,
      model,
    };

  } catch (error) {
    console.error('[ModelValidation] Error validating model:', error);

    return {
      isValid: false,
      error: 'Failed to validate model',
    };
  }
}

/**
 * Validate and get model, or fallback to default
 *
 * @param modelId - Model ID to validate
 * @param defaultModelId - Fallback model ID
 * @returns Validated model ID (original or fallback)
 */
export async function validateOrFallback(
  modelId: string,
  defaultModelId: string = 'gemini-2.5-pro'
): Promise<string> {
  const validation = await validateModelId(modelId);

  if (validation.isValid) {
    return modelId;
  }

  console.warn(
    `[ModelValidation] Invalid model '${modelId}': ${validation.error}. Falling back to '${validation.suggestedModel?.id || defaultModelId}'`
  );

  return validation.suggestedModel?.id || defaultModelId;
}

/**
 * Validate model synchronously (for client-side quick checks)
 *
 * @param modelId - Model ID to validate
 * @param availableModels - Pre-fetched available models
 * @returns true if model is valid
 */
export function validateModelSync(modelId: string, availableModels: ChatModel[]): boolean {
  const model = getModelByIdWithFallback(modelId, availableModels);

  if (!model) {
    return false;
  }

  if (model.available === false) {
    return false;
  }

  return true;
}

/**
 * Get validated model or throw error
 *
 * @param modelId - Model ID to validate
 * @throws Error if model is invalid
 * @returns Validated model
 */
export async function getValidatedModel(modelId: string): Promise<ChatModel> {
  const validation = await validateModelId(modelId);

  if (!validation.isValid || !validation.model) {
    throw new Error(validation.error || 'Invalid model');
  }

  return validation.model;
}
