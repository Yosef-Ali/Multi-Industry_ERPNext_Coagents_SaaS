import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { customProvider } from 'ai';
import { isTestEnvironment } from '../constants';

// ============================================
// PROVIDER SETUP
// ============================================

// Direct Google Gemini API (FREE)
const google = createGoogleGenerativeAI({
	apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

// OpenRouter API (PAID - better rate limits)
const openrouter = createOpenRouter({
	apiKey: process.env.OPENROUTER_API_KEY,
});

// ============================================
// CUSTOM PROVIDER CONFIGURATION
// Supports both free (Google direct) and paid (OpenRouter) models
// ============================================

export const myProvider = isTestEnvironment
	? (() => {
		const { artifactModel, chatModel, reasoningModel, titleModel } = require('./models.mock');
		return customProvider({
			languageModels: {
				'chat-model': chatModel,
				'chat-model-reasoning': reasoningModel,
				'title-model': titleModel,
				'artifact-model': artifactModel,
			},
		});
	})()
	: customProvider({
		languageModels: {
			// Google direct API (free)
			'gemini-2.5-pro': google('gemini-2.5-pro'),

			// Legacy model IDs (for backward compatibility with cached cookies)
			'gemini-2.0-flash-exp': google('gemini-2.5-pro'), // Redirect old ID to new model

			// OpenRouter models
			'meta-llama/llama-3.3-70b-instruct:free': openrouter('meta-llama/llama-3.3-70b-instruct:free'),
			'z-ai/glm-4.6': openrouter('z-ai/glm-4.6'),
			'google/gemini-2.5-flash-lite-preview-09-2025': openrouter('google/gemini-2.5-flash-lite-preview-09-2025'),
			'mistralai/mistral-small-3.2-24b-instruct': openrouter('mistralai/mistral-small-3.2-24b-instruct'),
			'mistralai/mixtral-8x7b-instruct': openrouter('mistralai/mixtral-8x7b-instruct'),

			// Fallback models
			'title-model': google('gemini-2.5-pro'),
			'artifact-model': google('gemini-2.5-pro'),
		},
	});

// ============================================
// HELPER FUNCTIONS
// ============================================

/**
 * Model ID to Provider mapping
 * Used to determine which provider to use for a given model
 */
const MODEL_PROVIDER_MAP: Record<string, 'google' | 'openrouter'> = {
	// Google direct API models (free tier)
	'gemini-2.5-pro': 'google',
	'gemini-2.5-flash': 'google',
	'gemini-2.0-flash-exp': 'google', // Legacy - redirects to gemini-2.5-pro

	// OpenRouter models
	'google/gemini-2.5-flash-lite-preview-09-2025': 'openrouter',
	'z-ai/glm-4.6': 'openrouter',
	'meta-llama/llama-3.3-70b-instruct:free': 'openrouter',
	'mistralai/mistral-small-3.2-24b-instruct': 'openrouter',
	'mistralai/mixtral-8x7b-instruct': 'openrouter',
};

/**
 * Detect provider from model ID
 */
function detectProvider(modelId: string): 'google' | 'openrouter' {
	// Check explicit mapping first
	if (MODEL_PROVIDER_MAP[modelId]) {
		return MODEL_PROVIDER_MAP[modelId];
	}

	// Heuristics for unmapped models
	// Google models start with 'gemini-'
	if (modelId.startsWith('gemini-')) {
		return 'google';
	}

	// Models with '/' are typically OpenRouter format (org/model)
	if (modelId.includes('/')) {
		return 'openrouter';
	}

	// Default to OpenRouter for unknown models
	console.warn(`[Providers] Unknown model ID: ${modelId}, defaulting to OpenRouter`);
	return 'openrouter';
}

/**
 * Get language model by ID (Enhanced)
 *
 * Auto-detects provider from model ID and returns appropriate language model.
 * Falls back to provider map heuristics for unknown models.
 *
 * @param modelId - Model ID (e.g., 'gemini-2.5-pro', 'z-ai/glm-4.6')
 * @returns Language model instance
 */
export function getLanguageModel(modelId: string) {
	if (isTestEnvironment) {
		const { chatModel } = require('./models.mock');
		return chatModel;
	}

	const provider = detectProvider(modelId);

	if (provider === 'google') {
		// Normalize legacy IDs
		let normalizedId = modelId;
		if (modelId === 'gemini-2.0-flash-exp') {
			normalizedId = 'gemini-2.5-pro';
			console.log(`[Providers] Normalized legacy ID: ${modelId} → ${normalizedId}`);
		}

		return google(normalizedId);
	}

	// OpenRouter models
	return openrouter(modelId);
}

/**
 * Validate model is available in provider configuration
 *
 * @param modelId - Model ID to validate
 * @returns true if model can be loaded, false otherwise
 */
export function isModelConfigured(modelId: string): boolean {
	try {
		const provider = detectProvider(modelId);

		if (provider === 'google') {
			// Check if Google API key is configured
			return !!process.env.GOOGLE_GENERATIVE_AI_API_KEY;
		}

		if (provider === 'openrouter') {
			// Check if OpenRouter API key is configured
			return !!process.env.OPENROUTER_API_KEY;
		}

		return false;
	} catch (error) {
		console.error(`[Providers] Error checking model configuration:`, error);
		return false;
	}
}
