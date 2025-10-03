/**
 * Base Co-Agent Class
 * 
 * Abstract base class for all co-agent implementations.
 * Provides common functionality for artifact generation, validation, and management.
 */

import { IAIProvider } from '../ai/types';
import {
  CoAgentMode,
  CoAgentConfig,
  CoAgentResponse,
  Artifact,
  ArtifactType,
  VariantGenerationRequest,
  RefinementRequest,
  DEFAULT_MODE_CONFIGS,
  CoAgentError,
  InvalidModeError,
} from './types';

/**
 * Abstract base class for co-agents
 */
export abstract class BaseCoAgent {
  protected config: CoAgentConfig;
  protected provider: IAIProvider;
  
  constructor(
    mode: CoAgentMode,
    provider: IAIProvider,
    customConfig?: Partial<CoAgentConfig>
  ) {
    // Merge default config with custom config
    this.config = {
      ...DEFAULT_MODE_CONFIGS[mode],
      ...customConfig,
      mode, // Ensure mode is set correctly
    };
    
    this.provider = provider;
  }
  
  /**
   * Get the current mode
   */
  public getMode(): CoAgentMode {
    return this.config.mode;
  }
  
  /**
   * Get the current configuration
   */
  public getConfig(): CoAgentConfig {
    return { ...this.config };
  }
  
  /**
   * Update configuration
   */
  public updateConfig(updates: Partial<CoAgentConfig>): void {
    this.config = { ...this.config, ...updates };
  }
  
  /**
   * Generate response based on user request
   * Must be implemented by subclasses
   */
  public abstract generateResponse(
    request: VariantGenerationRequest
  ): Promise<CoAgentResponse>;
  
  /**
   * Refine an existing artifact
   * Must be implemented by subclasses
   */
  public abstract refineArtifact(
    request: RefinementRequest
  ): Promise<Artifact>;
  
  /**
   * Create a new artifact with metadata
   */
  protected createArtifact(
    type: ArtifactType,
    title: string,
    description: string,
    content: string,
    options?: {
      language?: string;
      variantNumber?: number;
      differentiators?: string[];
      tags?: string[];
      dependencies?: string[];
      parentId?: string;
      version?: number;
    }
  ): Artifact {
    const now = new Date();
    
    return {
      id: this.generateArtifactId(),
      type,
      title,
      description,
      content,
      language: options?.language || this.inferLanguage(type),
      createdAt: now,
      updatedAt: now,
      variantNumber: options?.variantNumber,
      differentiators: options?.differentiators,
      tags: options?.tags,
      dependencies: options?.dependencies,
      parentId: options?.parentId,
      version: options?.version || 1,
    };
  }
  
  /**
   * Generate a unique artifact ID
   */
  protected generateArtifactId(): string {
    const timestamp = Date.now();
    const random = Math.random().toString(36).substring(2, 9);
    return `artifact_${timestamp}_${random}`;
  }
  
  /**
   * Infer programming language from artifact type
   */
  protected inferLanguage(type: ArtifactType): string {
    const languageMap: Record<ArtifactType, string> = {
      [ArtifactType.CODE]: 'typescript',
      [ArtifactType.REACT_COMPONENT]: 'tsx',
      [ArtifactType.HTML]: 'html',
      [ArtifactType.PYTHON]: 'python',
      [ArtifactType.SQL]: 'sql',
      [ArtifactType.JSON]: 'json',
      [ArtifactType.MARKDOWN]: 'markdown',
      [ArtifactType.DIAGRAM]: 'mermaid',
      [ArtifactType.ERPNEXT_DOCTYPE]: 'json',
      [ArtifactType.FRAPPE_WORKFLOW]: 'python',
    };
    
    return languageMap[type] || 'text';
  }
  
