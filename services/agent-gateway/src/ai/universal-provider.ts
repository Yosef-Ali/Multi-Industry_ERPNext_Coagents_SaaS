/**
 * T145: Universal AI Provider Factory
 * Creates appropriate AI provider based on configuration
 */

import {
    IAIProvider,
    AIProvider,
    AIProviderConfig,
    AIProviderError,
    AIProviderAuthError,
} from './types';
import { OpenRouterProvider, getModelInfo } from './providers/openrouter';
import {
    CloudflareProvider,
    CloudflareAI,
    isCloudflareModel,
    getRecommendedCloudflareModel,
} from './providers/cloudflare';

/**
 * Provider factory configuration
 */
export interface ProviderFactoryConfig {
    // Provider selection
    provider?: AIProvider | 'auto';

    // OpenRouter config
    openrouterApiKey?: string;
    openrouterBaseURL?: string;
    openrouterModel?: string;
    openrouterHttpReferer?: string;
    openrouterAppTitle?: string;

    // Cloudflare config
    cloudflareAI?: CloudflareAI;
    cloudflareModel?: string;

    // Auto-selection preferences
    preferFree?: boolean; // Prefer free tier when available
    maxCostPer1K?: number; // Maximum acceptable cost per 1K tokens
}

/**
 * Provider factory
 * Creates and configures AI providers
 */
export class ProviderFactory {
    /**
     * Create provider based on configuration
     */
    static async createProvider(
        config: ProviderFactoryConfig
    ): Promise<IAIProvider> {
        // Determine which provider to use
        const providerType = this.selectProvider(config);

        console.log(`[ProviderFactory] Creating ${providerType} provider`);

        switch (providerType) {
            case AIProvider.OPENROUTER:
                return this.createOpenRouterProvider(config);

            case AIProvider.CLOUDFLARE:
                return this.createCloudflareProvider(config);

            default:
                throw new AIProviderError(
                    `Unsupported provider: ${providerType}`,
                    providerType as AIProvider
                );
        }
    }

    /**
     * Select appropriate provider based on config
     */
    private static selectProvider(config: ProviderFactoryConfig): AIProvider {
        // Explicit provider selection
        if (config.provider && config.provider !== 'auto') {
            return config.provider;
        }

        // Auto-selection logic
        console.log('[ProviderFactory] Auto-selecting provider...');

        // Prefer free tier if requested
        if (config.preferFree && config.cloudflareAI) {
            console.log('[ProviderFactory] Selected Cloudflare (free tier preference)');
            return AIProvider.CLOUDFLARE;
        }

        // Check if Cloudflare model is explicitly specified
        if (config.cloudflareModel && isCloudflareModel(config.cloudflareModel)) {
            if (!config.cloudflareAI) {
                console.warn(
                    '[ProviderFactory] Cloudflare model specified but AI binding not available'
                );
            } else {
                console.log('[ProviderFactory] Selected Cloudflare (model match)');
                return AIProvider.CLOUDFLARE;
            }
        }

        // Default to OpenRouter if API key available
        if (config.openrouterApiKey) {
            console.log('[ProviderFactory] Selected OpenRouter (API key available)');
            return AIProvider.OPENROUTER;
        }

        // Fallback to Cloudflare if binding available
        if (config.cloudflareAI) {
            console.log('[ProviderFactory] Selected Cloudflare (fallback, no OpenRouter key)');
            return AIProvider.CLOUDFLARE;
        }

        throw new AIProviderError(
            'No valid AI provider configuration found. Please configure either OpenRouter API key or Cloudflare Workers AI binding.',
            AIProvider.OPENROUTER // Default for error reporting
        );
    }

