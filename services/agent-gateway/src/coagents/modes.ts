/**
 * Co-Agent Mode Implementations
 * 
 * Concrete implementations of different co-agent modes:
 * - ChatCoAgent: Standard conversational mode
 * - DeveloperCoAgent: v0-style multi-variant generation
 * - AnalyzerCoAgent: Deep analysis with visualizations
 * - RefinerCoAgent: Iterative refinement
 */

import {
  IAIProvider,
  AIMessage,
  AIToolDefinition,
  MessageContent,
} from '../ai/types';
import { BaseCoAgent } from './base';
import {
  CoAgentMode,
  CoAgentConfig,
  CoAgentResponse,
  Artifact,
  ArtifactType,
  VariantGenerationRequest,
  RefinementRequest,
  VariantStrategy,
  VariantGenerationError,
  ArtifactParsingError,
} from './types';

/**
 * Chat Co-Agent
 * Standard conversational mode with single response
 */
export class ChatCoAgent extends BaseCoAgent {
  constructor(
    provider: IAIProvider,
    customConfig?: Partial<CoAgentConfig>
  ) {
    super(CoAgentMode.CHAT, provider, customConfig);
  }
  
  async generateResponse(
    request: VariantGenerationRequest
  ): Promise<CoAgentResponse> {
    try {
      // Build conversation history
      const messages: AIMessage[] = [
        {
          role: 'system',
          content: this.buildSystemPrompt(request),
        },
        ...(request.conversationHistory || []),
        {
          role: 'user',
          content: request.prompt,
        },
      ];
      
      // Get AI completion
      const completion = await this.provider.complete(messages, {
        maxTokens: this.config.maxTokens,
        temperature: this.config.temperature,
      });
      
      // Convert content to string
      const responseText = this.contentToString(completion.content);
      
      // Extract artifact from response
      const extractedArtifacts = this.extractArtifactsFromResponse(
        responseText,
        request.artifactType
      );
      
      let artifact: Artifact;
      if (extractedArtifacts.length > 0) {
        artifact = this.createArtifact(
          request.artifactType,
          extractedArtifacts[0].title || this.generateDefaultTitle(request),
          extractedArtifacts[0].description || 'Generated solution',
          extractedArtifacts[0].content
        );
      } else {
        // No code block found, use entire response as artifact
        artifact = this.createArtifact(
          request.artifactType,
          this.generateDefaultTitle(request),
          'Generated solution',
          responseText
        );
      }
      
      this.validateArtifact(artifact);
      
      // Convert usage format
      const usage = completion.usage
        ? {
            promptTokens: completion.usage.input_tokens,
            completionTokens: completion.usage.output_tokens,
            totalTokens:
              completion.usage.input_tokens + completion.usage.output_tokens,
          }
        : undefined;
      
      // Build response
      return {
        mode: CoAgentMode.CHAT,
        explanation: this.extractExplanation(responseText),
        artifacts: [artifact],
        followUpQuestions: this.config.suggestFollowUps
          ? this.generateFollowUpQuestions([artifact], request.prompt)
          : undefined,
        usage,
        timestamp: new Date(),
        threadId: request.threadId,
      };
    } catch (error) {
      throw new VariantGenerationError(
        `Failed to generate chat response: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: error, request }
      );
    }
  }
  
  async refineArtifact(request: RefinementRequest): Promise<Artifact> {
    // For chat mode, refinement is not implemented yet
    throw new Error('Refinement not supported in chat mode. Use refiner mode.');
  }
  
  private buildSystemPrompt(request: VariantGenerationRequest): string {
    const artifactTypeInstructions = this.getArtifactTypeInstructions(
      request.artifactType
    );
    
    let prompt = `You are a helpful AI assistant specializing in ${artifactTypeInstructions.domain}.\n\n`;
    prompt += `When generating ${artifactTypeInstructions.name}, follow these guidelines:\n`;
    prompt += artifactTypeInstructions.guidelines.map((g) => `- ${g}`).join('\n');
    prompt += '\n\n';
    
    if (request.constraints && request.constraints.length > 0) {
      prompt += `Additional constraints:\n`;
      prompt += request.constraints.map((c) => `- ${c}`).join('\n');
      prompt += '\n\n';
    }
    
    if (request.preferences && request.preferences.length > 0) {
      prompt += `Preferences:\n`;
      prompt += request.preferences.map((p) => `- ${p}`).join('\n');
      prompt += '\n\n';
    }
    
    prompt += `Always wrap code in markdown code blocks with the appropriate language identifier.`;
    
    return prompt;
  }
  
  private extractExplanation(response: string): string {
    // Extract text before first code block
    const codeBlockIndex = response.indexOf('```');
    if (codeBlockIndex > 0) {
      return response.substring(0, codeBlockIndex).trim();
    }
    
    // If no code block, return first paragraph
    const firstParagraph = response.split('\n\n')[0];
    return firstParagraph.trim();
  }
  
  private generateDefaultTitle(request: VariantGenerationRequest): string {
    const typeNames: Record<ArtifactType, string> = {
      [ArtifactType.CODE]: 'Generated Code',
      [ArtifactType.REACT_COMPONENT]: 'React Component',
      [ArtifactType.HTML]: 'HTML Page',
      [ArtifactType.PYTHON]: 'Python Script',
      [ArtifactType.SQL]: 'SQL Query',
      [ArtifactType.JSON]: 'JSON Configuration',
      [ArtifactType.MARKDOWN]: 'Documentation',
      [ArtifactType.DIAGRAM]: 'Diagram',
      [ArtifactType.ERPNEXT_DOCTYPE]: 'ERPNext DocType',
      [ArtifactType.FRAPPE_WORKFLOW]: 'Frappe Workflow',
    };
    
    return typeNames[request.artifactType] || 'Generated Artifact';
  }
  
  private getArtifactTypeInstructions(type: ArtifactType): {
    domain: string;
    name: string;
    guidelines: string[];
  } {
    const instructions: Record<
      ArtifactType,
      { domain: string; name: string; guidelines: string[] }
    > = {
      [ArtifactType.CODE]: {
        domain: 'software development',
        name: 'code',
        guidelines: [
          'Write clean, well-documented code',
          'Follow industry best practices',
          'Include helpful comments',
          'Handle edge cases and errors',
        ],
      },
      [ArtifactType.REACT_COMPONENT]: {
        domain: 'React development',
        name: 'React components',
        guidelines: [
          'Use functional components with hooks',
          'Follow React best practices',
          'Include TypeScript types',
          'Make components reusable',
          'Add proper prop validation',
        ],
      },
      [ArtifactType.HTML]: {
        domain: 'web development',
        name: 'HTML',
        guidelines: [
          'Use semantic HTML5 elements',
          'Ensure accessibility (ARIA labels)',
          'Include proper meta tags',
          'Make it responsive',
        ],
      },
      [ArtifactType.PYTHON]: {
        domain: 'Python programming',
        name: 'Python scripts',
        guidelines: [
          'Follow PEP 8 style guidelines',
          'Include docstrings',
          'Handle exceptions properly',
          'Use type hints where appropriate',
        ],
      },
      [ArtifactType.SQL]: {
        domain: 'database management',
        name: 'SQL queries',
        guidelines: [
          'Write efficient queries',
          'Use proper indexing hints',
          'Include comments for complex logic',
          'Consider performance implications',
        ],
      },
      [ArtifactType.JSON]: {
        domain: 'data configuration',
        name: 'JSON',
        guidelines: [
          'Ensure valid JSON syntax',
          'Use meaningful key names',
          'Include comments where supported',
          'Follow schema best practices',
        ],
      },
      [ArtifactType.MARKDOWN]: {
        domain: 'documentation',
        name: 'documentation',
        guidelines: [
          'Use clear headings and structure',
          'Include code examples',
          'Add tables for comparisons',
          'Use proper markdown syntax',
        ],
      },
      [ArtifactType.DIAGRAM]: {
        domain: 'visualization',
        name: 'diagrams',
        guidelines: [
          'Use clear, descriptive labels',
          'Follow Mermaid syntax',
          'Keep diagrams focused and readable',
          'Use appropriate diagram types',
        ],
      },
      [ArtifactType.ERPNEXT_DOCTYPE]: {
        domain: 'ERPNext development',
        name: 'DocType definitions',
        guidelines: [
          'Follow ERPNext naming conventions',
          'Include proper field types',
          'Add permissions and roles',
          'Consider workflow requirements',
        ],
      },
      [ArtifactType.FRAPPE_WORKFLOW]: {
        domain: 'Frappe framework',
        name: 'workflows',
        guidelines: [
          'Define clear states and transitions',
          'Include proper permissions',
          'Add validation logic',
          'Document workflow steps',
        ],
      },
    };
    
    return instructions[type];
  }
}

/**
 * Developer Co-Agent
 * v0-style multi-variant generation (3 variants per request)
 */
export class DeveloperCoAgent extends BaseCoAgent {
  constructor(
    provider: IAIProvider,
    customConfig?: Partial<CoAgentConfig>
  ) {
    super(CoAgentMode.DEVELOPER, provider, customConfig);
  }
  
  async generateResponse(
    request: VariantGenerationRequest
  ): Promise<CoAgentResponse> {
    try {
      // Define 3 distinct approaches/strategies
      const strategies = this.defineVariantStrategies(request);
      
      // Generate all 3 variants in a single prompt for efficiency
      const messages: AIMessage[] = [
        {
          role: 'system',
          content: this.buildDeveloperSystemPrompt(request, strategies),
        },
        ...(request.conversationHistory || []),
        {
          role: 'user',
          content: request.prompt,
        },
      ];
      
      // Get AI completion with higher token limit for 3 variants
      const completion = await this.provider.complete(messages, {
        maxTokens: this.config.maxTokens || 6000,
        temperature: this.config.temperature || 0.8,
      });
      
      // Convert content to string
      const responseText = this.contentToString(completion.content);
      
      // Parse response to extract 3 variants
      const variants = this.parseVariantResponse(
        responseText,
        request.artifactType,
        this.config.variantCount
      );
      
      if (variants.length === 0) {
        throw new ArtifactParsingError(
          'Failed to parse variants from AI response',
          { response: responseText }
        );
      }
      
      // Validate all variants
      variants.forEach((v) => this.validateArtifact(v));
      
      // Extract comparison summary
      const comparisonSummary = this.config.includeComparison
        ? this.extractComparisonSummary(responseText)
        : undefined;
      
      // Extract explanation (text before first variant)
      const explanation = this.extractDeveloperExplanation(responseText);
      
      // Convert usage format
      const usage = completion.usage
        ? {
            promptTokens: completion.usage.input_tokens,
            completionTokens: completion.usage.output_tokens,
            totalTokens:
              completion.usage.input_tokens + completion.usage.output_tokens,
          }
        : undefined;
      
      // Build response
      return {
        mode: CoAgentMode.DEVELOPER,
        explanation,
        artifacts: variants,
        followUpQuestions: this.config.suggestFollowUps
          ? this.generateFollowUpQuestions(variants, request.prompt)
          : undefined,
        comparisonSummary,
        usage,
        timestamp: new Date(),
        threadId: request.threadId,
      };
    } catch (error) {
      throw new VariantGenerationError(
        `Failed to generate developer variants: ${error instanceof Error ? error.message : 'Unknown error'}`,
        { originalError: error, request }
      );
    }
  }
  
  async refineArtifact(request: RefinementRequest): Promise<Artifact> {
    // Refinement in developer mode - not implemented yet
    // Will switch to RefinerCoAgent for this
    throw new Error(
      'Refinement not supported in developer mode. Use refiner mode.'
    );
  }
  
  private defineVariantStrategies(
    request: VariantGenerationRequest
  ): VariantStrategy[] {
    // Define 3 distinct approaches based on artifact type
    const strategies: VariantStrategy[] = [];
    
    switch (request.artifactType) {
      case ArtifactType.REACT_COMPONENT:
        strategies.push(
          {
            approach: 'Minimalist',
            focus: ['Simplicity', 'Performance', 'Minimal dependencies'],
            tradeoffs: ['Fewer features', 'Basic styling'],
            useCase: 'Quick implementation, easy to understand',
          },
          {
            approach: 'Feature-Rich',
            focus: ['Comprehensive features', 'Accessibility', 'User experience'],
            tradeoffs: ['More complexity', 'Larger bundle size'],
            useCase: 'Production-ready, full-featured component',
          },
          {
            approach: 'Modular',
            focus: ['Reusability', 'Composition', 'Flexibility'],
            tradeoffs: ['More components', 'Learning curve'],
            useCase: 'Scalable design system',
          }
        );
        break;
      
      case ArtifactType.PYTHON:
        strategies.push(
          {
            approach: 'Procedural',
            focus: ['Straightforward logic', 'Easy to read', 'Beginner-friendly'],
            tradeoffs: ['Less object-oriented', 'Harder to extend'],
            useCase: 'Scripts and utilities',
          },
          {
            approach: 'Object-Oriented',
            focus: ['Encapsulation', 'Reusability', 'Maintainability'],
            tradeoffs: ['More boilerplate', 'Complexity'],
            useCase: 'Large applications',
          },
          {
            approach: 'Functional',
            focus: ['Pure functions', 'Immutability', 'Composability'],
            tradeoffs: ['Different paradigm', 'Learning curve'],
            useCase: 'Data processing pipelines',
          }
        );
        break;
      
      default:
        // Generic strategies
        strategies.push(
          {
            approach: 'Simple',
            focus: ['Clarity', 'Minimal code', 'Quick implementation'],
            tradeoffs: ['Basic features', 'Less flexible'],
            useCase: 'Getting started quickly',
          },
          {
            approach: 'Robust',
            focus: ['Error handling', 'Edge cases', 'Production-ready'],
            tradeoffs: ['More code', 'Complexity'],
            useCase: 'Production systems',
          },
          {
            approach: 'Optimized',
            focus: ['Performance', 'Efficiency', 'Scalability'],
            tradeoffs: ['Harder to read', 'Premature optimization'],
            useCase: 'High-performance scenarios',
          }
        );
    }
    
    return strategies;
  }
  
  private buildDeveloperSystemPrompt(
    request: VariantGenerationRequest,
    strategies: VariantStrategy[]
  ): string {
    let prompt = `You are an expert developer co-agent, similar to v0.dev. Your role is to generate 3 distinct solution variants for each request.\n\n`;
    
    prompt += `For the user's request, generate exactly 3 variants using these approaches:\n\n`;
    
    strategies.forEach((strategy, index) => {
      prompt += `**Variant ${index + 1}: ${strategy.approach}**\n`;
      prompt += `- Focus: ${strategy.focus.join(', ')}\n`;
      prompt += `- Trade-offs: ${strategy.tradeoffs.join(', ')}\n`;
      prompt += `- Use case: ${strategy.useCase}\n\n`;
    });
    
    prompt += `Format your response as follows:\n\n`;
    prompt += `[Brief explanation of the problem and approach]\n\n`;
    prompt += `## Variant 1: [Title]\n`;
    prompt += `[Description of this variant's approach]\n`;
    prompt += `\`\`\`[language]\n`;
    prompt += `[code]\n`;
    prompt += `\`\`\`\n\n`;
    prompt += `## Variant 2: [Title]\n`;
    prompt += `[Description of this variant's approach]\n`;
    prompt += `\`\`\`[language]\n`;
    prompt += `[code]\n`;
    prompt += `\`\`\`\n\n`;
    prompt += `## Variant 3: [Title]\n`;
    prompt += `[Description of this variant's approach]\n`;
    prompt += `\`\`\`[language]\n`;
    prompt += `[code]\n`;
    prompt += `\`\`\`\n\n`;
    prompt += `## Comparison\n`;
    prompt += `[Brief comparison highlighting when to use each variant]\n\n`;
    
    if (request.constraints && request.constraints.length > 0) {
      prompt += `Constraints to consider:\n`;
      prompt += request.constraints.map((c) => `- ${c}`).join('\n');
      prompt += '\n\n';
    }
    
    if (request.preferences && request.preferences.length > 0) {
      prompt += `User preferences:\n`;
      prompt += request.preferences.map((p) => `- ${p}`).join('\n');
      prompt += '\n\n';
    }
    
    return prompt;
  }
  
  private extractDeveloperExplanation(response: string): string {
    // Extract text before first variant
    const variantMatch = /##\s*Variant\s*1/i.exec(response);
    if (variantMatch && variantMatch.index > 0) {
      return response.substring(0, variantMatch.index).trim();
    }
    
    // Fallback: first paragraph
    return response.split('\n\n')[0].trim();
  }
}

/**
 * Analyzer Co-Agent
 * Deep analysis with visualizations and insights
 */
export class AnalyzerCoAgent extends BaseCoAgent {
  constructor(
    provider: IAIProvider,
    customConfig?: Partial<CoAgentConfig>
  ) {
    super(CoAgentMode.ANALYZER, provider, customConfig);
  }
  
  async generateResponse(
    request: VariantGenerationRequest
  ): Promise<CoAgentResponse> {
    // Analyzer implementation - to be completed in next iteration
    throw new Error('Analyzer mode not yet implemented');
  }
  
  async refineArtifact(request: RefinementRequest): Promise<Artifact> {
    throw new Error('Refinement not supported in analyzer mode');
  }
}

/**
 * Refiner Co-Agent
 * Iteratively refines existing artifacts
 */
export class RefinerCoAgent extends BaseCoAgent {
  constructor(
    provider: IAIProvider,
    customConfig?: Partial<CoAgentConfig>
  ) {
    super(CoAgentMode.REFINER, provider, customConfig);
  }
  
  async generateResponse(
    request: VariantGenerationRequest
  ): Promise<CoAgentResponse> {
    // Refiner works with existing artifacts, not fresh generation
    if (!request.existingArtifact) {
      throw new Error('Refiner mode requires an existing artifact to refine');
    }
    
    // Convert to refinement request
    const refinementRequest: RefinementRequest = {
      artifactId: request.existingArtifact.id,
      instructions: request.prompt,
      threadId: request.threadId,
    };
    
    const refinedArtifact = await this.refineArtifact(refinementRequest);
    
    return {
      mode: CoAgentMode.REFINER,
      explanation: 'Refined artifact based on your feedback',
      artifacts: [refinedArtifact],
      timestamp: new Date(),
      threadId: request.threadId,
    };
  }
  
  async refineArtifact(request: RefinementRequest): Promise<Artifact> {
    // Refiner implementation - to be completed in next iteration
    throw new Error('Refiner mode not yet fully implemented');
  }
}
