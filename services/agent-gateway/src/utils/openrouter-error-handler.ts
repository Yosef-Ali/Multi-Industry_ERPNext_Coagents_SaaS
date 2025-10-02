/**
 * OpenRouter API Error Handling
 * 
 * Comprehensive error handling for OpenRouter API calls including:
 * - Retry logic with exponential backoff
 * - Rate limit handling
 * - Cost tracking and budgeting
 * - Error classification and recovery
 * - Circuit breaker pattern for API failures
 */

import Anthropic from "@anthropic-ai/sdk";

// ============================================================================
// Error Types
// ============================================================================

export enum OpenRouterErrorType {
    RATE_LIMIT = "RATE_LIMIT",
    AUTHENTICATION = "AUTHENTICATION",
    INVALID_REQUEST = "INVALID_REQUEST",
    SERVER_ERROR = "SERVER_ERROR",
    TIMEOUT = "TIMEOUT",
    NETWORK = "NETWORK",
    UNKNOWN = "UNKNOWN"
}

export interface OpenRouterError {
    type: OpenRouterErrorType;
    message: string;
    statusCode?: number;
    retryable: boolean;
    retryAfter?: number; // seconds
    details?: any;
}

// ============================================================================
// Retry Configuration
// ============================================================================

export interface RetryConfig {
    maxRetries: number;
    initialDelayMs: number;
    maxDelayMs: number;
    backoffMultiplier: number;
    retryableErrors: OpenRouterErrorType[];
}

export const DEFAULT_RETRY_CONFIG: RetryConfig = {
    maxRetries: 3,
    initialDelayMs: 1000,
    maxDelayMs: 32000,
    backoffMultiplier: 2,
    retryableErrors: [
        OpenRouterErrorType.RATE_LIMIT,
        OpenRouterErrorType.SERVER_ERROR,
        OpenRouterErrorType.TIMEOUT,
        OpenRouterErrorType.NETWORK
    ]
};

// ============================================================================
// Cost Tracking
// ============================================================================

export interface CostTracker {
    totalCost: number;
    requestCount: number;
    tokenUsage: {
        input: number;
        output: number;
    };
    budget?: number; // Optional budget limit in USD
}

export class CostTracker {
    private costs: Map<string, number> = new Map(); // model -> cost
    private requests: number = 0;
    private inputTokens: number = 0;
    private outputTokens: number = 0;
    private budgetLimit?: number;

    constructor(budgetLimit?: number) {
        this.budgetLimit = budgetLimit;
    }

    /**
     * Record API call cost and token usage
     */
    recordUsage(model: string, inputTokens: number, outputTokens: number): void {
        this.requests++;
        this.inputTokens += inputTokens;
        this.outputTokens += outputTokens;

        // Estimate cost based on OpenRouter pricing
        // Note: These are approximate rates, actual costs vary by model
        const cost = this.estimateCost(model, inputTokens, outputTokens);

        const modelCost = this.costs.get(model) || 0;
        this.costs.set(model, modelCost + cost);

        // Check budget
        if (this.budgetLimit && this.getTotalCost() > this.budgetLimit) {
            console.warn(`⚠️  Budget limit exceeded: $${this.getTotalCost().toFixed(4)} > $${this.budgetLimit}`);
        }
    }

    /**
     * Estimate cost for a request (approximate)
     */
    private estimateCost(model: string, inputTokens: number, outputTokens: number): number {
        // Default rates (per 1M tokens) - adjust based on actual model pricing
        const defaultInputRate = 0.50;  // $0.50 per 1M tokens
        const defaultOutputRate = 1.50; // $1.50 per 1M tokens

        const inputCost = (inputTokens / 1_000_000) * defaultInputRate;
        const outputCost = (outputTokens / 1_000_000) * defaultOutputRate;

        return inputCost + outputCost;
    }

    /**
     * Get total cost across all models
     */
    getTotalCost(): number {
        return Array.from(this.costs.values()).reduce((sum, cost) => sum + cost, 0);
    }

    /**
     * Get cost breakdown by model
     */
    getCostBreakdown(): Record<string, number> {
        return Object.fromEntries(this.costs);
    }