    /**
     * Create OpenRouter provider
     */
    private static createOpenRouterProvider(
        config: ProviderFactoryConfig
    ): OpenRouterProvider {
        if (!config.openrouterApiKey) {
            throw new AIProviderAuthError(
                AIProvider.OPENROUTER,
                'OpenRouter API key is required'
            );
        }

        // Determine model
        let model = config.openrouterModel || process.env.OPENROUTER_MODEL;

        if (!model) {
            // Use default cost-effective model
            const defaultModel = getModelInfo('mistralai/mistral-7b-instruct');
            model = defaultModel?.id || 'mistralai/mistral-7b-instruct';
            console.log(`[ProviderFactory] Using default OpenRouter model: ${model}`);
        }

        // Apply cost constraints if specified
        if (config.maxCostPer1K) {
            const modelInfo = getModelInfo(model);
            if (
                modelInfo &&
                (modelInfo.inputCostPer1K > config.maxCostPer1K ||
                    modelInfo.outputCostPer1K > config.maxCostPer1K)
            ) {
                console.warn(
                    `[ProviderFactory] Model ${model} exceeds cost constraint, finding alternative...`
                );
                // TODO: Implement cost-based model selection
            }
        }

        return new OpenRouterProvider({
            apiKey: config.openrouterApiKey,
            baseURL:
                config.openrouterBaseURL ||
                process.env.OPENROUTER_BASE_URL ||
                'https://openrouter.ai/api/v1',
            model,
            httpReferer: config.openrouterHttpReferer,
            appTitle: config.openrouterAppTitle,
        });
    }

    /**
     * Create Cloudflare provider
     */
    private static createCloudflareProvider(
        config: ProviderFactoryConfig
    ): CloudflareProvider {
        if (!config.cloudflareAI) {
            throw new AIProviderError(
                'Cloudflare Workers AI binding is required but not available. Make sure you are running in a Workers environment.',
                AIProvider.CLOUDFLARE
            );
        }

        // Determine model
        let model = config.cloudflareModel;

        if (!model) {
            const defaultModel = getRecommendedCloudflareModel();
            model = defaultModel.id;
            console.log(`[ProviderFactory] Using default Cloudflare model: ${model}`);
        }

        return new CloudflareProvider({
            ai: config.cloudflareAI,
            model,
        });
    }

    /**
     * Create provider from environment variables
     * Convenience method for simple setups
     */
    static async createFromEnvironment(
        cloudflareAI?: CloudflareAI
    ): Promise<IAIProvider> {
        const config: ProviderFactoryConfig = {
            provider: (process.env.AI_PROVIDER as AIProvider) || 'auto',
            openrouterApiKey: process.env.OPENROUTER_API_KEY,
            openrouterBaseURL: process.env.OPENROUTER_BASE_URL,
            openrouterModel: process.env.OPENROUTER_MODEL,
            openrouterHttpReferer: process.env.OPENROUTER_HTTP_REFERER,
            openrouterAppTitle: process.env.OPENROUTER_APP_TITLE,
            cloudflareAI,
            cloudflareModel: process.env.CLOUDFLARE_MODEL,
            preferFree: process.env.PREFER_FREE_TIER === 'true',
        };

        return this.createProvider(config);
    }

    /**
     * Validate provider configuration
     */
    static async validateProvider(provider: IAIProvider): Promise<boolean> {
        console.log(`[ProviderFactory] Validating ${provider.name} configuration...`);

        try {
            const isValid = await provider.validateConfig();
            if (isValid) {
                console.log(`[ProviderFactory] ✅ ${provider.name} configuration valid`);

                // Log pricing info
                const pricing = provider.getModelPricing();
                console.log(
                    `[ProviderFactory] Model: ${provider.model} | Cost: $${pricing.inputCostPer1K}/1K input, $${pricing.outputCostPer1K}/1K output`
                );

                if (pricing.inputCostPer1K === 0 && pricing.outputCostPer1K === 0) {
                    console.log(`[ProviderFactory] 🎉 Using FREE tier!`);
                }
            } else {
                console.warn(
                    `[ProviderFactory] ⚠️ ${provider.name} configuration may be invalid`
                );
            }
            return isValid;
        } catch (error: any) {
            console.error(`[ProviderFactory] ❌ ${provider.name} validation failed:`, error);
            throw error;
        }
    }
}

/**
 * Singleton provider instance
 * Reuses provider across requests for efficiency
 */
let globalProvider: IAIProvider | null = null;

/**
 * Get or create global provider instance
 */
export async function getGlobalProvider(
    cloudflareAI?: CloudflareAI
): Promise<IAIProvider> {
    if (!globalProvider) {
        console.log('[ProviderFactory] Initializing global AI provider...');
        globalProvider = await ProviderFactory.createFromEnvironment(cloudflareAI);
        await ProviderFactory.validateProvider(globalProvider);
    }
    return globalProvider;
}

/**
 * Reset global provider (useful for testing or config changes)
 */
export function resetGlobalProvider(): void {
    globalProvider = null;
}

/**
 * Export provider factory and utilities
 */
export { ProviderFactory as default };
