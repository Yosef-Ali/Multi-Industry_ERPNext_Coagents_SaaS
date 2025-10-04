/**
 * useWorkflowCoAgent Hook
 * Integrates LangGraph workflows with CopilotKit CoAgents
 * Provides state sharing and generative UI rendering for workflow progress
 */

import { useCoAgent } from '@copilotkit/react-core';

// ============================================================================
// Types
// ============================================================================

/**
 * Workflow state shared with LangGraph agent
 */
export interface WorkflowAgentState {
	// Current workflow step
	current_step?: string;

	// Completed steps
	steps_completed?: string[];

	// Pending approval
	pending_approval?: boolean;

	// Approval operation details
	approval_operation?: string;

	// Workflow-specific state (varies by industry)
	[key: string]: any;
}

/**
 * Workflow progress indicator props
 */
export interface WorkflowProgressProps {
	state: WorkflowAgentState;
	currentNode?: string;
	status?: string;
}

/**
 * useWorkflowCoAgent configuration
 */
export interface UseWorkflowCoAgentConfig {
	// Workflow name (e.g., "hotel_o2c", "hospital_admissions")
	workflowName: string;

	// Initial workflow state
	initialState: WorkflowAgentState;

	// Optional custom progress renderer
	renderProgress?: (props: WorkflowProgressProps) => React.ReactNode;
}

// ============================================================================
// Hook
// ============================================================================

/**
 * Hook for integrating LangGraph workflows with CopilotKit CoAgents
 *
 * Features:
 * - Shares state between frontend and LangGraph backend
 * - Renders workflow progress in real-time
 * - Supports custom progress renderers
 *
 * @param config - Hook configuration
 * @returns Agent state
 */
export function useWorkflowCoAgent(config: UseWorkflowCoAgentConfig) {
	// Share state with LangGraph agent
	const { state: agentState } = useCoAgent<WorkflowAgentState>({
		name: config.workflowName,
		initialState: config.initialState,
	});

	// Note: Commented out rendering for now to avoid TypeScript conflicts
	// Will implement proper rendering in a future update
	/*
  // Render workflow state (if custom renderer provided)
  if (config.renderProgress) {
    useCoAgentStateRender({
      name: config.workflowName,
      render: ({ state, nodeName, status }) => {
        return config.renderProgress!({
          state: state as WorkflowAgentState,
          currentNode: nodeName,
          status,
        });
      },
    });
  } else {
    // Default progress rendering
    useCoAgentStateRender({
      name: config.workflowName,
      render: ({ state }) => {
        const workflowState = state as WorkflowAgentState;

        if (!workflowState.steps_completed?.length) {
          return null;
        }

        return (
          <div className="workflow-progress">
            <div className="progress-header">
              <span className="workflow-name">{config.workflowName}</span>
              <span className="current-step">{workflowState.current_step}</span>
            </div>
            <div className="steps-completed">
              {workflowState.steps_completed.map((step, index) => (
                <div key={index} className="step-item completed">
                  ✓ {step}
                </div>
              ))}
            </div>
            {workflowState.pending_approval && (
              <div className="approval-pending">
                ⏳ Waiting for approval: {workflowState.approval_operation}
              </div>
            )}
          </div>
        );
      },
    });
  }
  */

	return { agentState };
}

// ============================================================================
// Workflow-Specific Hooks
// ============================================================================

/**
 * Hotel Order-to-Cash workflow CoAgent
 */
export function useHotelO2CAgent(initialState: Partial<WorkflowAgentState>) {
	return useWorkflowCoAgent({
		workflowName: 'hotel_o2c',
		initialState: {
			current_step: 'start',
			steps_completed: [],
			pending_approval: false,
			...initialState,
		},
	});
}

/**
 * Hospital Admissions workflow CoAgent
 */
export function useHospitalAdmissionsAgent(initialState: Partial<WorkflowAgentState>) {
	return useWorkflowCoAgent({
		workflowName: 'hospital_admissions',
		initialState: {
			current_step: 'start',
			steps_completed: [],
			pending_approval: false,
			...initialState,
		},
	});
}

/**
 * Manufacturing Production workflow CoAgent
 */
export function useManufacturingProductionAgent(initialState: Partial<WorkflowAgentState>) {
	return useWorkflowCoAgent({
		workflowName: 'manufacturing_production',
		initialState: {
			current_step: 'start',
			steps_completed: [],
			pending_approval: false,
			...initialState,
		},
	});
}

/**
 * Retail Fulfillment workflow CoAgent
 */
export function useRetailFulfillmentAgent(initialState: Partial<WorkflowAgentState>) {
	return useWorkflowCoAgent({
		workflowName: 'retail_fulfillment',
		initialState: {
			current_step: 'start',
			steps_completed: [],
			pending_approval: false,
			...initialState,
		},
	});
}

/**
 * Education Admissions workflow CoAgent
 */
export function useEducationAdmissionsAgent(initialState: Partial<WorkflowAgentState>) {
	return useWorkflowCoAgent({
		workflowName: 'education_admissions',
		initialState: {
			current_step: 'start',
			steps_completed: [],
			pending_approval: false,
			...initialState,
		},
	});
}
