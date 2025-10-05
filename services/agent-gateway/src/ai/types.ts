/**
 * T145: Universal AI Provider Types
 * Type definitions for multi-provider AI system
 */

/**
 * Supported AI provider types
 */
export enum AIProvider {
    OPENROUTER = 'openrouter',
    CLOUDFLARE = 'cloudflare',
    ANTHROPIC = 'anthropic',
    OPENAI = 'openai',
}

/**
 * AI provider configuration
 */
export interface AIProviderConfig {
    provider: AIProvider;
    apiKey?: string;
    baseURL?: string;
    model: string;
    defaultHeaders?: Record<string, string>;
}

/**
 * Message role types
 */
export type MessageRole = 'user' | 'assistant' | 'system';

/**
 * Message content types
 */
export interface TextContent {
    type: 'text';
    text: string;
}

export interface ToolUseContent {
    type: 'tool_use';
    id: string;
    name: string;
    input: any;
}

export interface ToolResultContent {
    type: 'tool_result';
    tool_use_id: string;
    content: string;
    is_error?: boolean;
}

export type MessageContent = TextContent | ToolUseContent | ToolResultContent;

/**
 * Universal message format
 */
export interface AIMessage {
    role: MessageRole;
    content: string | MessageContent[];
}

/**
 * Tool definition in universal format
 */
export interface AIToolDefinition {
    name: string;
    description: string;
    input_schema: {
        type: 'object';
        properties: Record<string, any>;
        required?: string[];
    };
}

/**
 * Streaming text delta
 */
export interface StreamTextDelta {
    type: 'text_delta';
    text: string;
}

/**
 * Streaming tool use start
 */
export interface StreamToolUseStart {
    type: 'tool_use_start';
    id: string;
    name: string;
}

/**
 * Streaming tool use input delta
 */
export interface StreamToolInputDelta {
    type: 'tool_input_delta';
    id: string;
    input: any;
}

/**
 * Stream event types
 */
export type StreamEvent =
    | StreamTextDelta
    | StreamToolUseStart
    | StreamToolInputDelta;

/**
 * Stream event handler
 */
export type StreamEventHandler = (event: StreamEvent) => void;

/**
 * AI completion response
 */
export interface AICompletionResponse {
    content: MessageContent[];
    stop_reason: 'end_turn' | 'tool_use' | 'max_tokens' | 'stop_sequence';
    usage?: {
        input_tokens: number;
        output_tokens: number;
    };
}

/**
 * Universal AI provider interface
 * All providers must implement this interface
 */
export interface IAIProvider {
    /**
     * Provider name for logging/debugging
     */
    readonly name: string;

    /**
     * Configured model name
     */
    readonly model: string;

    /**
     * Generate completion with optional streaming
     */
    complete(
        messages: AIMessage[],
        options?: {
            tools?: AIToolDefinition[];
            system?: string;
            maxTokens?: number;
            temperature?: number;
            stream?: boolean;
            onStream?: StreamEventHandler;
        }
    ): Promise<AICompletionResponse>;

    /**
     * Validate provider configuration
     */
    validateConfig(): Promise<boolean>;

    /**
     * Get provider-specific model pricing (tokens per dollar)
     */
    getModelPricing(): {
        inputCostPer1K: number;
        outputCostPer1K: number;
    };
}

/**
 * Model catalog entry
 */
export interface ModelInfo {
    id: string;
    name: string;
    provider: AIProvider;
    contextWindow: number;
    inputCostPer1K: number;
    outputCostPer1K: number;
    supportsFunctions: boolean;
    description: string;
}

/**
 * Error types for provider operations
 */
export class AIProviderError extends Error {
    constructor(
        message: string,
        public readonly provider: AIProvider,
        public readonly code?: string,
        public readonly statusCode?: number
    ) {
        super(message);
        this.name = 'AIProviderError';
    }
}

export class AIProviderAuthError extends AIProviderError {
    constructor(provider: AIProvider, message: string = 'Authentication failed') {
        super(message, provider, 'AUTH_ERROR', 401);
        this.name = 'AIProviderAuthError';
    }
}

export class AIProviderRateLimitError extends AIProviderError {
    constructor(provider: AIProvider, message: string = 'Rate limit exceeded') {
        super(message, provider, 'RATE_LIMIT', 429);
        this.name = 'AIProviderRateLimitError';
    }
}

export class AIProviderInvalidRequestError extends AIProviderError {
    constructor(provider: AIProvider, message: string) {
        super(message, provider, 'INVALID_REQUEST', 400);
        this.name = 'AIProviderInvalidRequestError';
    }
}
