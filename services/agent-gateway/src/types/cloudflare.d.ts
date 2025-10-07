/**
 * T146: Cloudflare Workers Runtime Type Definitions
 * TypeScript definitions for Cloudflare-specific bindings
 */

/**
 * Cloudflare Workers AI binding
 * Provides access to free-tier AI models
 */
export interface CloudflareAI {
    /**
     * Run an AI model
     * @param model - Model ID (e.g., '@cf/meta/llama-3.1-8b-instruct')
     * @param inputs - Model inputs (varies by model)
     * @returns Model response
     */
    run(model: string, inputs: any): Promise<any>;
}

/**
 * Cloudflare KV namespace binding
 * Key-value storage for sessions and caching
 */
export interface CloudflareKVNamespace {
    get(key: string, options?: { type?: 'text' | 'json' | 'arrayBuffer' | 'stream' }): Promise<any>;
    put(key: string, value: string | ArrayBuffer | ReadableStream, options?: { expirationTtl?: number; expiration?: number; metadata?: any }): Promise<void>;
    delete(key: string): Promise<void>;
    list(options?: { prefix?: string; limit?: number; cursor?: string }): Promise<{ keys: Array<{ name: string; expiration?: number; metadata?: any }>; list_complete: boolean; cursor?: string }>;
}

/**
 * Cloudflare D1 Database binding
 * SQL database for workflow checkpoints
 */
export interface CloudflareD1Database {
    prepare(query: string): CloudflareD1PreparedStatement;
    dump(): Promise<ArrayBuffer>;
    batch<T = unknown>(statements: CloudflareD1PreparedStatement[]): Promise<CloudflareD1Result<T>[]>;
    exec<T = unknown>(query: string): Promise<CloudflareD1Result<T>>;
}

export interface CloudflareD1PreparedStatement {
    bind(...values: any[]): CloudflareD1PreparedStatement;
    first<T = unknown>(colName?: string): Promise<T | null>;
    run<T = unknown>(): Promise<CloudflareD1Result<T>>;
    all<T = unknown>(): Promise<CloudflareD1Result<T[]>>;
    raw<T = unknown>(): Promise<T[]>;
}

export interface CloudflareD1Result<T = unknown> {
    results?: T;
    success: boolean;
    meta: {
        duration: number;
        size_after: number;
        rows_read: number;
        rows_written: number;
    };
    error?: string;
}

/**
 * Cloudflare Workers environment bindings
 * This interface should be extended by your specific environment
 */
export interface CloudflareEnv {
    // KV Namespaces
    SESSIONS?: CloudflareKVNamespace;
    WORKFLOW_STATE?: CloudflareKVNamespace;

    // D1 Database
    DB?: CloudflareD1Database;

    // Workers AI
    AI?: CloudflareAI;

    // Environment variables (secrets)
    OPENROUTER_API_KEY?: string;
    OPENROUTER_MODEL?: string;
    OPENROUTER_BASE_URL?: string;
    ERPNEXT_API_KEY?: string;
    ERPNEXT_API_SECRET?: string;
    ERPNEXT_API_URL?: string;
    AI_PROVIDER?: 'openrouter' | 'cloudflare' | 'auto';
    CLOUDFLARE_MODEL?: string;
    PREFER_FREE_TIER?: string;
    SESSION_SECRET?: string;
    ALLOWED_ORIGINS?: string;
    NODE_ENV?: string;
}

/**
 * Cloudflare Workers execution context
 */
export interface CloudflareExecutionContext {
    waitUntil(promise: Promise<any>): void;
    passThroughOnException(): void;
}

/**
 * Cloudflare Workers request context
 * Available in fetch handler
 */
export interface CloudflareRequestContext<Env = CloudflareEnv> {
    request: Request;
    env: Env;
    ctx: CloudflareExecutionContext;
}

/**
 * Type guard to check if running in Cloudflare Workers
 */
export function isCloudflareEnvironment(env: any): env is CloudflareEnv;

/**
 * Type guard to check if AI binding is available
 */
export function hasAIBinding(env: any): env is CloudflareEnv & { AI: CloudflareAI };

/**
 * Type guard to check if KV binding is available
 */
export function hasKVBinding(env: any, bindingName: string): env is CloudflareEnv;

/**
 * Type guard to check if D1 binding is available
 */
export function hasD1Binding(env: any): env is CloudflareEnv & { DB: CloudflareD1Database };

/**
 * Global type augmentation for Cloudflare Workers runtime
 * Uncomment and customize based on your specific bindings
 */
declare global {
    // const AI: CloudflareAI;
    // const SESSIONS: CloudflareKVNamespace;
    // const WORKFLOW_STATE: CloudflareKVNamespace;
    // const DB: CloudflareD1Database;
}
