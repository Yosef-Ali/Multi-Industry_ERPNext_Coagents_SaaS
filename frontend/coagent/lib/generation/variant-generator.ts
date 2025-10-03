/**
 * Variant Generator
 * Generates 3 variants (minimal, balanced, advanced) for ERPNext artifacts
 */

import type {
  Artifact,
  DocTypeArtifact,
  WorkflowArtifact,
  GenerationContext,
  DocTypeField,
} from '../types/artifact';

/**
 * Generate 3 variants based on user requirements
 */
export async function generateVariants(
  context: GenerationContext
): Promise<[Artifact, Artifact, Artifact]> {
  const { primaryType, userPrompt } = context;

  if (primaryType === 'doctype') {
    return generateDocTypeVariants(context);
  } else if (primaryType === 'workflow') {
    return generateWorkflowVariants(context);
  }

  throw new Error(`Unsupported artifact type: ${primaryType}`);
}

/**
 * Generate 3 DocType variants with different complexity levels
 */
async function generateDocTypeVariants(
  context: GenerationContext
): Promise<[DocTypeArtifact, DocTypeArtifact, DocTypeArtifact]> {
  const baseId = `dt-${Date.now()}`;
  const moduleName = context.industry || 'Custom';

  // Extract DocType name from prompt (simple heuristic)
  const doctypeName =
    context.userPrompt
      .split(' ')
      .slice(0, 3)
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ') || 'Custom DocType';

  // Variant 1: Minimal
  const minimal: DocTypeArtifact = {
    id: `${baseId}-v1`,
    type: 'doctype',
    variant: 1,
    title: `${doctypeName} (Minimal)`,
    description: 'Basic implementation with core fields only',
    status: 'ready',
    createdAt: new Date(),
    updatedAt: new Date(),
    code: JSON.stringify(
      {
        doctype: 'DocType',
        name: doctypeName,
        module: moduleName,
        custom: 1,
        fields: getMinimalFields(),
        permissions: getMinimalPermissions(),
        naming_rule: 'By fieldname',
        autoname: 'field:title',
      },
      null,
      2
    ),
    metadata: {
      module: moduleName,
      naming_rule: 'By fieldname',
      autoname: 'field:title',
      fields: getMinimalFields(),
      permissions: getMinimalPermissions(),
    },
  };

  // Variant 2: Balanced
  const balanced: DocTypeArtifact = {
    id: `${baseId}-v2`,
    type: 'doctype',
    variant: 2,
    title: `${doctypeName} (Balanced)`,
    description: 'Standard implementation with recommended features',
    status: 'ready',
    createdAt: new Date(),
    updatedAt: new Date(),
    code: JSON.stringify(
      {
        doctype: 'DocType',
        name: doctypeName,
        module: moduleName,
        custom: 1,
        is_submittable: 1,
        track_changes: 1,
        fields: getBalancedFields(),
        permissions: getBalancedPermissions(),
        naming_rule: 'By "Naming Series" field',
        autoname: 'naming_series:',
      },
      null,
      2
    ),
    metadata: {
      module: moduleName,
      naming_rule: 'By "Naming Series" field',
      autoname: 'naming_series:',
      is_submittable: 1,
      track_changes: 1,
      fields: getBalancedFields(),
      permissions: getBalancedPermissions(),
    },
  };

  // Variant 3: Advanced
  const advanced: DocTypeArtifact = {
    id: `${baseId}-v3`,
    type: 'doctype',
    variant: 3,
    title: `${doctypeName} (Advanced)`,
    description: 'Full-featured implementation with workflow and validations',
    status: 'ready',
    createdAt: new Date(),
    updatedAt: new Date(),
    code: JSON.stringify(
      {
        doctype: 'DocType',
        name: doctypeName,
        module: moduleName,
        custom: 1,
        is_submittable: 1,
        track_changes: 1,
        allow_auto_repeat: 1,
        fields: getAdvancedFields(),
        permissions: getAdvancedPermissions(),
        naming_rule: 'By "Naming Series" field',
        autoname: 'naming_series:',
      },
      null,
      2
    ),
    metadata: {
      module: moduleName,
      naming_rule: 'By "Naming Series" field',
      autoname: 'naming_series:',
      is_submittable: 1,
      track_changes: 1,
      fields: getAdvancedFields(),
      permissions: getAdvancedPermissions(),
    },
  };

  return [minimal, balanced, advanced];
}

