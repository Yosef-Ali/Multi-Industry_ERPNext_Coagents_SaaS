/**
 * T145: Cloudflare Workers AI Provider Implementation
 * Free tier AI provider using Cloudflare's Workers AI
 */

import {
    IAIProvider,
    AIProvider,
    AIMessage,
    AIToolDefinition,
    AICompletionResponse,
    StreamEventHandler,
    MessageContent,
    AIProviderError,
    AIProviderInvalidRequestError,
    ModelInfo,
} from '../types';

/**
 * Cloudflare Workers AI binding type
 */
export interface CloudflareAI {
    run(model: string, inputs: any): Promise<any>;
}

/**
 * Cloudflare provider configuration
 */
export interface CloudflareConfig {
    ai: CloudflareAI; // Cloudflare Workers AI binding
    model: string;
}

/**
 * Cloudflare Workers AI Provider
 * Free tier models available in Workers AI
 */
export class CloudflareProvider implements IAIProvider {
    readonly name = 'Cloudflare Workers AI';
    readonly model: string;
    private ai: CloudflareAI;

    constructor(config: CloudflareConfig) {
        this.ai = config.ai;
        this.model = config.model;
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
            // Convert to Cloudflare format
            const cfMessages = this.convertToCFMessages(messages, options?.system);

            // Prepare request
            const inputs: any = {
                messages: cfMessages,
            };

            if (options?.maxTokens) {
                inputs.max_tokens = options.maxTokens;
            }

            if (options?.temperature !== undefined) {
                inputs.temperature = options.temperature;
            }

            // Note: Cloudflare Workers AI doesn't support function calling yet
            // We'll need to implement a workaround for tools
            if (options?.tools && options.tools.length > 0) {
                // Append tools to system message as a workaround
                const toolsDescription = this.formatToolsAsText(options.tools);
                if (inputs.messages[0]?.role === 'system') {
                    inputs.messages[0].content += '\n\n' + toolsDescription;
                } else {
                    inputs.messages.unshift({
                        role: 'system',
                        content: toolsDescription,
                    });
                }
            }

            // Run the model
            const response = await this.ai.run(this.model, inputs);

            // Handle streaming (if supported by model)
            if (options?.stream && options.onStream && response.stream) {
                return await this.handleStreamingResponse(response, options.onStream);
            }

            // Non-streaming response
            return this.convertFromCFResponse(response);
        } catch (error: any) {
            throw this.handleError(error);
        }
    }

    /**
     * Handle streaming response
     */
    private async handleStreamingResponse(
        response: any,
        onStream: StreamEventHandler
    ): Promise<AICompletionResponse> {
        const reader = response.stream.getReader();
        const decoder = new TextDecoder();
        let fullText = '';

        try {
            while (true) {
                const { done, value } = await reader.read();
                if (done) break;

                const text = decoder.decode(value, { stream: true });
                fullText += text;

                onStream({
                    type: 'text_delta',
                    text: text,
                });
            }

            return {
                content: [{ type: 'text', text: fullText }],
                stop_reason: 'end_turn',
            };
        } finally {
            reader.releaseLock();
        }
    }

    /**
     * Validate provider configuration
     */
    async validateConfig(): Promise<boolean> {
        try {
            // Test with simple request
            const response = await this.ai.run(this.model, {
                messages: [{ role: 'user', content: 'Hi' }],
                max_tokens: 1,
            });
            return !!response;
        } catch (error) {
            return false;
        }
    }

    /**
     * Get model pricing (free for Cloudflare Workers AI)
     */
    getModelPricing(): { inputCostPer1K: number; outputCostPer1K: number } {
        return {
            inputCostPer1K: 0.0, // Free tier!
            outputCostPer1K: 0.0,
        };
    }

    /**
     * Convert universal messages to Cloudflare format
     */
    private convertToCFMessages(
        messages: AIMessage[],
        systemPrompt?: string
    ): any[] {
        const cfMessages: any[] = [];

        // Add system message if provided
        if (systemPrompt) {
            cfMessages.push({
                role: 'system',
                content: systemPrompt,
            });
        }

        // Convert messages
        for (const message of messages) {
            if (message.role === 'system') {
                cfMessages.push({
                    role: 'system',
                    content: typeof message.content === 'string' ? message.content : '',
                });
            } else {
                // For user/assistant messages
                const content = this.extractTextContent(message.content);
                if (content) {
                    cfMessages.push({
                        role: message.role,
                        content,
                    });
                }
            }
        }

        return cfMessages;
    }

    /**
     * Extract text content from message content
     */
    private extractTextContent(content: string | MessageContent[]): string {
        if (typeof content === 'string') {
            return content;
        }

        // Extract text from content blocks
        const textBlocks = content
            .filter((block) => block.type === 'text')
            .map((block) => (block as any).text);

        return textBlocks.join('\n');
    }

    /**
     * Convert Cloudflare response to universal format
     */
    private convertFromCFResponse(response: any): AICompletionResponse {
        const text = response.response || response.result?.response || '';

        return {
            content: [{ type: 'text', text }],
            stop_reason: 'end_turn',
        };
    }

    /**
     * Format tools as text description (workaround for lack of function calling)
     */
    private formatToolsAsText(tools: AIToolDefinition[]): string {
        const parts = [
            'You have access to the following tools:',
            '',
            ...tools.map((tool) => {
                const params = Object.entries(tool.input_schema.properties || {})
                    .map(([name, schema]: [string, any]) => {
                        const required = tool.input_schema.required?.includes(name) ? ' (required)' : '';
                        return `  - ${name}${required}: ${schema.description || schema.type}`;
                    })
                    .join('\n');

                return `**${tool.name}**\n${tool.description}\n\nParameters:\n${params}`;
            }),
            '',
            'To use a tool, respond with a JSON object in this format:',
            '```json',
            '{',
            '  "tool": "tool_name",',
            '  "input": {',
            '    "param1": "value1",',
            '    "param2": "value2"',
            '  }',
            '}',
            '```',
        ];

        return parts.join('\n');
    }

    /**
     * Handle provider errors
     */
    private handleError(error: any): AIProviderError {
        if (error.message?.includes('model not found')) {
            return new AIProviderInvalidRequestError(
                AIProvider.CLOUDFLARE,
                `Model ${this.model} not available in Workers AI`
            );
        }

        return new AIProviderError(
            error.message || 'Cloudflare Workers AI request failed',
            AIProvider.CLOUDFLARE,
            error.code,
            error.status
        );
    }
}

