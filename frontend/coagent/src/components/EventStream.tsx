/**
 * T097: EventStream Component
 * Displays streaming AG-UI messages in real-time with auto-scroll and message formatting
 * Integrated with CopilotKit CoAgents for workflow state visualization
 */

import { useCoAgentStateRender } from '@copilotkit/react-core';
import React, { useEffect, useRef } from 'react';
import {
	type AGUIEventType,
	type ChatMessageEvent,
	type ErrorEvent,
	formatTimestamp,
	type StatusEvent,
	type ToolCallEvent,
	type ToolResultEvent,
	type UIPromptEvent,
} from '../utils/streaming';

// ============================================================================
// Types
// ============================================================================

export interface EventStreamProps {
	events: AGUIEventType[];
	isStreaming?: boolean;
	className?: string;
	agentName?: string; // CoAgent name for state rendering
}

// ============================================================================
// EventStream Component
// ============================================================================

/**
 * EventStream component displays AG-UI events in real-time
 * Features:
 * - Different rendering for each message type
 * - Auto-scroll to bottom on new messages
 * - Loading indicators while streaming
 * - Message timestamps
 * - Proper formatting for each event type
 */
export const EventStream: React.FC<EventStreamProps> = ({
	events,
	isStreaming = false,
	className = '',
	agentName,
}) => {
	const containerRef = useRef<HTMLDivElement>(null);
	const bottomRef = useRef<HTMLDivElement>(null);

	// CoAgent state rendering for workflow progress
	if (agentName) {
		useCoAgentStateRender({
			name: agentName,
			render: ({ state }) => {
				const workflowState = state as any;

				if (!workflowState?.steps_completed?.length) {
					return null;
				}

				return (
					<div className="mb-3 rounded-lg border border-blue-200 bg-blue-50 p-3">
						<div className="mb-2 flex items-center justify-between">
							<span className="text-sm font-medium text-blue-900">Workflow Progress</span>
							{workflowState.current_step && (
								<span className="text-xs text-blue-600">Current: {workflowState.current_step}</span>
							)}
						</div>
						<div className="space-y-1">
							{workflowState.steps_completed.map((step: string, index: number) => (
								<div key={index} className="flex items-center gap-2 text-sm text-blue-800">
									<span className="text-green-600">✓</span>
									<span>{step}</span>
								</div>
							))}
						</div>
						{workflowState.pending_approval && (
							<div className="mt-2 flex items-center gap-2 rounded bg-yellow-100 px-2 py-1">
								<span className="text-yellow-600">⏳</span>
								<span className="text-xs text-yellow-800">
									Waiting for approval: {workflowState.approval_operation}
								</span>
							</div>
						)}
					</div>
				);
			},
		});
	}

	/**
	 * Auto-scroll to bottom when new events arrive
	 */
	useEffect(() => {
		if (bottomRef.current) {
			bottomRef.current.scrollIntoView({ behavior: 'smooth' });
		}
	}, []);

	return (
		<div ref={containerRef} className={`flex flex-col space-y-3 overflow-y-auto p-4 ${className}`}>
			{/* Render events */}
			{events.map((event, index) => (
				<EventMessage key={`event-${index}-${event.timestamp}`} event={event} />
			))}

			{/* Streaming indicator */}
			{isStreaming && (
				<div className="flex items-center gap-2 text-sm text-gray-500">
					<div className="flex gap-1">
						<div className="h-2 w-2 animate-pulse rounded-full bg-primary-500"></div>
						<div className="h-2 w-2 animate-pulse rounded-full bg-primary-500 animation-delay-200"></div>
						<div className="h-2 w-2 animate-pulse rounded-full bg-primary-500 animation-delay-400"></div>
					</div>
					<span>Agent is thinking...</span>
				</div>
			)}

			{/* Empty state */}
			{events.length === 0 && !isStreaming && (
				<div className="flex flex-col items-center justify-center py-12 text-center">
					<div className="mb-2 text-4xl">💬</div>
					<p className="text-sm text-gray-500">No messages yet. Start a conversation!</p>
				</div>
			)}

			{/* Scroll anchor */}
			<div ref={bottomRef} />
		</div>
	);
};

