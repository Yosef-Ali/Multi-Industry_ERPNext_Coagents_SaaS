/**
 * T145: Universal AI Provider System
 * Entry point for AI provider abstractions
 */

// Core types
export * from './types';

// Providers
export * from './providers/openrouter';
export * from './providers/cloudflare';

// Factory
export * from './universal-provider';
export { ProviderFactory, getGlobalProvider, resetGlobalProvider } from './universal-provider';

// Re-export commonly used items
export type {
  IAIProvider,
  AIMessage,
  AIToolDefinition,
  AICompletionResponse,
  StreamEventHandler,
  AIProviderConfig,
  MessageContent,
} from './types';

export { AIProvider } from './types';