/**
 * Cloudflare Workers AI model catalog
 * Free tier models as of October 2025
 */
export const CLOUDFLARE_MODEL_CATALOG: ModelInfo[] = [
    {
        id: '@cf/meta/llama-3.1-8b-instruct',
        name: 'Llama 3.1 8B Instruct',
        provider: AIProvider.CLOUDFLARE,
        contextWindow: 8192,
        inputCostPer1K: 0.0, // FREE!
        outputCostPer1K: 0.0,
        supportsFunctions: false, // No native function calling yet
        description: 'Free 8B model, good for most tasks',
    },
    {
        id: '@cf/meta/llama-3-8b-instruct',
        name: 'Llama 3 8B Instruct',
        provider: AIProvider.CLOUDFLARE,
        contextWindow: 8192,
        inputCostPer1K: 0.0,
        outputCostPer1K: 0.0,
        supportsFunctions: false,
        description: 'Free Llama 3 model',
    },
    {
        id: '@cf/mistral/mistral-7b-instruct-v0.1',
        name: 'Mistral 7B Instruct',
        provider: AIProvider.CLOUDFLARE,
        contextWindow: 8192,
        inputCostPer1K: 0.0,
        outputCostPer1K: 0.0,
        supportsFunctions: false,
        description: 'Free Mistral model',
    },
    {
        id: '@cf/qwen/qwen1.5-14b-chat-awq',
        name: 'Qwen 1.5 14B Chat',
        provider: AIProvider.CLOUDFLARE,
        contextWindow: 8192,
        inputCostPer1K: 0.0,
        outputCostPer1K: 0.0,
        supportsFunctions: false,
        description: 'Free 14B chat model',
    },
];

/**
 * Get recommended Cloudflare model
 */
export function getRecommendedCloudflareModel(): ModelInfo {
    // Default to Llama 3.1 8B (best free option)
    return CLOUDFLARE_MODEL_CATALOG[0];
}

/**
 * Check if model is available in Cloudflare Workers AI
 */
export function isCloudflareModel(modelId: string): boolean {
    return CLOUDFLARE_MODEL_CATALOG.some((m) => m.id === modelId);
}
