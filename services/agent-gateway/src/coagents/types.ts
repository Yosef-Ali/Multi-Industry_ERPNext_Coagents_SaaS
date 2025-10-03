/**
 * Co-Agent Type Definitions
 * 
 * Defines the core types for the v0-style multi-variant co-agent system.
 * This enables generation of multiple solution variants and interactive refinement.
 */

/**
 * Co-Agent operating modes
 */
export enum CoAgentMode {
  /** Standard conversational mode - single response */
  CHAT = 'chat',
  
  /** Developer co-agent mode - generates 3 variants per request */
  DEVELOPER = 'developer',
  
  /** Analyzer mode - deep analysis with visualizations */
  ANALYZER = 'analyzer',
  
  /** Refiner mode - iteratively refines a specific solution */
  REFINER = 'refiner',
}

/**
 * Types of artifacts that can be generated
 */
export enum ArtifactType {
  /** TypeScript/JavaScript code */
  CODE = 'code',
  
  /** React component */
  REACT_COMPONENT = 'react_component',
  
  /** HTML page */
  HTML = 'html',
  
  /** Python script */
  PYTHON = 'python',
  
  /** SQL query */
  SQL = 'sql',
  
  /** JSON configuration */
  JSON = 'json',
  
  /** Markdown document */
  MARKDOWN = 'markdown',
  
  /** Mermaid diagram */
  DIAGRAM = 'diagram',
  
  /** ERPNext DocType definition */
  ERPNEXT_DOCTYPE = 'erpnext_doctype',
  
  /** Frappe workflow */
  FRAPPE_WORKFLOW = 'frappe_workflow',
}

/**
 * Artifact metadata and content
 */
export interface Artifact {
  /** Unique identifier for this artifact */
  id: string;
  
  /** Type of artifact */
  type: ArtifactType;
  
  /** Human-readable title */
  title: string;
  
  /** Detailed description of what this artifact does */
  description: string;
  
  /** The actual content/code */
  content: string;
  
  /** Programming language for syntax highlighting */
  language?: string;
  
  /** Timestamp when created */
  createdAt: Date;
  
  /** Timestamp when last modified */
  updatedAt: Date;
  
  /** Variant number (for developer mode: 1, 2, or 3) */
  variantNumber?: number;
  
  /** Key differences from other variants (for developer mode) */
  differentiators?: string[];
  
  /** Tags for categorization */
  tags?: string[];
  
  /** Dependencies required to run this artifact */
  dependencies?: string[];
  
  /** Parent artifact ID (if this is a refinement) */
  parentId?: string;
  
  /** Version number (for tracking refinements) */
  version?: number;
}

/**
 * A complete co-agent response with multiple variants
 */
export interface CoAgentResponse {
  /** The mode used for this response */
  mode: CoAgentMode;
  
  /** Main explanation/context for the response */
  explanation: string;
  
  /** Generated artifacts (1 for chat mode, 3 for developer mode) */
  artifacts: Artifact[];
  
  /** Suggested follow-up questions */
  followUpQuestions?: string[];
  
  /** Comparison summary (for developer mode) */
  comparisonSummary?: string;
  
  /** Token usage statistics */
  usage?: {
    promptTokens: number;
    completionTokens: number;
    totalTokens: number;
    cost?: number;
  };
  
  /** Timestamp */
  timestamp: Date;
  
  /** Conversation thread ID */
  threadId?: string;
}

/**
 * Variant generation strategy
 */
export interface VariantStrategy {
  /** Approach/methodology for this variant */
  approach: string;
  
  /** Key focus areas */
  focus: string[];
  
  /** Trade-offs being made */
  tradeoffs: string[];
  
  /** Target use case */
  useCase: string;
}

/**
 * Request to generate variants
 */
export interface VariantGenerationRequest {
  /** User's request/requirement */
  prompt: string;
  
  /** Type of artifact to generate */
  artifactType: ArtifactType;
  
  /** Context from previous conversation */
  conversationHistory?: Array<{
    role: 'user' | 'assistant';
    content: string;
  }>;
  
  /** Specific constraints or requirements */
  constraints?: string[];
  
  /** Preferred technologies/frameworks */
  preferences?: string[];
  
  /** Existing artifact to refine (for refiner mode) */
  existingArtifact?: Artifact;
  
  /** Thread ID for tracking conversation */
  threadId?: string;
}

/**
 * Request to refine a specific variant
 */
export interface RefinementRequest {
  /** ID of the artifact to refine */
  artifactId: string;
  
  /** Refinement instructions */
  instructions: string;
  
  /** Areas to focus on */
  focusAreas?: ('performance' | 'readability' | 'features' | 'simplicity')[];
  
  /** Thread ID */
  threadId?: string;
}

/**
 * Co-Agent configuration
 */
export interface CoAgentConfig {
  /** Operating mode */
  mode: CoAgentMode;
  
  /** Whether to generate multiple variants */
  generateVariants: boolean;
  
  /** Number of variants to generate (typically 3) */
  variantCount: number;
  
  /** Whether to include comparison summary */
  includeComparison: boolean;
  
  /** Whether to suggest follow-ups */
  suggestFollowUps: boolean;
  
  /** Maximum tokens per generation */
  maxTokens?: number;
  
  /** Temperature for creativity */
  temperature?: number;
  
  /** AI provider to use */
  aiProvider?: 'openrouter' | 'cloudflare' | 'auto';
}

/**
 * Default configuration for each mode
 */
export const DEFAULT_MODE_CONFIGS: Record<CoAgentMode, CoAgentConfig> = {
  [CoAgentMode.CHAT]: {
    mode: CoAgentMode.CHAT,
    generateVariants: false,
    variantCount: 1,
    includeComparison: false,
    suggestFollowUps: true,
    maxTokens: 2000,
    temperature: 0.7,
  },
  
  [CoAgentMode.DEVELOPER]: {
    mode: CoAgentMode.DEVELOPER,
    generateVariants: true,
    variantCount: 3,
    includeComparison: true,
    suggestFollowUps: true,
    maxTokens: 4000,
    temperature: 0.8, // More creative for variants
  },
  
  [CoAgentMode.ANALYZER]: {
    mode: CoAgentMode.ANALYZER,
    generateVariants: false,
    variantCount: 1,
    includeComparison: false,
    suggestFollowUps: true,
    maxTokens: 3000,
    temperature: 0.3, // More precise for analysis
  },
  
  [CoAgentMode.REFINER]: {
    mode: CoAgentMode.REFINER,
    generateVariants: false,
    variantCount: 1,
    includeComparison: false,
    suggestFollowUps: true,
    maxTokens: 3000,
    temperature: 0.5, // Balanced for refinement
  },
};

/**
 * Error types for co-agent operations
 */
export class CoAgentError extends Error {
  constructor(
    message: string,
    public code: string,
    public details?: any
  ) {
    super(message);
    this.name = 'CoAgentError';
  }
}

export class VariantGenerationError extends CoAgentError {
  constructor(message: string, details?: any) {
    super(message, 'VARIANT_GENERATION_ERROR', details);
    this.name = 'VariantGenerationError';
  }
}

export class ArtifactParsingError extends CoAgentError {
  constructor(message: string, details?: any) {
    super(message, 'ARTIFACT_PARSING_ERROR', details);
    this.name = 'ArtifactParsingError';
  }
}

export class InvalidModeError extends CoAgentError {
  constructor(message: string, details?: any) {
    super(message, 'INVALID_MODE_ERROR', details);
    this.name = 'InvalidModeError';
  }
}
