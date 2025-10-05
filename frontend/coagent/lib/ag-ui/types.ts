/**
 * AG-UI Protocol Types
 * Based on the AG-UI specification: https://docs.ag-ui.com
 *
 * Defines TypeScript types for Agent-User Interaction Protocol events
 */

import type { Event as AGUIEvent } from '@ag-ui/core';

// Re-export core AG-UI types
export type { Event as AGUIEvent, EventType } from '@ag-ui/core';

/**
 * Standard AG-UI Event Types
 * These are the ~16 core event types defined in the AG-UI protocol
 */
export enum AGUIEventType {
	// Lifecycle Events
	AGENT_STATE_CHANGE = 'agent_state_change',

	// Message Events
	TEXT_MESSAGE_START = 'text_message_start',
	TEXT_MESSAGE_CONTENT = 'text_message_content',
	TEXT_MESSAGE_END = 'text_message_end',

	// Tool Events
	TOOL_CALL_START = 'tool_call_start',
	TOOL_CALL_ARGS_DELTA = 'tool_call_args_delta',
	TOOL_CALL_RESULT = 'tool_call_result',

	// State Events
	STATE_DELTA = 'state_delta',
	STATE_SYNC = 'state_sync',

	// UI Events
	RENDER_UI_START = 'render_ui_start',
	RENDER_UI_CONTENT = 'render_ui_content',
	RENDER_UI_END = 'render_ui_end',

	// Error Events
	ERROR = 'error',

	// Completion Events
	DONE = 'done',

	// Custom Events
	CUSTOM = 'custom',
}

/**
 * AG-UI Agent State
 */
export type AgentState = 'idle' | 'thinking' | 'working' | 'error' | 'done';

/**
 * AG-UI Tool Call
 */
export interface AGUIToolCall {
	id: string;
	name: string;
	args: Record<string, any>;
	result?: any;
	status: 'pending' | 'running' | 'completed' | 'error';
}

/**
 * AG-UI State Delta
 * Represents incremental state changes
 */
export interface AGUIStateDelta {
	path: string[];
	operation: 'set' | 'delete' | 'append' | 'patch';
	value: any;
}

/**
 * AG-UI Rendered UI Component
 */
export interface AGUIRenderedUI {
	id: string;
	type: 'react' | 'html' | 'markdown';
	content: string | React.ReactNode;
	props?: Record<string, any>;
}

/**
 * AG-UI Message Metadata
 */
export interface AGUIMessageMetadata {
	timestamp: string;
	role: 'user' | 'assistant' | 'system';
	id?: string;
}

/**
 * AG-UI Session State
 * Manages the overall state of an AG-UI session
 */
export interface AGUISessionState {
	agentState: AgentState;
	messages: Array<{
		id: string;
		role: 'user' | 'assistant' | 'system';
		content: string;
		metadata?: AGUIMessageMetadata;
	}>;
	toolCalls: AGUIToolCall[];
	renderedUI: AGUIRenderedUI[];
	sharedState: Record<string, any>;
	error?: {
		message: string;
		code?: string;
		details?: any;
	};
}

/**
 * AG-UI Event Stream Configuration
 */
export interface AGUIStreamConfig {
	endpoint: string;
	headers?: Record<string, string>;
	signal?: AbortSignal;
	onEvent?: (event: AGUIEvent) => void;
	onError?: (error: Error) => void;
	onDone?: () => void;
}

/**
 * AG-UI Request Payload
 */
export interface AGUIRequest {
	messages: Array<{
		role: 'user' | 'assistant' | 'system';
		content: string;
	}>;
	context?: Record<string, any>;
	state?: Record<string, any>;
	tools?: Array<{
		name: string;
		description: string;
		parameters: Record<string, any>;
	}>;
}

/**
 * AG-UI Response Metadata
 */
export interface AGUIResponseMetadata {
	requestId: string;
	timestamp: string;
	model?: string;
	usage?: {
		promptTokens: number;
		completionTokens: number;
		totalTokens: number;
	};
}

/**
 * Type guard to check if event is a specific type
 */
export function isAGUIEvent(event: any, type: AGUIEventType): boolean {
	return event?.type === type;
}

/**
 * Extract message content from TEXT_MESSAGE_CONTENT events
 */
export function extractMessageContent(event: AGUIEvent): string | null {
	if (!isAGUIEvent(event, AGUIEventType.TEXT_MESSAGE_CONTENT)) {
		return null;
	}
	return (event as any).content || null;
}

/**
 * Extract tool call data from TOOL_CALL_* events
 */
export function extractToolCall(event: AGUIEvent): Partial<AGUIToolCall> | null {
	if (!event.type.startsWith('tool_call_')) {
		return null;
	}

	const data = event as any;
	return {
		id: data.id,
		name: data.name,
		args: data.args,
		result: data.result,
	};
}

/**
 * Extract state delta from STATE_DELTA events
 */
export function extractStateDelta(event: AGUIEvent): AGUIStateDelta | null {
	if (!isAGUIEvent(event, AGUIEventType.STATE_DELTA)) {
		return null;
	}

	const data = event as any;
	return {
		path: data.path || [],
		operation: data.operation || 'set',
		value: data.value,
	};
}
