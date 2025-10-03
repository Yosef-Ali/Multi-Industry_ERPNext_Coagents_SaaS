/**
 * Artifact Type System for ERPNext Developer Assistant
 * Defines types for DocTypes, Workflows, and generated code artifacts
 */

export type ArtifactType = 'doctype' | 'workflow' | 'code' | 'page' | 'report';

export type ArtifactStatus = 'generating' | 'ready' | 'refining' | 'deploying' | 'deployed' | 'error';

export interface BaseArtifact {
  id: string;
  type: ArtifactType;
  variant: 1 | 2 | 3;
  title: string;
  description: string;
  status: ArtifactStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface DocTypeField {
  fieldname: string;
  label: string;
  fieldtype: string;
  options?: string;
  reqd?: number;
  read_only?: number;
  hidden?: number;
  default?: string | number;
  description?: string;
  in_list_view?: number;
  in_standard_filter?: number;
}

export interface DocTypeArtifact extends BaseArtifact {
  type: 'doctype';
  code: string; // JSON string of DocType definition
  metadata: {
    module: string;
    naming_rule?: string;
    autoname?: string;
    is_submittable?: number;
    is_child_table?: number;
    track_changes?: number;
    fields: DocTypeField[];
    permissions?: Array<{
      role: string;
      read: number;
      write: number;
      create: number;
      delete: number;
      submit?: number;
      cancel?: number;
    }>;
  };
}

export interface WorkflowState {
  state: string;
  doc_status?: '0' | '1' | '2';
  allow_edit?: string;
  next_action_email?: string;
}

export interface WorkflowTransition {
  state: string;
  action: string;
  next_state: string;
  allowed: string; // role
  condition?: string;
}

export interface WorkflowArtifact extends BaseArtifact {
  type: 'workflow';
  code: string; // JSON string of Workflow definition
  metadata: {
    document_type: string;
    workflow_name: string;
    is_active: number;
    states: WorkflowState[];
    transitions: WorkflowTransition[];
  };
  diagramCode?: string; // Mermaid diagram code
}

export interface CodeArtifact extends BaseArtifact {
  type: 'code';
  code: string;
  language: 'python' | 'javascript' | 'json';
  metadata: {
    filename: string;
    filepath: string;
    purpose: string;
  };
}

export interface PageArtifact extends BaseArtifact {
  type: 'page';
  code: string; // HTML/JS for custom page
  metadata: {
    page_name: string;
    title: string;
    icon?: string;
    standard?: number;
  };
}

export interface ReportArtifact extends BaseArtifact {
  type: 'report';
  code: string; // Report definition
  metadata: {
    report_name: string;
    ref_doctype: string;
    report_type: 'Report Builder' | 'Query Report' | 'Script Report';
    is_standard?: 'Yes' | 'No';
  };
}

export type Artifact =
  | DocTypeArtifact
  | WorkflowArtifact
  | CodeArtifact
  | PageArtifact
  | ReportArtifact;

/**
 * Generation Context
 * Contains the user's requirements and analysis
 */
export interface GenerationContext {
  userPrompt: string;
  industry?: string;
  components: string[];
  workflows: string[];
  primaryType: ArtifactType;
  requirements: {
    functional: string[];
    technical: string[];
  };
}

/**
 * Variant Generation Result
 * Contains all 3 variants for a generation request
 */
export interface VariantSet {
  id: string;
  context: GenerationContext;
  variants: [Artifact, Artifact, Artifact];
  selectedVariant?: 1 | 2 | 3;
  refinements: RefinementRequest[];
}

/**
 * Refinement Request
 * User's request to modify a variant
 */
export interface RefinementRequest {
  id: string;
  variantId: string;
  prompt: string;
  timestamp: Date;
  result?: Artifact;
}

/**
 * Deployment Request
 * Request to deploy artifact to ERPNext
 */
export interface DeploymentRequest {
  id: string;
  artifactId: string;
  targetEnvironment: 'local' | 'staging' | 'production';
  status: 'pending_approval' | 'approved' | 'deploying' | 'deployed' | 'failed';
  approvedBy?: string;
  approvedAt?: Date;
  deployedAt?: Date;
  error?: string;
}
