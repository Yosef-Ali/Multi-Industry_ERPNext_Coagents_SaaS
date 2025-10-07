/**
 * LangGraph HITL Developer Chat Workflow - FIXED
 *
 * Based on LangGraph 0.2+ API research
 * Uses MemorySaver for local dev, CloudflareD1Saver for production
 */

import {
  StateGraph,
  Annotation,
  interrupt,
  Command,
  MemorySaver,
  START,
  END
} from '@langchain/langgraph';
import type { ToolCall } from '@anthropic-ai/sdk/resources';

/**
 * Developer Chat State
 */
export const DeveloperChatState = Annotation.Root({
  chatId: Annotation<string>(),
  userId: Annotation<string>(),
  userMessage: Annotation<string>(),

  messages: Annotation<Array<{ role: string; content: string }>>({
    reducer: (current, update) => [...current, ...update],
    default: () => [],
  }),

  toolCalls: Annotation<ToolCall[]>({
    default: () => [],
  }),

  approvalNeeded: Annotation<boolean>({
    default: () => false,
  }),

  approved: Annotation<boolean | null>({
    default: () => null,
  }),

  riskLevel: Annotation<'low' | 'medium' | 'high'>({
    default: () => 'low',
  }),

  response: Annotation<string>({
    default: () => '',
  }),

  error: Annotation<string | null>({
    default: () => null,
  }),

  toolResults: Annotation<Record<string, any>>({
    default: () => ({}),
  }),
});

export type DeveloperChatStateType = typeof DeveloperChatState.State;

/**
 * Node 1: Classify risk level based on user message
 */
export function classifyNode(state: DeveloperChatStateType): Partial<DeveloperChatStateType> {
  const message = state.userMessage.toLowerCase();

  // High-risk keywords
  const highRiskKeywords = ['delete', 'cancel', 'submit', 'approve', 'reject', 'remove'];
  // Medium-risk keywords
  const mediumRiskKeywords = ['create', 'update', 'modify', 'change', 'add'];

  let riskLevel: 'low' | 'medium' | 'high' = 'low';
  let approvalNeeded = false;

  if (highRiskKeywords.some(kw => message.includes(kw))) {
    riskLevel = 'high';
    approvalNeeded = true;
  } else if (mediumRiskKeywords.some(kw => message.includes(kw))) {
    riskLevel = 'medium';
    approvalNeeded = true;
  }

  console.log(`[Developer Workflow] Risk: ${riskLevel}, Approval needed: ${approvalNeeded}`);

  return { riskLevel, approvalNeeded };
}

/**
 * Node 2: Approval gate with interrupt() pattern
 */
export function approvalNode(state: DeveloperChatStateType): Partial<DeveloperChatStateType> {
  // If no approval needed, auto-approve
  if (!state.approvalNeeded) {
    console.log('[Developer Workflow] Low risk - auto-approved');
    return { approved: true };
  }

  // High/medium risk - PAUSE and wait for human approval
  console.log('[Developer Workflow] ⏸️  INTERRUPT - Requesting approval');

  const decision = interrupt({
    type: 'approval_request',
    question: 'Do you want to proceed with this operation?',
    riskLevel: state.riskLevel,
    operation: state.userMessage,
    toolCalls: state.toolCalls || [],
  });

  console.log(`[Developer Workflow] Resumed with decision: ${decision}`);

  // Handle both boolean and string decisions (LangGraph limitation with false values)
  const isApproved = decision === true || decision === "APPROVED";
  return { approved: isApproved };
}

/**
 * Node 3: Execute approved operation
 */
export function executeNode(state: DeveloperChatStateType): Partial<DeveloperChatStateType> {
  if (!state.approved) {
    return {
      response: 'Operation cancelled by user',
      error: 'User rejected the operation',
    };
  }

  console.log('[Developer Workflow] ✅ Executing approved operation');

  // Mock execution - replace with actual tool calls
  return {
    response: `Operation completed: ${state.userMessage}`,
    toolResults: {
      status: 'success',
      operation: state.userMessage,
    },
  };
}

/**
 * Node 4: Handle cancelled operations
 */
export function cancelledNode(state: DeveloperChatStateType): Partial<DeveloperChatStateType> {
  console.log('[Developer Workflow] ❌ Operation cancelled');

  return {
    response: 'Operation cancelled by user',
    error: 'User rejected the operation',
  };
}

/**
 * Routing function: decide next step based on approval
 */
function routeAfterApproval(state: DeveloperChatStateType): string {
  if (state.approved === true) {
    return 'execute';
  } else {
    return 'cancelled';
  }
}

/**
 * Create and compile the LangGraph workflow
 */
export function createDeveloperChatGraph(useMemory = true) {
  console.log('[Developer Workflow] Creating StateGraph...');

  const workflow = new StateGraph(DeveloperChatState)
    .addNode('classify', classifyNode)
    .addNode('approval', approvalNode)
    .addNode('execute', executeNode)
    .addNode('cancelled', cancelledNode)
    .addEdge(START, 'classify')
    .addEdge('classify', 'approval')
    .addConditionalEdges('approval', routeAfterApproval, {
      execute: 'execute',
      cancelled: 'cancelled',
    })
    .addEdge('execute', END)
    .addEdge('cancelled', END);

  // Use MemorySaver for development
  const checkpointer = useMemory ? new MemorySaver() : undefined;

  if (checkpointer) {
    console.log('[Developer Workflow] Using MemorySaver for state persistence');
  } else {
    console.log('[Developer Workflow] No checkpointer - stateless mode');
  }

  const graph = workflow.compile({ checkpointer });

  console.log('[Developer Workflow] ✅ Graph compiled successfully');

  return graph;
}

/**
 * Helper: Create appropriate checkpointer based on environment
 */
export function createCheckpointer(env?: any) {
  // Production: Use Cloudflare D1
  if (env?.DB) {
    try {
      // Requires: npm install @langchain/cloudflare
      // const { CloudflareD1Saver } = require('@langchain/cloudflare/langgraph/checkpointers');
      // return new CloudflareD1Saver({ db: env.DB });
      console.log('[Checkpointer] Cloudflare D1 not yet configured, using MemorySaver');
      return new MemorySaver();
    } catch (error) {
      console.warn('[Checkpointer] Cloudflare D1 unavailable, falling back to MemorySaver');
      return new MemorySaver();
    }
  }

  // Development: Use in-memory
  console.log('[Checkpointer] Using MemorySaver (development mode)');
  return new MemorySaver();
}
