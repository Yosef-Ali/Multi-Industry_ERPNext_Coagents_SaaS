/**
 * execute_workflow_graph - Bridge tool connecting Claude Agent SDK to LangGraph
 *
 * This is the critical hybrid architecture piece that allows:
 * - Industry subagents to invoke deterministic LangGraph workflows
 * - Claude SDK intelligence layer → LangGraph state machine layer
 * - Workflow progress streaming back to AG-UI
 *
 * Implementation of T168: Workflow bridge tool
 */

import type { ToolUseBlock } from "@anthropic-ai/sdk/resources/messages.js";

export interface WorkflowGraphRequest {
  graph_name: string;
  initial_state: {
    [key: string]: any;
  };
  config?: {
    max_turns?: number;
    timeout_ms?: number;
    checkpoints?: boolean;
  };
}

export interface WorkflowGraphResult {
  graph_name: string;
  final_state: {
    [key: string]: any;
  };
  steps_completed: string[];
  execution_time_ms: number;
  success: boolean;
  error?: string;
  checkpoints?: Array<{
    step: string;
    state: any;
    timestamp: number;
  }>;
}

export interface WorkflowProgressEvent {
  type: "workflow_start" | "step_start" | "step_complete" | "approval_required" | "workflow_complete" | "workflow_error";
  graph_name: string;
  step?: string;
  state?: any;
  progress?: {
    current_step: number;
    total_steps: number;
    percentage: number;
  };
  timestamp: number;
}

/**
 * Workflow Graph Registry
 * Maps graph names to their Python module paths
 */
export const WORKFLOW_REGISTRY: { [key: string]: { module: string; description: string } } = {
  // Hotel workflows
  "hotel_o2c": {
    module: "workflows.hotel.o2c_graph",
    description: "Hotel Order-to-Cash: Check-in → Folio → Check-out → Invoice"
  },
  "hotel_cancellation": {
    module: "workflows.hotel.cancellation_graph",
    description: "Hotel reservation cancellation with refund processing"
  },
  "hotel_group_booking": {
    module: "workflows.hotel.group_booking_graph",
    description: "Group booking with multiple rooms and guests"
  },

  // Hospital workflows
  "hospital_admissions": {
    module: "workflows.hospital.admissions_graph",
    description: "Patient admission: Record → Orders → Encounter → Billing"
  },
  "hospital_discharge": {
    module: "workflows.hospital.discharge_graph",
    description: "Patient discharge with summary and final billing"
  },
  "order_fulfillment": {
    module: "workflows.hospital.order_fulfillment_graph",
    description: "Clinical order processing across departments"
  },

  // Manufacturing workflows
  "manufacturing_mto": {
    module: "workflows.manufacturing.mto_graph",
    description: "Make-to-Order: Material check → Work order → Production"
  },
  "manufacturing_completion": {
    module: "workflows.manufacturing.completion_graph",
    description: "Production completion with QC and stock receipt"
  },

  // Retail workflows
  "retail_order_fulfillment": {
    module: "workflows.retail.fulfillment_graph",
    description: "Sales order fulfillment: Pick → Pack → Ship → Notify"
  },
  "retail_replenishment": {
    module: "workflows.retail.replenishment_graph",
    description: "Inventory replenishment with purchase orders"
  },
  "retail_returns": {
    module: "workflows.retail.returns_graph",
    description: "Customer return processing with credit note"
  },

  // Education workflows
  "education_admissions": {
    module: "workflows.education.admissions_graph",
    description: "Student admissions: Application → Interview → Decision → Enrollment"
  },
  "education_enrollment": {
    module: "workflows.education.enrollment_graph",
    description: "Student enrollment with course registration"
  },
  "interview_scheduling": {
    module: "workflows.education.interview_scheduling_graph",
    description: "Batch interview scheduling with faculty coordination"
  }
};

/**
 * Execute workflow graph via Python workflow service
 *
 * This bridges TypeScript Claude Agent SDK → Python LangGraph
 */
