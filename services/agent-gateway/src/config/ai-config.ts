/**
 * T147: AI Provider Configuration
 * Centralized configuration for AI provider selection and setup
 */

import { AIProvider } from '../ai/types';
import type { CloudflareEnv } from '../types/cloudflare.d';
import { hasAIBinding } from '../types/cloudflare-utils';

/**
 * AI provider configuration interface
 */
export interface AIConfig {
  // Provider selection
  provider: AIProvider | 'auto';
  
  // OpenRouter configuration
  openrouter?: {
    apiKey: string;
    baseURL: string;
    model: string;
    httpReferer?: string;
    appTitle?: string;
  };
  
  // Cloudflare configuration
  cloudflare?: {
    model: string;
    enabled: boolean;
  };
  
  // Preferences
  preferFreeTier: boolean;
  maxCostPer1K?: number;
}

/**
 * Get AI provider configuration from environment
 * Supports both Node.js (process.env) and Cloudflare Workers (env object)
 */
export function getAIConfig(env?: CloudflareEnv): AIConfig {
  // Determine if we're in Cloudflare Workers or Node.js
  const isWorkers = env !== undefined;
  
  // Helper to get env var from either source
  const getEnv = (key: string): string | undefined => {
    if (isWorkers && env) {
      return env[key as keyof CloudflareEnv] as string | undefined;
    }
    return process.env[key];
  };
  
  // Provider selection
  const providerStr = getEnv('AI_PROVIDER') || 'auto';
  const provider = ['openrouter', 'cloudflare', 'auto'].includes(providerStr)
    ? (providerStr as AIProvider | 'auto')
    : 'auto';
  
  // OpenRouter configuration
  const openrouterApiKey = getEnv('OPENROUTER_API_KEY');
  const openrouterConfig = openrouterApiKey
    ? {
        apiKey: openrouterApiKey,
        baseURL: getEnv('OPENROUTER_BASE_URL') || 'https://openrouter.ai/api/v1',
        model: getEnv('OPENROUTER_MODEL') || 'mistralai/mistral-7b-instruct',
        httpReferer: getEnv('OPENROUTER_HTTP_REFERER'),
        appTitle: getEnv('OPENROUTER_APP_TITLE'),
      }
    : undefined;
  
  // Cloudflare configuration
  const cloudflareEnabled = isWorkers && hasAIBinding(env);
  const cloudflareConfig = cloudflareEnabled
    ? {
        model: getEnv('CLOUDFLARE_MODEL') || '@cf/meta/llama-3.1-8b-instruct',
        enabled: true,
      }
    : undefined;
  
  // Preferences
  const preferFreeTier = getEnv('PREFER_FREE_TIER') === 'true';
  const maxCostStr = getEnv('MAX_COST_PER_1K');
  const maxCostPer1K = maxCostStr ? parseFloat(maxCostStr) : undefined;
  
  return {
    provider,
    openrouter: openrouterConfig,
    cloudflare: cloudflareConfig,
    preferFreeTier,
    maxCostPer1K,
  };
}

/**
 * Validate AI configuration
 * Returns validation result with errors/warnings
 */
export interface AIConfigValidation {
  valid: boolean;
  errors: string[];
  warnings: string[];
  availableProviders: AIProvider[];
}

