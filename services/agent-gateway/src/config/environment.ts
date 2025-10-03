/**
 * Environment Variable Validation
 * T147: Updated to support flexible AI provider configuration
 */

interface EnvConfig {
    // AI Provider Configuration (T147)
    AI_PROVIDER?: 'openrouter' | 'cloudflare' | 'auto';
    PREFER_FREE_TIER?: string;
    MAX_COST_PER_1K?: string;

    // OpenRouter Configuration (now optional if using Cloudflare)
    OPENROUTER_API_KEY?: string;
    OPENROUTER_MODEL?: string;
    OPENROUTER_BASE_URL?: string;
    OPENROUTER_HTTP_REFERER?: string;
    OPENROUTER_APP_TITLE?: string;

    // Cloudflare AI Configuration (T146)
    CLOUDFLARE_MODEL?: string;

    // ERPNext Configuration
    ERPNEXT_API_URL: string;
    ERPNEXT_API_KEY?: string;
    ERPNEXT_API_SECRET?: string;

    // Service Configuration
    GATEWAY_PORT: string;
    GATEWAY_HOST: string;

    // Security
    SESSION_SECRET: string;
    ALLOWED_ORIGINS: string;

    // Optional
    NODE_ENV?: string;
    DEBUG?: string;
}

// T147: Updated required variables - OpenRouter is now optional
const REQUIRED_ENV_VARS = [
    'ERPNEXT_API_URL',
    'SESSION_SECRET',
    'ALLOWED_ORIGINS',
] as const;

const OPTIONAL_ENV_VARS = [
    // AI Provider (T147)
    'AI_PROVIDER',
    'PREFER_FREE_TIER',
    'MAX_COST_PER_1K',
    // OpenRouter (now optional)
    'OPENROUTER_API_KEY',
    'OPENROUTER_MODEL',
    'OPENROUTER_BASE_URL',
    'OPENROUTER_HTTP_REFERER',
    'OPENROUTER_APP_TITLE',
    // Cloudflare (T146)
    'CLOUDFLARE_MODEL',
    // ERPNext
    'ERPNEXT_API_KEY',
    'ERPNEXT_API_SECRET',
    // General
    'NODE_ENV',
    'DEBUG',
    'USE_MOCK_ERPNEXT',
] as const;

/**
 * Validate that all required environment variables are set
 * Throws error if any are missing or invalid
 */
export function validateEnvironment(): EnvConfig {
    console.log('🔍 Validating environment configuration...');

    const missing: string[] = [];
    const invalid: string[] = [];
    const warnings: string[] = [];

    // Check required variables
    for (const varName of REQUIRED_ENV_VARS) {
        const value = process.env[varName];

        if (!value || value.trim() === '') {
            missing.push(varName);
        } else {
            // Validate specific formats
            switch (varName) {
                case 'ERPNEXT_API_URL':
                    if (!value.startsWith('http://') && !value.startsWith('https://')) {
                        invalid.push(`${varName} (must be a valid URL)`);
                    }
                    break;

                case 'SESSION_SECRET':
                    if (value === 'change-this-in-production' || value.includes('$(openssl')) {
                        warnings.push(`${varName} is using default/placeholder value - MUST change in production`);
                    }
                    if (value.length < 32) {
                        warnings.push(`${varName} is too short (should be at least 32 characters)`);
                    }
                    break;

                case 'ALLOWED_ORIGINS':
                    const origins = value.split(',');
                    if (origins.length === 0) {
                        invalid.push(`${varName} (must contain at least one origin)`);
                    }
                    break;
            }
        }
    }

    // T147: Validate optional OpenRouter configuration
    const openrouterKey = process.env.OPENROUTER_API_KEY;
    if (openrouterKey) {
        if (!openrouterKey.startsWith('sk-or-v1-')) {
            warnings.push('OPENROUTER_API_KEY does not start with "sk-or-v1-" - may be invalid');
        }
        if (openrouterKey.length < 40) {
            warnings.push('OPENROUTER_API_KEY seems too short - may be invalid');
        }
    }

    const openrouterURL = process.env.OPENROUTER_BASE_URL;
    if (openrouterURL && !openrouterURL.startsWith('http://') && !openrouterURL.startsWith('https://')) {
        invalid.push('OPENROUTER_BASE_URL must be a valid URL');
    }

    // Check optional but recommended variables
    if (!process.env.ERPNEXT_API_KEY && !process.env.USE_MOCK_ERPNEXT) {
        warnings.push('ERPNEXT_API_KEY not set - ERPNext integration may not work');
    }

    // T147: Warn if no AI provider is configured
    if (!process.env.OPENROUTER_API_KEY) {
        warnings.push('OPENROUTER_API_KEY not set - will use Cloudflare Workers AI if available, otherwise agent will fail');
    }

    // Report findings
    if (missing.length > 0) {
        console.error('\n❌ Missing required environment variables:');
        missing.forEach(v => console.error(`   - ${v}`));
    }

    if (invalid.length > 0) {
        console.error('\n❌ Invalid environment variable formats:');
        invalid.forEach(v => console.error(`   - ${v}`));
    }

    if (warnings.length > 0) {
        console.warn('\n⚠️  Environment warnings:');
        warnings.forEach(w => console.warn(`   - ${w}`));
    }

    // Throw error if critical issues found
    if (missing.length > 0 || invalid.length > 0) {
        throw new Error(
            `Environment validation failed. Missing: ${missing.length}, Invalid: ${invalid.length}. ` +
            `Check logs above for details.`
        );
    }

    console.log('✅ Environment validation passed\n');

    // Return typed config
    return process.env as unknown as EnvConfig;
}