  /**
   * Extract artifacts from AI response
   * Looks for code blocks and artifact markers
   */
  protected extractArtifactsFromResponse(
    response: string,
    expectedType: ArtifactType
  ): Array<{ content: string; title?: string; description?: string }> {
    const artifacts: Array<{
      content: string;
      title?: string;
      description?: string;
    }> = [];
    
    // Pattern 1: Look for explicit artifact markers
    const artifactPattern = /<artifact\s+title="([^"]+)"\s+description="([^"]+)"\s+type="[^"]+">(.+?)<\/artifact>/gs;
    let match;
    
    while ((match = artifactPattern.exec(response)) !== null) {
      artifacts.push({
        title: match[1],
        description: match[2],
        content: match[3].trim(),
      });
    }
    
    // Pattern 2: Look for code blocks if no explicit artifacts found
    if (artifacts.length === 0) {
      const codeBlockPattern = /```(\w+)?\n([\s\S]+?)```/g;
      let codeMatch;
      
      while ((codeMatch = codeBlockPattern.exec(response)) !== null) {
        artifacts.push({
          content: codeMatch[2].trim(),
        });
      }
    }
    
    return artifacts;
  }
  
  /**
   * Parse variant response that contains multiple artifacts
   * Expects format with "## Variant 1:", "## Variant 2:", etc.
   */
  protected parseVariantResponse(
    response: string,
    artifactType: ArtifactType,
    variantCount: number
  ): Artifact[] {
    const variants: Artifact[] = [];
    
    // Split response by variant headers
    const variantPattern = /##\s*Variant\s*(\d+)[:\s]+([^\n]+)\n([\s\S]+?)(?=##\s*Variant|\n##\s*Comparison|$)/gi;
    let match;
    
    while ((match = variantPattern.exec(response)) !== null) {
      const variantNum = parseInt(match[1]);
      const title = match[2].trim();
      const variantContent = match[3].trim();
      
      // Extract description (usually first paragraph)
      const descMatch = /^([^\n]+(?:\n(?!```)[^\n]+)*)/m.exec(variantContent);
      const description = descMatch ? descMatch[1].trim() : '';
      
      // Extract code content
      const extractedArtifacts = this.extractArtifactsFromResponse(
        variantContent,
        artifactType
      );
      
      if (extractedArtifacts.length > 0) {
        const artifact = this.createArtifact(
          artifactType,
          title,
          description,
          extractedArtifacts[0].content,
          {
            variantNumber: variantNum,
            differentiators: this.extractDifferentiators(variantContent),
          }
        );
        
        variants.push(artifact);
      }
    }
    
    // Fallback: if no variant headers found, try to extract code blocks directly
    if (variants.length === 0) {
      const extractedArtifacts = this.extractArtifactsFromResponse(
        response,
        artifactType
      );
      
      extractedArtifacts.slice(0, variantCount).forEach((extracted, index) => {
        const artifact = this.createArtifact(
          artifactType,
          extracted.title || `Variant ${index + 1}`,
          extracted.description || `Solution approach ${index + 1}`,
          extracted.content,
          {
            variantNumber: index + 1,
          }
        );
        variants.push(artifact);
      });
    }
    
    return variants;
  }
  
  /**
   * Extract key differentiators from variant description
   */
  protected extractDifferentiators(variantContent: string): string[] {
    const differentiators: string[] = [];
    
    // Look for bullet points with differentiators
    const patterns = [
      /[-*]\s*\*\*(.+?)\*\*[:\s]*/g, // Bold markers
      /[-*]\s*Key:\s*(.+?)$/gm, // "Key:" prefix
      /[-*]\s*Focus:\s*(.+?)$/gm, // "Focus:" prefix
      /[-*]\s*Approach:\s*(.+?)$/gm, // "Approach:" prefix
    ];
    
    for (const pattern of patterns) {
      let match;
      while ((match = pattern.exec(variantContent)) !== null) {
        differentiators.push(match[1].trim());
      }
    }
    
    return differentiators.slice(0, 3); // Limit to 3 differentiators
  }
  
  /**
   * Extract comparison summary from response
   */
  protected extractComparisonSummary(response: string): string | undefined {
    const comparisonMatch = /##\s*Comparison[:\s]+(.+?)(?=\n##|$)/is.exec(
      response
    );
    return comparisonMatch ? comparisonMatch[1].trim() : undefined;
  }
  
  /**
   * Generate follow-up questions based on artifacts
   */
  protected generateFollowUpQuestions(
    artifacts: Artifact[],
    originalPrompt: string
  ): string[] {
    const questions: string[] = [];
    
    if (this.config.mode === CoAgentMode.DEVELOPER && artifacts.length > 1) {
      questions.push(
        `Would you like me to refine any of these variants?`,
        `Should I explain the trade-offs in more detail?`,
        `Would you like to see a different approach?`
      );
    } else if (this.config.mode === CoAgentMode.CHAT) {
      questions.push(
        `Would you like me to explain any part in more detail?`,
        `Should I provide an example?`,
        `Is there anything you'd like to modify?`
      );
    }
    
    return questions;
  }
  
  /**
   * Validate artifact content
   */
  protected validateArtifact(artifact: Artifact): void {
    if (!artifact.content || artifact.content.trim().length === 0) {
      throw new CoAgentError(
        'Artifact content cannot be empty',
        'INVALID_ARTIFACT'
      );
    }
    
    if (!artifact.title || artifact.title.trim().length === 0) {
      throw new CoAgentError(
        'Artifact title cannot be empty',
        'INVALID_ARTIFACT'
      );
    }
  }
  
  /**
   * Calculate token usage estimate
   */
  protected estimateTokens(text: string): number {
    // Rough estimate: ~4 characters per token
    return Math.ceil(text.length / 4);
  }
  
  /**
   * Convert MessageContent[] to string for processing
   */
  protected contentToString(content: import('../ai/types').MessageContent[]): string {
    return content
      .map((item) => {
        if (item.type === 'text') {
          return item.text;
        } else if (item.type === 'tool_use') {
          return `[Tool: ${item.name}]`;
        } else if (item.type === 'tool_result') {
          return item.content;
        }
        return '';
      })
      .join('\n');
  }
}

/**
 * Factory for creating co-agents
 */
export class CoAgentFactory {
  /**
   * Create a co-agent based on mode
   */
  public static create(
    mode: CoAgentMode,
    provider: IAIProvider,
    customConfig?: Partial<CoAgentConfig>
  ): BaseCoAgent {
    // Import implementations lazily to avoid circular dependencies
    switch (mode) {
      case CoAgentMode.DEVELOPER:
        // Will be implemented in modes.ts
        throw new InvalidModeError(
          `Developer mode not yet implemented. Use ChatCoAgent for now.`
        );
      
      case CoAgentMode.ANALYZER:
        throw new InvalidModeError(
          `Analyzer mode not yet implemented. Use ChatCoAgent for now.`
        );
      
      case CoAgentMode.REFINER:
        throw new InvalidModeError(
          `Refiner mode not yet implemented. Use ChatCoAgent for now.`
        );
      
      case CoAgentMode.CHAT:
      default:
        // Will be implemented in modes.ts
        throw new InvalidModeError(
          `Chat mode implementation in progress. Please wait for modes.ts.`
        );
    }
  }
}
