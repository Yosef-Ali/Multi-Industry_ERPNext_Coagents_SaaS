/**
 * Workflow Service Client
 * Connects CopilotKit to the Python LangGraph backend
 */

export interface WorkflowExecuteRequest {
	graph_name: string;
	initial_state: Record<string, any>;
	thread_id?: string;
	stream?: boolean;
}

export interface WorkflowExecuteResponse {
	thread_id: string;
	status: 'completed' | 'paused' | 'rejected' | 'error';
	final_state?: Record<string, any>;
	interrupt_data?: Record<string, any>;
	error?: string;
}

export interface Workflow {
	name: string;
	description: string;
	industry: string;
	initial_state_schema: Record<string, string>;
	estimated_steps: number;
}

export class WorkflowClient {
	private baseUrl: string;

	constructor(baseUrl: string = 'https://erpnext-workflows.onrender.com') {
		this.baseUrl = baseUrl;
	}

	/**
	 * List available workflows
	 */
	async listWorkflows(industry?: string): Promise<Workflow[]> {
		const url = new URL(`${this.baseUrl}/workflows`);
		if (industry) {
			url.searchParams.set('industry', industry);
		}

		const response = await fetch(url.toString());
		if (!response.ok) {
			throw new Error(`Failed to list workflows: ${response.statusText}`);
		}

		const data = await response.json();
		return Object.values(data.workflows);
	}

	/**
	 * Execute a workflow (non-streaming)
	 */
	async executeWorkflow(request: WorkflowExecuteRequest): Promise<WorkflowExecuteResponse> {
		const response = await fetch(`${this.baseUrl}/execute`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				...request,
				stream: false, // Non-streaming for simplicity
			}),
		});

		if (!response.ok) {
			throw new Error(`Workflow execution failed: ${response.statusText}`);
		}

		return response.json();
	}

	/**
	 * Execute a workflow with streaming (for future use)
	 */
	async executeWorkflowStream(
		request: WorkflowExecuteRequest,
		onEvent: (event: any) => void
	): Promise<void> {
		const response = await fetch(`${this.baseUrl}/execute`, {
			method: 'POST',
			headers: {
				'Content-Type': 'application/json',
			},
			body: JSON.stringify({
				...request,
				stream: true,
			}),
		});

		if (!response.ok) {
			throw new Error(`Workflow execution failed: ${response.statusText}`);
		}

		const reader = response.body?.getReader();
		if (!reader) {
			throw new Error('No response body');
		}

		const decoder = new TextDecoder();
		let buffer = '';

		while (true) {
			const { done, value } = await reader.read();
			if (done) break;

			buffer += decoder.decode(value, { stream: true });
			const lines = buffer.split('\n');
			buffer = lines.pop() || '';

			for (const line of lines) {
				if (line.startsWith('data: ')) {
					const data = line.slice(6);
					try {
						const event = JSON.parse(data);
						onEvent(event);
					} catch (e) {
						console.error('Failed to parse SSE event:', e);
					}
				}
			}
		}
	}
}

/**
 * Default workflow client instance
 */
export const workflowClient = new WorkflowClient(
	process.env.WORKFLOW_SERVICE_URL || 'https://erpnext-workflows.onrender.com'
);