/**
 * Validate model name is supported
 */
export const SUPPORTED_MODELS = {
    // GLM Models (Cost-effective)
    GLM_4_9B: 'zhipu/glm-4-9b-chat',
    GLM_4_PLUS: 'zhipu/glm-4-plus',
    GLM_4: 'zhipu/glm-4',

    // Anthropic (Premium)
    CLAUDE_OPUS: 'anthropic/claude-3-opus',
    CLAUDE_SONNET: 'anthropic/claude-3.5-sonnet',

    // OpenAI (Popular)
    GPT4_TURBO: 'openai/gpt-4-turbo',
    GPT4O: 'openai/gpt-4o',

    // Meta (Open Source)
    LLAMA_70B: 'meta-llama/llama-3-70b-instruct',
} as const;

export const DEFAULT_MODEL = SUPPORTED_MODELS.GLM_4_9B;

export function validateModel(model: string): string {
    const supported = Object.values(SUPPORTED_MODELS);

    if (!supported.includes(model as any)) {
        console.warn(
            `⚠️  Unknown model: "${model}". Using default: ${DEFAULT_MODEL}\n` +
            `   Supported models: ${supported.join(', ')}`
        );
        return DEFAULT_MODEL;
    }

    return model;
}

/**
 * Get validated environment config
 * Use this instead of accessing process.env directly
 */
export function getEnvConfig(): EnvConfig {
    return process.env as unknown as EnvConfig;
}

/**
 * Check if running in production
 */
export function isProduction(): boolean {
    return process.env.NODE_ENV === 'production';
}

/**
 * Check if running in development
 */
export function isDevelopment(): boolean {
    return process.env.NODE_ENV === 'development' || !process.env.NODE_ENV;
}

/**
 * Mask sensitive values for logging
 */
export function maskSecret(secret: string, visibleChars: number = 8): string {
    if (!secret || secret.length <= visibleChars) {
        return '***';
    }

    const visible = secret.slice(0, visibleChars);
    return `${visible}${'*'.repeat(secret.length - visibleChars)}`;
}

/**
 * Log configuration (with secrets masked)
 * T147: Updated to handle optional AI provider configuration
 */
export function logConfiguration(): void {
    const config = getEnvConfig();

    console.log('📋 Configuration:');

    // AI Provider (T147)
    if (config.AI_PROVIDER) {
        console.log(`   AI Provider: ${config.AI_PROVIDER}`);
    }

    // OpenRouter (now optional)
    if (config.OPENROUTER_API_KEY) {
        console.log(`   OpenRouter Model: ${config.OPENROUTER_MODEL || 'default'}`);
        console.log(`   OpenRouter API Key: ${maskSecret(config.OPENROUTER_API_KEY)}`);
        console.log(`   OpenRouter Base URL: ${config.OPENROUTER_BASE_URL || 'default'}`);
    } else {
        console.log('   OpenRouter: Not configured');
    }

    // Cloudflare (T146)
    if (config.CLOUDFLARE_MODEL) {
        console.log(`   Cloudflare Model: ${config.CLOUDFLARE_MODEL}`);
    }

    console.log(`   ERPNext URL: ${config.ERPNEXT_API_URL}`);
    console.log(`   Gateway: ${config.GATEWAY_HOST}:${config.GATEWAY_PORT}`);
    console.log(`   Environment: ${config.NODE_ENV || 'development'}`);
    console.log('');
}
