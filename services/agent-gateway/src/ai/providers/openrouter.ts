/**
 * T145: OpenRouter AI Provider Implementation
 * Wraps existing OpenRouter/Anthropic integration into universal provider interface
 */

import Anthropic from '@anthropic-ai/sdk';
import {
    IAIProvider,
    AIProvider,
    AIMessage,
    AIToolDefinition,
    AICompletionResponse,
    StreamEventHandler,
    MessageContent,
    AIProviderAuthError,
    AIProviderError,
    ModelInfo,
} from '../types';

/**
 * OpenRouter provider configuration
 */
export interface OpenRouterConfig {
    apiKey: string;
    baseURL?: string;
    model: string;
    httpReferer?: string;
    appTitle?: string;
}

/**
 * OpenRouter AI Provider
 * Uses Anthropic SDK with OpenRouter base URL
 */
export class OpenRouterProvider implements IAIProvider {
    readonly name = 'OpenRouter';
    readonly model: string;
    private client: Anthropic;
    private config: OpenRouterConfig;

    constructor(config: OpenRouterConfig) {
        this.config = config;
        this.model = config.model;

        // Create Anthropic client pointing to OpenRouter
        this.client = new Anthropic({
            apiKey: config.apiKey,
            baseURL: config.baseURL || 'https://openrouter.ai/api/v1',
            defaultHeaders: {
                'HTTP-Referer': config.httpReferer || 'https://erpnext-coagents.dev',
                'X-Title': config.appTitle || 'ERPNext CoAgents',
            },
        });
    }

    /**
     * Generate completion with optional streaming
     */
    async complete(
        messages: AIMessage[],
        options?: {
            tools?: AIToolDefinition[];
            system?: string;
            maxTokens?: number;
            temperature?: number;
            stream?: boolean;
            onStream?: StreamEventHandler;
        }
    ): Promise<AICompletionResponse> {
        try {
            // Convert universal messages to Anthropic format
            const anthropicMessages = this.convertToAnthropicMessages(messages);

            // Prepare request parameters
            const requestParams: any = {
                model: this.model,
                max_tokens: options?.maxTokens || 4096,
                temperature: options?.temperature,
                messages: anthropicMessages,
            };

            // Add system prompt if provided
            if (options?.system) {
                requestParams.system = options.system;
            }

            // Add tools if provided
            if (options?.tools && options.tools.length > 0) {
                requestParams.tools = options.tools;
            }

            // Handle streaming
            if (options?.stream && options.onStream) {
                return await this.streamCompletion(requestParams, options.onStream);
            }

            // Non-streaming completion
            const response = await this.client.messages.create(requestParams);

            // Convert to universal format
            return this.convertFromAnthropicResponse(response);
        } catch (error: any) {
            throw this.handleError(error);
        }
    }

    /**
     * Stream completion with event handling
     */
    private async streamCompletion(
        requestParams: any,
        onStream: StreamEventHandler
    ): Promise<AICompletionResponse> {
        const stream = this.client.messages.stream(requestParams);

        const contentBlocks: MessageContent[] = [];
        let stopReason: AICompletionResponse['stop_reason'] = 'end_turn';
        let usage: AICompletionResponse['usage'] | undefined;

        // Handle streaming events
        stream
            .on('text', (textDelta: string) => {
                onStream({
                    type: 'text_delta',
                    text: textDelta,
                });
            })
            .on('contentBlock', (block: any) => {
                if (block.type === 'text') {
                    contentBlocks.push({
                        type: 'text',
                        text: block.text,
                    });
                } else if (block.type === 'tool_use') {
                    contentBlocks.push({
                        type: 'tool_use',
                        id: block.id,
                        name: block.name,
                        input: block.input,
                    });

                    onStream({
                        type: 'tool_use_start',
                        id: block.id,
                        name: block.name,
                    });

                    onStream({
                        type: 'tool_input_delta',
                        id: block.id,
                        input: block.input,
                    });
                }
            })
            .on('error', (error: any) => {
                throw this.handleError(error);
            });

        // Wait for completion
        const finalMessage = await stream.finalMessage();

        // Extract stop reason and usage
        stopReason = this.mapStopReason(finalMessage.stop_reason);
        if (finalMessage.usage) {
            usage = {
                input_tokens: finalMessage.usage.input_tokens,
                output_tokens: finalMessage.usage.output_tokens,
            };
        }

        return {
            content: contentBlocks.length > 0 ? contentBlocks : this.convertContent(finalMessage.content),
            stop_reason: stopReason,
            usage,
        };
    }