/**
 * Generate 3 Workflow variants
 */
async function generateWorkflowVariants(
  context: GenerationContext
): Promise<[WorkflowArtifact, WorkflowArtifact, WorkflowArtifact]> {
  const baseId = `wf-${Date.now()}`;
  const workflowName = `${context.userPrompt} Workflow`;

  // Variant 1: Minimal workflow (2 states)
  const minimal: WorkflowArtifact = {
    id: `${baseId}-v1`,
    type: 'workflow',
    variant: 1,
    title: `${workflowName} (Minimal)`,
    description: 'Simple 2-state workflow',
    status: 'ready',
    createdAt: new Date(),
    updatedAt: new Date(),
    code: JSON.stringify(
      {
        doctype: 'Workflow',
        workflow_name: workflowName,
        document_type: context.userPrompt,
        is_active: 1,
        states: [
          { state: 'Draft', doc_status: '0' },
          { state: 'Approved', doc_status: '1' },
        ],
        transitions: [
          {
            state: 'Draft',
            action: 'Approve',
            next_state: 'Approved',
            allowed: 'System Manager',
          },
        ],
      },
      null,
      2
    ),
    metadata: {
      document_type: context.userPrompt,
      workflow_name: workflowName,
      is_active: 1,
      states: [
        { state: 'Draft', doc_status: '0' },
        { state: 'Approved', doc_status: '1' },
      ],
      transitions: [
        {
          state: 'Draft',
          action: 'Approve',
          next_state: 'Approved',
          allowed: 'System Manager',
        },
      ],
    },
    diagramCode: `
flowchart LR
    Draft -->|Approve| Approved
    `,
  };

  // Variant 2: Balanced workflow (3 states)
  const balanced: WorkflowArtifact = {
    id: `${baseId}-v2`,
    type: 'workflow',
    variant: 2,
    title: `${workflowName} (Balanced)`,
    description: 'Standard 3-state workflow with approval',
    status: 'ready',
    createdAt: new Date(),
    updatedAt: new Date(),
    code: JSON.stringify(
      {
        doctype: 'Workflow',
        workflow_name: workflowName,
        document_type: context.userPrompt,
        is_active: 1,
        states: [
          { state: 'Draft', doc_status: '0' },
          { state: 'Pending Approval', doc_status: '0', allow_edit: 'Approver' },
          { state: 'Approved', doc_status: '1' },
        ],
        transitions: [
          {
            state: 'Draft',
            action: 'Submit for Approval',
            next_state: 'Pending Approval',
            allowed: 'All',
          },
          {
            state: 'Pending Approval',
            action: 'Approve',
            next_state: 'Approved',
            allowed: 'Approver',
          },
          {
            state: 'Pending Approval',
            action: 'Reject',
            next_state: 'Draft',
            allowed: 'Approver',
          },
        ],
      },
      null,
      2
    ),
    metadata: {
      document_type: context.userPrompt,
      workflow_name: workflowName,
      is_active: 1,
      states: [
        { state: 'Draft', doc_status: '0' },
        { state: 'Pending Approval', doc_status: '0', allow_edit: 'Approver' },
        { state: 'Approved', doc_status: '1' },
      ],
      transitions: [
        {
          state: 'Draft',
          action: 'Submit for Approval',
          next_state: 'Pending Approval',
          allowed: 'All',
        },
        {
          state: 'Pending Approval',
          action: 'Approve',
          next_state: 'Approved',
          allowed: 'Approver',
        },
        {
          state: 'Pending Approval',
          action: 'Reject',
          next_state: 'Draft',
          allowed: 'Approver',
        },
      ],
    },
    diagramCode: `
flowchart LR
    Draft -->|Submit| PendingApproval[Pending Approval]
    PendingApproval -->|Approve| Approved
    PendingApproval -->|Reject| Draft
    `,
  };

  // Variant 3: Advanced workflow (5 states)
  const advanced: WorkflowArtifact = {
    id: `${baseId}-v3`,
    type: 'workflow',
    variant: 3,
    title: `${workflowName} (Advanced)`,
    description: 'Multi-level approval workflow with rejection handling',
    status: 'ready',
    createdAt: new Date(),
    updatedAt: new Date(),
    code: JSON.stringify(
      {
        doctype: 'Workflow',
        workflow_name: workflowName,
        document_type: context.userPrompt,
        is_active: 1,
        states: [
          { state: 'Draft', doc_status: '0' },
          { state: 'Pending L1 Approval', doc_status: '0' },
          { state: 'Pending L2 Approval', doc_status: '0' },
          { state: 'Approved', doc_status: '1' },
          { state: 'Rejected', doc_status: '2' },
        ],
        transitions: [
          {
            state: 'Draft',
            action: 'Submit',
            next_state: 'Pending L1 Approval',
            allowed: 'All',
          },
          {
            state: 'Pending L1 Approval',
            action: 'L1 Approve',
            next_state: 'Pending L2 Approval',
            allowed: 'L1 Approver',
          },
          {
            state: 'Pending L1 Approval',
            action: 'Reject',
            next_state: 'Rejected',
            allowed: 'L1 Approver',
          },
          {
            state: 'Pending L2 Approval',
            action: 'L2 Approve',
            next_state: 'Approved',
            allowed: 'L2 Approver',
          },
          {
            state: 'Pending L2 Approval',
            action: 'Reject',
            next_state: 'Rejected',
            allowed: 'L2 Approver',
          },
        ],
      },
      null,
      2
    ),
    metadata: {
      document_type: context.userPrompt,
      workflow_name: workflowName,
      is_active: 1,
      states: [
        { state: 'Draft', doc_status: '0' },
        { state: 'Pending L1 Approval', doc_status: '0' },
        { state: 'Pending L2 Approval', doc_status: '0' },
        { state: 'Approved', doc_status: '1' },
        { state: 'Rejected', doc_status: '2' },
      ],
      transitions: [
        {
          state: 'Draft',
          action: 'Submit',
          next_state: 'Pending L1 Approval',
          allowed: 'All',
        },
        {
          state: 'Pending L1 Approval',
          action: 'L1 Approve',
          next_state: 'Pending L2 Approval',
          allowed: 'L1 Approver',
        },
        {
          state: 'Pending L1 Approval',
          action: 'Reject',
          next_state: 'Rejected',
          allowed: 'L1 Approver',
        },
        {
          state: 'Pending L2 Approval',
          action: 'L2 Approve',
          next_state: 'Approved',
          allowed: 'L2 Approver',
        },
        {
          state: 'Pending L2 Approval',
          action: 'Reject',
          next_state: 'Rejected',
          allowed: 'L2 Approver',
        },
      ],
    },
    diagramCode: `
flowchart LR
    Draft -->|Submit| L1[Pending L1 Approval]
    L1 -->|L1 Approve| L2[Pending L2 Approval]
    L1 -->|Reject| Rejected
    L2 -->|L2 Approve| Approved
    L2 -->|Reject| Rejected
    `,
  };

  return [minimal, balanced, advanced];
}