export function validateAIConfig(config: AIConfig, env?: CloudflareEnv): AIConfigValidation {
  const errors: string[] = [];
  const warnings: string[] = [];
  const availableProviders: AIProvider[] = [];
  
  // Check OpenRouter configuration
  if (config.openrouter) {
    availableProviders.push(AIProvider.OPENROUTER);
    
    // Validate API key format
    if (!config.openrouter.apiKey.startsWith('sk-or-v1-')) {
      warnings.push('OPENROUTER_API_KEY does not start with "sk-or-v1-" - may be invalid');
    }
    
    if (config.openrouter.apiKey.length < 40) {
      warnings.push('OPENROUTER_API_KEY seems too short - may be invalid');
    }
    
    // Validate base URL
    if (!config.openrouter.baseURL.startsWith('http')) {
      errors.push('OPENROUTER_BASE_URL must be a valid HTTP(S) URL');
    }
  }
  
  // Check Cloudflare configuration
  if (config.cloudflare?.enabled) {
    availableProviders.push(AIProvider.CLOUDFLARE);
    
    // Validate model ID format
    if (!config.cloudflare.model.startsWith('@cf/')) {
      warnings.push('CLOUDFLARE_MODEL should start with "@cf/" for Cloudflare models');
    }
  }
  
  // Check that at least one provider is available
  if (availableProviders.length === 0) {
    errors.push(
      'No AI provider configured. Set OPENROUTER_API_KEY or enable Cloudflare Workers AI binding.'
    );
  }
  
  // Check explicit provider selection is valid
  if (config.provider !== 'auto') {
    const requestedProvider = config.provider as AIProvider;
    if (!availableProviders.includes(requestedProvider)) {
      errors.push(
        `AI_PROVIDER is set to "${requestedProvider}" but this provider is not configured. ` +
        `Available providers: ${availableProviders.join(', ')}`
      );
    }
  }
  
  // Warn about free tier preference without Cloudflare
  if (config.preferFreeTier && !config.cloudflare?.enabled) {
    warnings.push(
      'PREFER_FREE_TIER is enabled but Cloudflare Workers AI is not available. ' +
      'Will use OpenRouter instead.'
    );
  }
  
  return {
    valid: errors.length === 0,
    errors,
    warnings,
    availableProviders,
  };
}

/**
 * Log AI configuration (with secrets masked)
 */
export function logAIConfig(config: AIConfig, validation: AIConfigValidation): void {
  console.log('🤖 AI Provider Configuration:');
  console.log(`   Provider Selection: ${config.provider}`);
  
  if (config.openrouter) {
    console.log('   OpenRouter:');
    console.log(`     - API Key: ${maskSecret(config.openrouter.apiKey)}`);
    console.log(`     - Model: ${config.openrouter.model}`);
    console.log(`     - Base URL: ${config.openrouter.baseURL}`);
  } else {
    console.log('   OpenRouter: ❌ Not configured');
  }
  
  if (config.cloudflare?.enabled) {
    console.log('   Cloudflare Workers AI:');
    console.log(`     - Model: ${config.cloudflare.model}`);
    console.log('     - Status: ✅ Available (FREE tier)');
  } else {
    console.log('   Cloudflare Workers AI: ❌ Not available');
  }
  
  console.log(`   Prefer Free Tier: ${config.preferFreeTier ? 'Yes' : 'No'}`);
  if (config.maxCostPer1K !== undefined) {
    console.log(`   Max Cost per 1K: $${config.maxCostPer1K}`);
  }
  
  console.log(`   Available Providers: ${validation.availableProviders.join(', ')}`);
  
  if (validation.warnings.length > 0) {
    console.warn('\n⚠️  Configuration warnings:');
    validation.warnings.forEach(w => console.warn(`   - ${w}`));
  }
  
  if (validation.errors.length > 0) {
    console.error('\n❌ Configuration errors:');
    validation.errors.forEach(e => console.error(`   - ${e}`));
  }
  
  console.log('');
}

/**
 * Mask sensitive values for logging
 */
function maskSecret(secret: string, visibleChars: number = 8): string {
  if (!secret || secret.length <= visibleChars) {
    return '***';
  }
  
  const visible = secret.slice(0, visibleChars);
  return `${visible}${'*'.repeat(secret.length - visibleChars)}`;
}

/**
 * Get recommended provider based on configuration
 */
export function getRecommendedProvider(config: AIConfig): AIProvider {
  // Explicit selection
  if (config.provider !== 'auto') {
    return config.provider as AIProvider;
  }
  
  // Free tier preference
  if (config.preferFreeTier && config.cloudflare?.enabled) {
    return AIProvider.CLOUDFLARE;
  }
  
  // Default to OpenRouter if available
  if (config.openrouter) {
    return AIProvider.OPENROUTER;
  }
  
  // Fallback to Cloudflare
  if (config.cloudflare?.enabled) {
    return AIProvider.CLOUDFLARE;
  }
  
  throw new Error('No AI provider available');
}
