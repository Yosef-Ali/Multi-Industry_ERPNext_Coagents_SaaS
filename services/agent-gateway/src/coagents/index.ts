/**
 * Co-Agent System Exports
 * 
 * Unified export point for the v0-style co-agent system.
 */

// Types
export type {
  CoAgentMode,
  ArtifactType,
  Artifact,
  CoAgentResponse,
  VariantStrategy,
  VariantGenerationRequest,
  RefinementRequest,
  CoAgentConfig,
} from './types';

export {
  DEFAULT_MODE_CONFIGS,
  CoAgentError,
  VariantGenerationError,
  ArtifactParsingError,
  InvalidModeError,
} from './types';

// Base class
export { BaseCoAgent, CoAgentFactory } from './base';

// Mode implementations
export {
  ChatCoAgent,
  DeveloperCoAgent,
  AnalyzerCoAgent,
  RefinerCoAgent,
} from './modes';

/**
 * Quick start guide:
 * 
 * ```typescript
 * import { getGlobalProvider } from '../ai/universal-provider';
 * import { DeveloperCoAgent, CoAgentMode } from './';
 * 
 * // Get AI provider
 * const provider = await getGlobalProvider();
 * 
 * // Create developer co-agent
 * const coagent = new DeveloperCoAgent(provider);
 * 
 * // Generate 3 variants
 * const response = await coagent.generateResponse({
 *   prompt: 'Create a React component for a todo list',
 *   artifactType: ArtifactType.REACT_COMPONENT,
 *   preferences: ['TypeScript', 'Hooks', 'Tailwind CSS'],
 * });
 * 
 * // Access the 3 variants
 * console.log(`Generated ${response.artifacts.length} variants`);
 * response.artifacts.forEach((artifact, i) => {
 *   console.log(`Variant ${i + 1}: ${artifact.title}`);
 *   console.log(artifact.differentiators);
 * });
 * 
 * // Get comparison
 * console.log(response.comparisonSummary);
 * ```
 */