    /**
     * Validate provider configuration
     */
    async validateConfig(): Promise<boolean> {
        try {
            // Simple test request to validate API key and model
            await this.client.messages.create({
                model: this.model,
                max_tokens: 1,
                messages: [{ role: 'user', content: 'test' }],
            });
            return true;
        } catch (error: any) {
            if (error.status === 401 || error.status === 403) {
                throw new AIProviderAuthError(
                    AIProvider.OPENROUTER,
                    'Invalid API key or insufficient permissions'
                );
            }
            return false;
        }
    }

    /**
     * Get model pricing
     */
    getModelPricing(): { inputCostPer1K: number; outputCostPer1K: number } {
        // Get pricing from model catalog
        const modelInfo = OPENROUTER_MODEL_CATALOG.find((m) => m.id === this.model);
        if (modelInfo) {
            return {
                inputCostPer1K: modelInfo.inputCostPer1K,
                outputCostPer1K: modelInfo.outputCostPer1K,
            };
        }

        // Default fallback pricing
        return {
            inputCostPer1K: 0.0002,
            outputCostPer1K: 0.0002,
        };
    }

    /**
     * Convert universal messages to Anthropic format
     */
    private convertToAnthropicMessages(messages: AIMessage[]): Anthropic.MessageParam[] {
        return messages
            .filter((m) => m.role !== 'system') // System goes in separate field
            .map((m) => ({
                role: m.role as 'user' | 'assistant',
                content: m.content as any,
            }));
    }

    /**
     * Convert Anthropic response to universal format
     */
    private convertFromAnthropicResponse(
        response: Anthropic.Message
    ): AICompletionResponse {
        return {
            content: this.convertContent(response.content),
            stop_reason: this.mapStopReason(response.stop_reason),
            usage: {
                input_tokens: response.usage.input_tokens,
                output_tokens: response.usage.output_tokens,
            },
        };
    }

    /**
     * Convert Anthropic content blocks to universal format
     */
    private convertContent(content: any[]): MessageContent[] {
        return content.map((block) => {
            if (block.type === 'text') {
                return {
                    type: 'text',
                    text: block.text,
                };
            } else if (block.type === 'tool_use') {
                return {
                    type: 'tool_use',
                    id: block.id,
                    name: block.name,
                    input: block.input,
                };
            }
            return block;
        });
    }

    /**
     * Map Anthropic stop reason to universal format
     */
    private mapStopReason(
        stopReason: string | null
    ): AICompletionResponse['stop_reason'] {
        switch (stopReason) {
            case 'tool_use':
                return 'tool_use';
            case 'max_tokens':
                return 'max_tokens';
            case 'stop_sequence':
                return 'stop_sequence';
            case 'end_turn':
            default:
                return 'end_turn';
        }
    }

    /**
     * Handle provider errors
     */
    private handleError(error: any): AIProviderError {
        if (error.status === 401 || error.status === 403) {
            return new AIProviderAuthError(
                AIProvider.OPENROUTER,
                error.message || 'Authentication failed'
            );
        }

        return new AIProviderError(
            error.message || 'OpenRouter request failed',
            AIProvider.OPENROUTER,
            error.type,
            error.status
        );
    }
}

/**
 * OpenRouter model catalog
 * Updated with current pricing as of October 2025
 */