    /**
     * Get usage statistics
     */
    getStats() {
        return {
            totalCost: this.getTotalCost(),
            requestCount: this.requests,
            tokenUsage: {
                input: this.inputTokens,
                output: this.outputTokens,
                total: this.inputTokens + this.outputTokens
            },
            costBreakdown: this.getCostBreakdown(),
            budgetLimit: this.budgetLimit,
            budgetRemaining: this.budgetLimit ? this.budgetLimit - this.getTotalCost() : undefined
        };
    }

    /**
     * Reset all statistics
     */
    reset(): void {
        this.costs.clear();
        this.requests = 0;
        this.inputTokens = 0;
        this.outputTokens = 0;
    }
}

// ============================================================================
// Error Classification
// ============================================================================

/**
 * Classify error from OpenRouter/Anthropic SDK
 */
export function classifyError(error: any): OpenRouterError {
    // Handle Anthropic SDK errors
    if (error.status) {
        const statusCode = error.status;

        if (statusCode === 401 || statusCode === 403) {
            return {
                type: OpenRouterErrorType.AUTHENTICATION,
                message: "Invalid or missing OpenRouter API key",
                statusCode,
                retryable: false,
                details: error.error
            };
        }

        if (statusCode === 429) {
            // Parse retry-after header if available
            const retryAfter = error.headers?.["retry-after"]
                ? parseInt(error.headers["retry-after"])
                : 60;

            return {
                type: OpenRouterErrorType.RATE_LIMIT,
                message: "OpenRouter rate limit exceeded",
                statusCode,
                retryable: true,
                retryAfter,
                details: error.error
            };
        }

        if (statusCode >= 400 && statusCode < 500) {
            return {
                type: OpenRouterErrorType.INVALID_REQUEST,
                message: error.error?.message || "Invalid request to OpenRouter API",
                statusCode,
                retryable: false,
                details: error.error
            };
        }

        if (statusCode >= 500) {
            return {
                type: OpenRouterErrorType.SERVER_ERROR,
                message: "OpenRouter server error",
                statusCode,
                retryable: true,
                details: error.error
            };
        }
    }

    // Handle timeout errors
    if (error.code === "ETIMEDOUT" || error.message?.includes("timeout")) {
        return {
            type: OpenRouterErrorType.TIMEOUT,
            message: "Request to OpenRouter timed out",
            retryable: true,
            details: error
        };
    }

    // Handle network errors
    if (error.code === "ENOTFOUND" || error.code === "ECONNREFUSED" || error.code === "ECONNRESET") {
        return {
            type: OpenRouterErrorType.NETWORK,
            message: "Network error connecting to OpenRouter",
            retryable: true,
            details: error
        };
    }

    // Unknown error
    return {
        type: OpenRouterErrorType.UNKNOWN,
        message: error.message || "Unknown error with OpenRouter API",
        retryable: false,
        details: error
    };
}

// ============================================================================
// Retry Logic with Exponential Backoff
// ============================================================================

/**
 * Calculate delay for retry with exponential backoff
 */
function calculateBackoffDelay(
    attempt: number,
    config: RetryConfig,
    retryAfter?: number
): number {
    // Use retry-after header if provided (for rate limits)
    if (retryAfter) {
        return retryAfter * 1000; // Convert to milliseconds
    }

    // Exponential backoff: initialDelay * (backoffMultiplier ^ attempt)
    const delay = config.initialDelayMs * Math.pow(config.backoffMultiplier, attempt);

    // Cap at maxDelayMs
    return Math.min(delay, config.maxDelayMs);
}

/**
 * Sleep for specified milliseconds
 */
function sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
}

/**
 * Retry an async operation with exponential backoff
 */