export async function executeWorkflowGraph(
  request: WorkflowGraphRequest,
  streamEmitter?: (event: WorkflowProgressEvent) => void
): Promise<WorkflowGraphResult> {
  const startTime = Date.now();

  try {
    // Validate graph name
    const graphConfig = WORKFLOW_REGISTRY[request.graph_name];
    if (!graphConfig) {
      throw new Error(
        `Unknown workflow graph: ${request.graph_name}. ` +
        `Available graphs: ${Object.keys(WORKFLOW_REGISTRY).join(", ")}`
      );
    }

    // Emit workflow start event
    if (streamEmitter) {
      streamEmitter({
        type: "workflow_start",
        graph_name: request.graph_name,
        state: request.initial_state,
        timestamp: Date.now()
      });
    }

    // Call Python workflow service
    const result = await invokeWorkflowService(
      request.graph_name,
      graphConfig.module,
      request.initial_state,
      request.config,
      streamEmitter
    );

    // Emit workflow complete event
    if (streamEmitter) {
      streamEmitter({
        type: "workflow_complete",
        graph_name: request.graph_name,
        state: result.final_state,
        timestamp: Date.now()
      });
    }

    return {
      graph_name: request.graph_name,
      final_state: result.final_state,
      steps_completed: result.steps_completed,
      execution_time_ms: Date.now() - startTime,
      success: true,
      checkpoints: result.checkpoints
    };

  } catch (error) {
    // Emit error event
    if (streamEmitter) {
      streamEmitter({
        type: "workflow_error",
        graph_name: request.graph_name,
        timestamp: Date.now()
      });
    }

    return {
      graph_name: request.graph_name,
      final_state: request.initial_state,
      steps_completed: [],
      execution_time_ms: Date.now() - startTime,
      success: false,
      error: String(error)
    };
  }
}

/**
 * Invoke Python workflow service via HTTP
 */