export const OPENROUTER_MODEL_CATALOG: ModelInfo[] = [
    // Mistral Models (Cost-effective)
    {
        id: 'mistralai/mistral-7b-instruct',
        name: 'Mistral 7B Instruct',
        provider: AIProvider.OPENROUTER,
        contextWindow: 32768,
        inputCostPer1K: 0.0002,
        outputCostPer1K: 0.0002,
        supportsFunctions: true,
        description: 'Fast and efficient 7B model, excellent cost/performance ratio',
    },
    {
        id: 'mistralai/mixtral-8x7b-instruct',
        name: 'Mixtral 8x7B Instruct',
        provider: AIProvider.OPENROUTER,
        contextWindow: 32768,
        inputCostPer1K: 0.0005,
        outputCostPer1K: 0.0005,
        supportsFunctions: true,
        description: 'Mixture of experts model, high quality at reasonable cost',
    },

    // Anthropic Claude (Premium)
    {
        id: 'anthropic/claude-3-opus',
        name: 'Claude 3 Opus',
        provider: AIProvider.OPENROUTER,
        contextWindow: 200000,
        inputCostPer1K: 0.015,
        outputCostPer1K: 0.075,
        supportsFunctions: true,
        description: 'Most capable Claude model, best for complex tasks',
    },
    {
        id: 'anthropic/claude-3.5-sonnet',
        name: 'Claude 3.5 Sonnet',
        provider: AIProvider.OPENROUTER,
        contextWindow: 200000,
        inputCostPer1K: 0.003,
        outputCostPer1K: 0.015,
        supportsFunctions: true,
        description: 'Balanced performance and cost, recommended for production',
    },
    {
        id: 'anthropic/claude-3-haiku',
        name: 'Claude 3 Haiku',
        provider: AIProvider.OPENROUTER,
        contextWindow: 200000,
        inputCostPer1K: 0.00025,
        outputCostPer1K: 0.00125,
        supportsFunctions: true,
        description: 'Fast and affordable Claude model',
    },

    // OpenAI GPT (Popular)
    {
        id: 'openai/gpt-4o',
        name: 'GPT-4o',
        provider: AIProvider.OPENROUTER,
        contextWindow: 128000,
        inputCostPer1K: 0.005,
        outputCostPer1K: 0.015,
        supportsFunctions: true,
        description: 'Latest GPT-4 optimized model',
    },
    {
        id: 'openai/gpt-4-turbo',
        name: 'GPT-4 Turbo',
        provider: AIProvider.OPENROUTER,
        contextWindow: 128000,
        inputCostPer1K: 0.01,
        outputCostPer1K: 0.03,
        supportsFunctions: true,
        description: 'High performance GPT-4',
    },
    {
        id: 'openai/gpt-3.5-turbo',
        name: 'GPT-3.5 Turbo',
        provider: AIProvider.OPENROUTER,
        contextWindow: 16385,
        inputCostPer1K: 0.0015,
        outputCostPer1K: 0.002,
        supportsFunctions: true,
        description: 'Fast and affordable GPT model',
    },

    // Meta Llama (Open Source)
    {
        id: 'meta-llama/llama-3-70b-instruct',
        name: 'Llama 3 70B Instruct',
        provider: AIProvider.OPENROUTER,
        contextWindow: 8192,
        inputCostPer1K: 0.0009,
        outputCostPer1K: 0.0009,
        supportsFunctions: true,
        description: 'Open source high-performance model',
    },
    {
        id: 'meta-llama/llama-3-8b-instruct',
        name: 'Llama 3 8B Instruct',
        provider: AIProvider.OPENROUTER,
        contextWindow: 8192,
        inputCostPer1K: 0.0002,
        outputCostPer1K: 0.0002,
        supportsFunctions: true,
        description: 'Efficient open source model',
    },

    // Google Gemini
    {
        id: 'google/gemini-pro-1.5',
        name: 'Gemini Pro 1.5',
        provider: AIProvider.OPENROUTER,
        contextWindow: 1000000,
        inputCostPer1K: 0.00125,
        outputCostPer1K: 0.005,
        supportsFunctions: true,
        description: 'Large context window, good for long documents',
    },
];

/**
 * Get model info by ID
 */
export function getModelInfo(modelId: string): ModelInfo | undefined {
    return OPENROUTER_MODEL_CATALOG.find((m) => m.id === modelId);
}

/**
 * Get recommended model for budget
 */
export function getRecommendedModel(maxCostPer1K: number = 0.001): ModelInfo {
    const affordable = OPENROUTER_MODEL_CATALOG.filter(
        (m) => m.inputCostPer1K <= maxCostPer1K && m.outputCostPer1K <= maxCostPer1K
    ).sort((a, b) => b.contextWindow - a.contextWindow);

    return affordable[0] || OPENROUTER_MODEL_CATALOG[0];
}