export async function retryWithBackoff<T>(
    operation: () => Promise<T>,
    config: RetryConfig = DEFAULT_RETRY_CONFIG,
    onRetry?: (error: OpenRouterError, attempt: number, delay: number) => void
): Promise<T> {
    let lastError: OpenRouterError | undefined;

    for (let attempt = 0; attempt <= config.maxRetries; attempt++) {
        try {
            return await operation();
        } catch (error) {
            const classifiedError = classifyError(error);
            lastError = classifiedError;

            // Don't retry if error is not retryable
            if (!classifiedError.retryable) {
                throw new Error(`Non-retryable error: ${classifiedError.message}`, { cause: error });
            }

            // Don't retry if not in retryable error types
            if (!config.retryableErrors.includes(classifiedError.type)) {
                throw new Error(`Error type not configured for retry: ${classifiedError.type}`, { cause: error });
            }

            // Don't retry if we've exhausted attempts
            if (attempt === config.maxRetries) {
                throw new Error(
                    `Max retries (${config.maxRetries}) exceeded: ${classifiedError.message}`,
                    { cause: error }
                );
            }

            // Calculate delay and retry
            const delay = calculateBackoffDelay(attempt, config, classifiedError.retryAfter);

            if (onRetry) {
                onRetry(classifiedError, attempt + 1, delay);
            } else {
                console.warn(
                    `🔄 Retry attempt ${attempt + 1}/${config.maxRetries} after ${delay}ms: ${classifiedError.message}`
                );
            }

            await sleep(delay);
        }
    }

    throw new Error(
        `Operation failed after ${config.maxRetries} retries: ${lastError?.message}`,
        { cause: lastError }
    );
}

// ============================================================================
// Circuit Breaker Pattern
// ============================================================================

export enum CircuitState {
    CLOSED = "CLOSED",     // Normal operation
    OPEN = "OPEN",         // Failing, reject requests immediately
    HALF_OPEN = "HALF_OPEN" // Testing if service recovered
}

export interface CircuitBreakerConfig {
    failureThreshold: number;    // Failures before opening circuit
    successThreshold: number;    // Successes needed to close circuit
    timeout: number;             // Time to wait before half-open (ms)
}

export class CircuitBreaker {
    private state: CircuitState = CircuitState.CLOSED;
    private failureCount: number = 0;
    private successCount: number = 0;
    private nextAttempt: number = Date.now();

    constructor(private config: CircuitBreakerConfig) { }

    /**
     * Execute operation with circuit breaker protection
     */
    async execute<T>(operation: () => Promise<T>): Promise<T> {
        // Check if circuit is open
        if (this.state === CircuitState.OPEN) {
            if (Date.now() < this.nextAttempt) {
                throw new Error(
                    `Circuit breaker is OPEN. Service unavailable until ${new Date(this.nextAttempt).toISOString()}`
                );
            }
            // Transition to half-open to test service
            this.state = CircuitState.HALF_OPEN;
            this.successCount = 0;
            console.log("🔄 Circuit breaker transitioning to HALF_OPEN");
        }

        try {
            const result = await operation();
            this.onSuccess();
            return result;
        } catch (error) {
            this.onFailure();
            throw error;
        }
    }

    private onSuccess(): void {
        this.failureCount = 0;

        if (this.state === CircuitState.HALF_OPEN) {
            this.successCount++;

            if (this.successCount >= this.config.successThreshold) {
                this.state = CircuitState.CLOSED;
                this.successCount = 0;
                console.log("✅ Circuit breaker CLOSED - service recovered");
            }
        }
    }

    private onFailure(): void {
        this.failureCount++;
        this.successCount = 0;

        if (this.failureCount >= this.config.failureThreshold) {
            this.state = CircuitState.OPEN;
            this.nextAttempt = Date.now() + this.config.timeout;
            console.error(
                `🚨 Circuit breaker OPEN - service unavailable until ${new Date(this.nextAttempt).toISOString()}`
            );
        }
    }

    getState(): CircuitState {
        return this.state;
    }

    getMetrics(): {
        state: CircuitState;
        failureCount: number;
        successCount: number;
        nextAttempt: number;
        config: CircuitBreakerConfig;
    } {
        return {
            state: this.state,
            failureCount: this.failureCount,
            successCount: this.successCount,
            nextAttempt: this.nextAttempt,
            config: { ...this.config }
        };
    }

    reset(): void {
        this.state = CircuitState.CLOSED;
        this.failureCount = 0;
        this.successCount = 0;
        this.nextAttempt = Date.now();
    }
}

// ============================================================================
// Exports
// ============================================================================

export const globalCostTracker = new CostTracker();

export const globalCircuitBreaker = new CircuitBreaker({
    failureThreshold: 5,
    successThreshold: 2,
    timeout: 60000 // 1 minute
});
