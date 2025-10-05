/**
 * Co-Agent Type Definitions
 * 
 * Defines the core types for the ERPNext-focused developer co-agent system.
 * Generates custom ERPNext applications for ANY industry based on user requirements.
 * 
 * Example prompts:
 * - "Create a detailed clinic management app with patient records and appointments"
 * - "Generate warehouse management app with inventory tracking and stock movements"
 * - "Build a school management system with student enrollment and attendance"
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
 * ERPNext-focused co-agent for generating custom applications in any industry
 * Examples: "Create clinic management app", "Generate warehouse workflow", "Build retail POS system"
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

    /** ERPNext DocType definition - Generate custom DocTypes for any domain */
    ERPNEXT_DOCTYPE = 'erpnext_doctype',

    /** Frappe workflow - Generate workflows for any business process */
    FRAPPE_WORKFLOW = 'frappe_workflow',

    /** ERPNext Form UI - Generate form interface for any DocType */
    ERPNEXT_FORM_UI = 'erpnext_form_ui',

    /** ERPNext List View - Generate list view with filters for any DocType */
    ERPNEXT_LIST_VIEW = 'erpnext_list_view',

    /** ERPNext Report - Generate Script/Query reports for any domain */
    ERPNEXT_REPORT = 'erpnext_report',

    /** ERPNext Dashboard - Generate dashboards with charts for any domain */
    ERPNEXT_DASHBOARD = 'erpnext_dashboard',

    /** ERPNext Complete App - Generate full ERPNext app with DocTypes, workflows, UI */
    ERPNEXT_APP = 'erpnext_app',

    /** ERPNext Server Script - Generate Python server-side logic */
    ERPNEXT_SERVER_SCRIPT = 'erpnext_server_script',

    /** ERPNext Client Script - Generate JavaScript client-side logic */
    ERPNEXT_CLIENT_SCRIPT = 'erpnext_client_script',
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
 * Input type detection for hybrid approach
 */
export enum InputType {
    /** Detailed Product Requirements Document */
    PRD = 'prd',

    /** Simple/vague prompt that needs clarification */
    SIMPLE_PROMPT = 'simple_prompt',

    /** Well-defined prompt ready for generation */
    DETAILED_PROMPT = 'detailed_prompt',

    /** Request to use official ERPNext template */
    TEMPLATE_REQUEST = 'template_request',
}

/**
 * Detected input analysis
 */
export interface InputAnalysis {
    /** Detected input type */
    type: InputType;

    /** Detected domain/industry */
    domain?: string;

    /** Confidence score (0-1) */
    confidence: number;

    /** Key entities/concepts detected */
    entities: string[];

    /** Missing critical information */
    missingInfo?: string[];

    /** Suggested questions to ask user */
    clarificationQuestions?: string[];
}

/**
 * Recommended prompt structure for user approval
 */
export interface RecommendedPrompt {
    /** Recommended enhanced prompt */
    prompt: string;

    /** Detected domain */
    domain: string;

    /** Suggested DocTypes to generate */
    suggestedDocTypes: Array<{
        name: string;
        description: string;
        keyFields: string[];
    }>;

    /** Suggested workflows */
    suggestedWorkflows: Array<{
        name: string;
        states: string[];
        description: string;
    }>;

    /** Suggested features */
    suggestedFeatures: string[];

    /** Official ERPNext templates that might be relevant */
    relevantTemplates?: Array<{
        name: string;
        description: string;
        url?: string;
    }>;

    /** Estimated complexity */
    complexity: 'simple' | 'moderate' | 'complex';

    /** Estimated generation time */
    estimatedTime?: string;
}

/**
 * Hybrid generation request combining all approaches
 */
export interface HybridGenerationRequest extends VariantGenerationRequest {
    /** Input analysis (auto-detected or provided) */
    inputAnalysis?: InputAnalysis;

    /** Whether to analyze input first before generation */
    analyzeFirst?: boolean;

    /** Whether to use ERPNext official template as base */
    useTemplate?: boolean;

    /** Template name if using official template */
    templateName?: string;

    /** PRD document if provided */
    prdDocument?: string;

    /** User's approval of recommended prompt */
    approvedRecommendation?: boolean;
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