// Helper functions for field generation

function getMinimalFields(): DocTypeField[] {
  return [
    {
      fieldname: 'title',
      label: 'Title',
      fieldtype: 'Data',
      reqd: 1,
      in_list_view: 1,
    },
    {
      fieldname: 'description',
      label: 'Description',
      fieldtype: 'Text',
    },
    {
      fieldname: 'status',
      label: 'Status',
      fieldtype: 'Select',
      options: 'Draft\nActive\nInactive',
      default: 'Draft',
      in_list_view: 1,
    },
  ];
}

function getBalancedFields(): DocTypeField[] {
  return [
    {
      fieldname: 'naming_series',
      label: 'Series',
      fieldtype: 'Select',
      options: 'DOC-.####',
      reqd: 1,
    },
    {
      fieldname: 'title',
      label: 'Title',
      fieldtype: 'Data',
      reqd: 1,
      in_list_view: 1,
    },
    {
      fieldname: 'date',
      label: 'Date',
      fieldtype: 'Date',
      default: 'Today',
      reqd: 1,
      in_list_view: 1,
    },
    {
      fieldname: 'description',
      label: 'Description',
      fieldtype: 'Text Editor',
    },
    {
      fieldname: 'status',
      label: 'Status',
      fieldtype: 'Select',
      options: 'Draft\nSubmitted\nCancelled',
      default: 'Draft',
      in_list_view: 1,
      in_standard_filter: 1,
    },
    {
      fieldname: 'amended_from',
      label: 'Amended From',
      fieldtype: 'Link',
      options: 'Custom DocType',
      hidden: 1,
    },
  ];
}