// ============================================================================
// EventMessage Component
// ============================================================================

interface EventMessageProps {
	event: AGUIEventType;
}

const EventMessage: React.FC<EventMessageProps> = ({ event }) => {
	switch (event.type) {
		case 'chat_message':
			return <ChatMessage event={event} />;
		case 'tool_call':
			return <ToolCall event={event} />;
		case 'tool_result':
			return <ToolResult event={event} />;
		case 'ui_prompt':
			return <UIPrompt event={event} />;
		case 'status':
			return <Status event={event} />;
		case 'error':
			return <ErrorMessage event={event} />;
		case 'ping':
			return null; // Don't render ping events
		default:
			return null;
	}
};

// ============================================================================
// Message Type Components
// ============================================================================

/**
 * Chat message component
 */
const ChatMessage: React.FC<{ event: ChatMessageEvent }> = ({ event }) => {
	const isUser = event.role === 'user';
	const isSystem = event.role === 'system';

	if (isSystem) {
		return (
			<div className="flex justify-center">
				<div className="rounded bg-gray-100 px-4 py-2 text-sm text-gray-600">{event.content}</div>
			</div>
		);
	}

	return (
		<div className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
			<div
				className={`max-w-[80%] rounded-lg px-4 py-3 ${
					isUser ? 'bg-primary-600 text-white' : 'bg-white border border-gray-200 text-gray-900'
				}`}
			>
				<div className="mb-1 flex items-center justify-between gap-2">
					<span className={`text-xs font-medium ${isUser ? 'text-primary-100' : 'text-gray-500'}`}>
						{isUser ? 'You' : 'Assistant'}
					</span>
					<span className={`text-xs ${isUser ? 'text-primary-200' : 'text-gray-400'}`}>
						{formatTimestamp(event.timestamp)}
					</span>
				</div>
				<div className="whitespace-pre-wrap text-sm">{event.content}</div>
			</div>
		</div>
	);
};

/**
 * Tool call component
 */
const ToolCall: React.FC<{ event: ToolCallEvent }> = ({ event }) => {
	const [isExpanded, setIsExpanded] = React.useState(false);

	return (
		<div className="rounded-lg border border-blue-200 bg-blue-50 p-3">
			<div className="flex items-start justify-between">
				<div className="flex items-center gap-2">
					<span className="text-lg">🔧</span>
					<div>
						<p className="text-sm font-medium text-blue-900">Tool Call: {event.tool_name}</p>
						<p className="text-xs text-blue-600">{formatTimestamp(event.timestamp)}</p>
					</div>
				</div>
				<button
					onClick={() => setIsExpanded(!isExpanded)}
					className="text-xs text-blue-600 hover:text-blue-800"
				>
					{isExpanded ? 'Hide' : 'Show'} Input
				</button>
			</div>
			{isExpanded && (
				<pre className="mt-2 overflow-x-auto rounded bg-blue-100 p-2 text-xs text-blue-900">
					{JSON.stringify(event.input, null, 2)}
				</pre>
			)}
		</div>
	);
};

/**
 * Tool result component
 */
