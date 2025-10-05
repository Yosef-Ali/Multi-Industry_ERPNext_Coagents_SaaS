/**
 * T146: Cloudflare Environment Utilities
 * Helper functions for working with Cloudflare Workers bindings
 */

import {
    CloudflareEnv,
    CloudflareAI,
    CloudflareD1Database,
} from './cloudflare.d';

/**
 * Type guard to check if running in Cloudflare Workers
 */
export function isCloudflareEnvironment(env: any): env is CloudflareEnv {
    return typeof env === 'object' && env !== null;
}

/**
 * Type guard to check if AI binding is available
 */
export function hasAIBinding(env: any): env is CloudflareEnv & { AI: CloudflareAI } {
    return isCloudflareEnvironment(env) && 'AI' in env && env.AI !== undefined;
}

/**
 * Type guard to check if KV binding is available
 */
export function hasKVBinding(env: any, bindingName: string): env is CloudflareEnv {
    return (
        isCloudflareEnvironment(env) &&
        bindingName in env &&
        env[bindingName as keyof CloudflareEnv] !== undefined
    );
}

/**
 * Type guard to check if D1 binding is available
 */
export function hasD1Binding(env: any): env is CloudflareEnv & { DB: CloudflareD1Database } {
    return isCloudflareEnvironment(env) && 'DB' in env && env.DB !== undefined;
}

/**
 * Get Cloudflare AI binding with error handling
 */
export function getAIBinding(env: any): CloudflareAI {
    if (!hasAIBinding(env)) {
        throw new Error(
            'Cloudflare Workers AI binding not available. Make sure you are running in a Workers environment and have configured the AI binding in wrangler.toml'
        );
    }
    return env.AI;
}

/**
 * Get environment variable with fallback
 */
export function getEnvVar(env: CloudflareEnv, key: keyof CloudflareEnv, fallback?: string): string {
    const value = env[key];
    if (typeof value === 'string') {
        return value;
    }
    if (fallback !== undefined) {
        return fallback;
    }
    throw new Error(`Required environment variable ${key} is not set`);
}

/**
 * Check if provider is configured
 */
export function isProviderConfigured(env: CloudflareEnv, provider: 'openrouter' | 'cloudflare'): boolean {
    if (provider === 'openrouter') {
        return !!env.OPENROUTER_API_KEY;
    } else if (provider === 'cloudflare') {
        return hasAIBinding(env);
    }
    return false;
}

/**
 * Get available AI providers
 */
export function getAvailableProviders(env: CloudflareEnv): ('openrouter' | 'cloudflare')[] {
    const providers: ('openrouter' | 'cloudflare')[] = [];

    if (isProviderConfigured(env, 'openrouter')) {
        providers.push('openrouter');
    }

    if (isProviderConfigured(env, 'cloudflare')) {
        providers.push('cloudflare');
    }

    return providers;
}

/**
 * Log environment configuration
 */
export function logCloudflareEnv(env: CloudflareEnv): void {
    console.log('[Cloudflare] Environment configuration:');
    console.log(`  - AI binding: ${hasAIBinding(env) ? '✅ Available' : '❌ Not configured'}`);
    console.log(`  - SESSIONS KV: ${hasKVBinding(env, 'SESSIONS') ? '✅ Available' : '❌ Not configured'}`);
    console.log(`  - WORKFLOW_STATE KV: ${hasKVBinding(env, 'WORKFLOW_STATE') ? '✅ Available' : '❌ Not configured'}`);
    console.log(`  - DB (D1): ${hasD1Binding(env) ? '✅ Available' : '❌ Not configured'}`);
    console.log(`  - OpenRouter API Key: ${env.OPENROUTER_API_KEY ? '✅ Configured' : '❌ Not set'}`);
    console.log(`  - AI Provider: ${env.AI_PROVIDER || 'auto'}`);
    console.log(`  - Prefer Free Tier: ${env.PREFER_FREE_TIER === 'true' ? 'Yes' : 'No'}`);

    const availableProviders = getAvailableProviders(env);
    console.log(`  - Available Providers: ${availableProviders.join(', ') || 'None'}`);
}
