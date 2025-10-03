/**
 * Co-Agent Type Definitions
 * 
 * Defines the core types for the ERPNext-focused developer co-agent system.
 * Generates single best-practice solutions following ERPNext conventions and patterns.
 */

/**
 * Co-Agent operating modes
 */
export enum CoAgentMode {
    /** Standard conversational mode - single response */
    CHAT = 'chat',

    /** Developer co-agent mode - generates single best-practice ERPNext solution */
    DEVELOPER = 'developer',

    /** Analyzer mode - deep analysis with visualizations */
    ANALYZER = 'analyzer',

    /** Refiner mode - iteratively refines a specific solution */
    REFINER = 'refiner',
}

/**
 * Types of artifacts that can be generated
 * ERPNext-focused artifact types for hotel management and sales workflows
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

    /** ERPNext Hotel Check-in UI and workflow */
    ERPNEXT_HOTEL_CHECKIN = 'erpnext_hotel_checkin',

    /** ERPNext Hotel Room Management */
    ERPNEXT_HOTEL_ROOM = 'erpnext_hotel_room',

    /** ERPNext Sales Order UI and workflow */
    ERPNEXT_SALES_ORDER = 'erpnext_sales_order',

    /** ERPNext Custom DocType with best practices */
    ERPNEXT_CUSTOM_DOCTYPE = 'erpnext_custom_doctype',

    /** ERPNext Report Definition */
    ERPNEXT_REPORT = 'erpnext_report',

    /** ERPNext Dashboard */
    ERPNEXT_DASHBOARD = 'erpnext_dashboard',
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

    /** Solution approach (for developer mode) */
    approach?: string;

    /** Key features of this solution (for developer mode) */
    features?: string[];

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

    /** Generated artifacts (1 for all modes with ERPNext best practices) */
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
        generateVariants: false, // Single best-practice solution for ERPNext
        variantCount: 1,
        includeComparison: false,
        suggestFollowUps: true,
        maxTokens: 4000,
        temperature: 0.7, // Balanced for ERPNext best practices
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