function getAdvancedFields(): DocTypeField[] {
  return [
    {
      fieldname: 'naming_series',
      label: 'Series',
      fieldtype: 'Select',
      options: 'DOC-.YYYY.-.####',
      reqd: 1,
    },
    {
      fieldname: 'title',
      label: 'Title',
      fieldtype: 'Data',
      reqd: 1,
      in_list_view: 1,
    },
    {
      fieldname: 'date',
      label: 'Date',
      fieldtype: 'Date',
      default: 'Today',
      reqd: 1,
      in_list_view: 1,
    },
    {
      fieldname: 'section_break_1',
      label: 'Details',
      fieldtype: 'Section Break',
    },
    {
      fieldname: 'description',
      label: 'Description',
      fieldtype: 'Text Editor',
    },
    {
      fieldname: 'column_break_1',
      fieldtype: 'Column Break',
    },
    {
      fieldname: 'category',
      label: 'Category',
      fieldtype: 'Link',
      options: 'Category',
      in_standard_filter: 1,
    },
    {
      fieldname: 'priority',
      label: 'Priority',
      fieldtype: 'Select',
      options: 'Low\nMedium\nHigh\nUrgent',
      default: 'Medium',
    },
    {
      fieldname: 'section_break_2',
      label: 'Status & Workflow',
      fieldtype: 'Section Break',
    },
    {
      fieldname: 'status',
      label: 'Status',
      fieldtype: 'Select',
      options: 'Draft\nPending Approval\nApproved\nRejected\nCancelled',
      default: 'Draft',
      in_list_view: 1,
      in_standard_filter: 1,
    },
    {
      fieldname: 'workflow_state',
      label: 'Workflow State',
      fieldtype: 'Link',
      options: 'Workflow State',
      hidden: 1,
    },
    {
      fieldname: 'amended_from',
      label: 'Amended From',
      fieldtype: 'Link',
      options: 'Custom DocType',
      hidden: 1,
      read_only: 1,
    },
  ];
}

function getMinimalPermissions() {
  return [
    {
      role: 'System Manager',
      read: 1,
      write: 1,
      create: 1,
      delete: 1,
    },
  ];
}

function getBalancedPermissions() {
  return [
    {
      role: 'System Manager',
      read: 1,
      write: 1,
      create: 1,
      delete: 1,
      submit: 1,
      cancel: 1,
    },
    {
      role: 'All',
      read: 1,
      write: 1,
      create: 1,
      delete: 0,
    },
  ];
}

function getAdvancedPermissions() {
  return [
    {
      role: 'System Manager',
      read: 1,
      write: 1,
      create: 1,
      delete: 1,
      submit: 1,
      cancel: 1,
    },
    {
      role: 'All',
      read: 1,
      write: 1,
      create: 1,
      delete: 0,
      submit: 0,
      cancel: 0,
    },
    {
      role: 'Approver',
      read: 1,
      write: 1,
      create: 0,
      delete: 0,
      submit: 1,
      cancel: 1,
    },
  ];
}