async function invokeWorkflowService(
  graphName: string,
  modulePath: string,
  initialState: any,
  config?: any,
  streamEmitter?: (event: WorkflowProgressEvent) => void
): Promise<{
  final_state: any;
  steps_completed: string[];
  checkpoints?: any[];
}> {
  // Get workflow service URL from environment
  const workflowServiceUrl = process.env.WORKFLOW_SERVICE_URL || "http://localhost:8001";

  // Prepare request payload
  const payload = {
    graph_name: graphName,
    module_path: modulePath,
    initial_state: initialState,
    config: {
      max_turns: config?.max_turns || 10,
      timeout_ms: config?.timeout_ms || 60000,
      checkpoints: config?.checkpoints !== false
    }
  };

  // Make HTTP request to workflow service
  const response = await fetch(`${workflowServiceUrl}/execute`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(payload)
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Workflow service error: ${response.status} ${errorText}`);
  }

  const result = await response.json() as any;

  // Stream progress events if available
  if (streamEmitter && result.checkpoints) {
    const totalSteps = result.checkpoints.length;
    result.checkpoints.forEach((checkpoint: any, index: number) => {
      streamEmitter({
        type: "step_complete",
        graph_name: graphName,
        step: checkpoint.step,
        state: checkpoint.state,
        progress: {
          current_step: index + 1,
          total_steps: totalSteps,
          percentage: Math.round(((index + 1) / totalSteps) * 100)
        },
        timestamp: checkpoint.timestamp || Date.now()
      });
    });
  }

  return {
    final_state: result.final_state,
    steps_completed: result.steps_completed || [],
    checkpoints: result.checkpoints
  };
}

/**
 * Mock workflow execution (for development/testing)
 */
async function mockWorkflowExecution(
  graphName: string,
  initialState: any,
  streamEmitter?: (event: WorkflowProgressEvent) => void
): Promise<{
  final_state: any;
  steps_completed: string[];
  checkpoints: any[];
}> {
  // Simulate workflow steps based on graph type
  const steps = getWorkflowSteps(graphName);
  const checkpoints: any[] = [];

  for (let i = 0; i < steps.length; i++) {
    const step = steps[i];

    // Emit step start
    if (streamEmitter) {
      streamEmitter({
        type: "step_start",
        graph_name: graphName,
        step: step.name,
        progress: {
          current_step: i + 1,
          total_steps: steps.length,
          percentage: Math.round(((i + 1) / steps.length) * 100)
        },
        timestamp: Date.now()
      });
    }

    // Simulate processing
    await new Promise(resolve => setTimeout(resolve, 500));

    // Update state
    const stepState = {
      ...initialState,
      current_step: step.name,
      steps_completed: steps.slice(0, i + 1).map(s => s.name)
    };

    checkpoints.push({
      step: step.name,
      state: stepState,
      timestamp: Date.now()
    });

    // Emit step complete
    if (streamEmitter) {
      streamEmitter({
        type: "step_complete",
        graph_name: graphName,
        step: step.name,
        state: stepState,
        progress: {
          current_step: i + 1,
          total_steps: steps.length,
          percentage: Math.round(((i + 1) / steps.length) * 100)
        },
        timestamp: Date.now()
      });
    }

    // Check for approval step
    if (step.requires_approval && streamEmitter) {
      streamEmitter({
        type: "approval_required",
        graph_name: graphName,
        step: step.name,
        state: stepState,
        timestamp: Date.now()
      });

      // Wait for approval (simulated)
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }

  return {
    final_state: {
      ...initialState,
      status: "completed",
      steps_completed: steps.map(s => s.name)
    },
    steps_completed: steps.map(s => s.name),
    checkpoints
  };
}

/**
 * Get workflow steps for a graph (for mocking)
 */
function getWorkflowSteps(graphName: string): Array<{ name: string; requires_approval?: boolean }> {
  const stepMap: { [key: string]: Array<{ name: string; requires_approval?: boolean }> } = {
    "hotel_o2c": [
      { name: "check_in_guest", requires_approval: true },
      { name: "create_folio" },
      { name: "add_charges" },
      { name: "check_out_guest" },
      { name: "generate_invoice", requires_approval: true }
    ],
    "hospital_admissions": [
      { name: "create_patient_record" },
      { name: "schedule_admission" },
      { name: "create_order_set", requires_approval: true },
      { name: "create_encounter" },
      { name: "generate_invoice", requires_approval: true }
    ],
    "manufacturing_mto": [
      { name: "check_material_availability" },
      { name: "create_purchase_requisition", requires_approval: true },
      { name: "create_work_order", requires_approval: true },
      { name: "issue_materials" },
      { name: "start_production" }
    ],
    "retail_order_fulfillment": [
      { name: "validate_stock" },
      { name: "create_pick_list", requires_approval: true },
      { name: "create_delivery_note" },
      { name: "update_inventory" },
      { name: "send_notification" }
    ],
    "education_admissions": [
      { name: "load_applicants" },
      { name: "schedule_interviews", requires_approval: true },
      { name: "collect_feedback" },
      { name: "make_decisions", requires_approval: true },
      { name: "create_student_records" },
      { name: "send_notifications" }
    ]
  };

  return stepMap[graphName] || [
    { name: "initialize" },
    { name: "process" },
    { name: "finalize" }
  ];
}

/**
 * Tool definition for Claude Agent SDK
 */
export const executeWorkflowGraphTool = {
  name: "execute_workflow_graph",
  description: "Execute industry-specific LangGraph workflow with approval gates and progress streaming",
  input_schema: {
    type: "object",
    properties: {
      graph_name: {
        type: "string",
        description: "Workflow graph name",
        enum: Object.keys(WORKFLOW_REGISTRY)
      },
      initial_state: {
        type: "object",
        description: "Initial workflow state with required fields",
        properties: {}
      },
      config: {
        type: "object",
        description: "Optional workflow configuration",
        properties: {
          max_turns: { type: "number", description: "Maximum workflow turns" },
          timeout_ms: { type: "number", description: "Workflow timeout in milliseconds" },
          checkpoints: { type: "boolean", description: "Enable state checkpoints" }
        }
      }
    },
    required: ["graph_name", "initial_state"]
  }
};

/**
 * Get available workflows for a subagent
 */
export function getAvailableWorkflows(subagentName: string): string[] {
  const workflowsBySubagent: { [key: string]: string[] } = {
    "hotel-specialist": ["hotel_o2c", "hotel_cancellation", "hotel_group_booking"],
    "hospital-specialist": ["hospital_admissions", "hospital_discharge", "order_fulfillment"],
    "manufacturing-specialist": ["manufacturing_mto", "manufacturing_completion"],
    "retail-specialist": ["retail_order_fulfillment", "retail_replenishment", "retail_returns"],
    "education-specialist": ["education_admissions", "education_enrollment", "interview_scheduling"]
  };

  return workflowsBySubagent[subagentName] || [];
}