const ToolResult: React.FC<{ event: ToolResultEvent }> = ({ event }) => {
	const [isExpanded, setIsExpanded] = React.useState(false);
	const isSuccess = event.success !== false;

	return (
		<div
			className={`rounded-lg border p-3 ${
				isSuccess ? 'border-green-200 bg-green-50' : 'border-red-200 bg-red-50'
			}`}
		>
			<div className="flex items-start justify-between">
				<div className="flex items-center gap-2">
					<span className="text-lg">{isSuccess ? '✓' : '✗'}</span>
					<div>
						<p className={`text-sm font-medium ${isSuccess ? 'text-green-900' : 'text-red-900'}`}>
							Result: {event.tool_name}
						</p>
						<p className={`text-xs ${isSuccess ? 'text-green-600' : 'text-red-600'}`}>
							{formatTimestamp(event.timestamp)}
						</p>
					</div>
				</div>
				<button
					onClick={() => setIsExpanded(!isExpanded)}
					className={`text-xs ${
						isSuccess ? 'text-green-600 hover:text-green-800' : 'text-red-600 hover:text-red-800'
					}`}
				>
					{isExpanded ? 'Hide' : 'Show'} Output
				</button>
			</div>
			{event.error && <p className="mt-2 text-sm text-red-700">Error: {event.error}</p>}
			{isExpanded && (
				<pre
					className={`mt-2 overflow-x-auto rounded p-2 text-xs ${
						isSuccess ? 'bg-green-100 text-green-900' : 'bg-red-100 text-red-900'
					}`}
				>
					{JSON.stringify(event.output, null, 2)}
				</pre>
			)}
		</div>
	);
};

/**
 * UI prompt component
 */
const UIPrompt: React.FC<{ event: UIPromptEvent }> = ({ event }) => {
	const riskColor = {
		low: 'border-green-300 bg-green-50 text-green-900',
		medium: 'border-yellow-300 bg-yellow-50 text-yellow-900',
		high: 'border-red-300 bg-red-50 text-red-900',
	}[event.risk_level || 'medium'];

	return (
		<div className={`rounded-lg border p-3 ${riskColor}`}>
			<div className="flex items-center gap-2">
				<span className="text-lg">⚠</span>
				<div>
					<p className="text-sm font-medium">Approval Required</p>
					<p className="text-sm">{event.summary}</p>
					<p className="text-xs opacity-75">{formatTimestamp(event.timestamp)}</p>
				</div>
			</div>
		</div>
	);
};

/**
 * Status component
 */
const Status: React.FC<{ event: StatusEvent }> = ({ event }) => {
	const statusColors = {
		connected: 'border-green-200 bg-green-50 text-green-700',
		processing: 'border-blue-200 bg-blue-50 text-blue-700',
		completed: 'border-green-200 bg-green-50 text-green-700',
		error: 'border-red-200 bg-red-50 text-red-700',
	};

	const statusIcons = {
		connected: '🔗',
		processing: '⚙️',
		completed: '✓',
		error: '⚠',
	};

	return (
		<div className={`rounded-lg border px-3 py-2 ${statusColors[event.status]}`}>
			<div className="flex items-center gap-2">
				<span>{statusIcons[event.status]}</span>
				<span className="text-sm">{event.message}</span>
				<span className="ml-auto text-xs opacity-75">{formatTimestamp(event.timestamp)}</span>
			</div>
		</div>
	);
};

/**
 * Error message component
 */
const ErrorMessage: React.FC<{ event: ErrorEvent }> = ({ event }) => {
	const [isExpanded, setIsExpanded] = React.useState(false);

	return (
		<div className="rounded-lg border border-red-300 bg-red-50 p-3">
			<div className="flex items-start justify-between">
				<div className="flex items-center gap-2">
					<span className="text-lg">❌</span>
					<div>
						<p className="text-sm font-medium text-red-900">Error: {event.error_type}</p>
						<p className="text-sm text-red-700">{event.message}</p>
						<p className="text-xs text-red-600">{formatTimestamp(event.timestamp)}</p>
					</div>
				</div>
				{event.details && (
					<button
						onClick={() => setIsExpanded(!isExpanded)}
						className="text-xs text-red-600 hover:text-red-800"
					>
						{isExpanded ? 'Hide' : 'Show'} Details
					</button>
				)}
			</div>
			{isExpanded && event.details && (
				<pre className="mt-2 overflow-x-auto rounded bg-red-100 p-2 text-xs text-red-900">
					{JSON.stringify(event.details, null, 2)}
				</pre>
			)}
		</div>
	);
};

export default EventStream;
