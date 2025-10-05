"""
LangGraph to AG-UI Stream Adapter

Converts LangGraph workflow events to AG-UI SSE events for real-time
progress updates in the frontend.

Implementation of T170: Streaming progress emitter from LangGraph to AGUIStreamEmitter
"""

import asyncio
from typing import Dict, Any, Optional, AsyncGenerator, Callable
from dataclasses import dataclass
from datetime import datetime
import json


@dataclass
class WorkflowProgressEvent:
    """Workflow progress event for AG-UI streaming"""
    type: str  # workflow_start, step_start, step_complete, approval_required, workflow_complete, workflow_error
    graph_name: str
    step: Optional[str] = None
    state: Optional[Dict[str, Any]] = None
    progress: Optional[Dict[str, Any]] = None
    timestamp: int = None

    def __post_init__(self):
        if self.timestamp is None:
            self.timestamp = int(datetime.now().timestamp() * 1000)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            "type": self.type,
            "graph_name": self.graph_name,
            "step": self.step,
            "state": self.state,
            "progress": self.progress,
            "timestamp": self.timestamp
        }

    def to_agui_event(self) -> Dict[str, Any]:
        """
        Convert to AG-UI compatible event format

        AG-UI expects events in format:
        {
          "type": "workflow_progress",
          "data": { ... }
        }
        """
        return {
            "type": "workflow_progress",
            "data": self.to_dict()
        }


class AGUIStreamAdapter:
    """
    Adapts LangGraph workflow execution events to AG-UI SSE stream

    Monitors LangGraph state changes and emits AG-UI compatible events
    """

    def __init__(
        self,
        graph_name: str,
        total_steps: int = None,
        correlation_id: str = None
    ):
        self.graph_name = graph_name
        self.total_steps = total_steps
        self.correlation_id = correlation_id
        self.current_step = 0
        self.steps_completed: list[str] = []
        self.checkpoints: list[Dict[str, Any]] = []

    async def stream_workflow_execution(
        self,
        graph,
        initial_state: Dict[str, Any],
        emit_fn: Optional[Callable[[WorkflowProgressEvent], None]] = None
    ) -> AsyncGenerator[WorkflowProgressEvent, None]:
        """
        Execute LangGraph workflow and stream progress events

        Args:
            graph: Compiled LangGraph StateGraph
            initial_state: Initial workflow state
            emit_fn: Optional callback function to emit events (for SSE streaming)

        Yields:
            WorkflowProgressEvent objects for each workflow step
        """
        # Emit workflow start
        start_event = WorkflowProgressEvent(
            type="workflow_start",
            graph_name=self.graph_name,
            state=initial_state
        )
        yield start_event
        if emit_fn:
            emit_fn(start_event)

        try:
            # Execute workflow graph with streaming
            async for state in graph.astream(initial_state):
                # Extract current step from state
                current_node = state.get("__current_node__") or state.get("current_step")

                if current_node:
                    self.current_step += 1
                    self.steps_completed.append(current_node)

                    # Emit step complete event
                    step_event = WorkflowProgressEvent(
                        type="step_complete",
                        graph_name=self.graph_name,
                        step=current_node,
                        state=state,
                        progress={
                            "current_step": self.current_step,
                            "total_steps": self.total_steps or self.current_step,
                            "percentage": self._calculate_progress_percentage()
                        }
                    )

                    yield step_event
                    if emit_fn:
                        emit_fn(step_event)

                    # Save checkpoint
                    self.checkpoints.append({
                        "step": current_node,
                        "state": state,
                        "timestamp": step_event.timestamp
                    })

                # Check if approval is required
                if state.get("pending_approval"):
                    approval_event = WorkflowProgressEvent(
                        type="approval_required",
                        graph_name=self.graph_name,
                        step=current_node,
                        state=state
                    )
                    yield approval_event
                    if emit_fn:
                        emit_fn(approval_event)

                # Check for errors
                if state.get("errors") and len(state["errors"]) > 0:
                    error_event = WorkflowProgressEvent(
                        type="workflow_error",
                        graph_name=self.graph_name,
                        step=current_node,
                        state=state
                    )
                    yield error_event
                    if emit_fn:
                        emit_fn(error_event)
                    break

            # Emit workflow complete
            complete_event = WorkflowProgressEvent(
                type="workflow_complete",
                graph_name=self.graph_name,
                state=state if 'state' in locals() else initial_state,
                progress={
                    "current_step": self.current_step,
                    "total_steps": self.total_steps or self.current_step,
                    "percentage": 100
                }
            )
            yield complete_event
            if emit_fn:
                emit_fn(complete_event)

        except Exception as e:
            # Emit error event
            error_event = WorkflowProgressEvent(
                type="workflow_error",
                graph_name=self.graph_name,
                state={"error": str(e)}
            )
            yield error_event
            if emit_fn:
                emit_fn(error_event)

    def _calculate_progress_percentage(self) -> int:
        """Calculate workflow progress percentage"""
        if not self.total_steps:
            return 0

        return int((self.current_step / self.total_steps) * 100)

    def get_checkpoints(self) -> list[Dict[str, Any]]:
        """Get all workflow checkpoints"""
        return self.checkpoints

    def get_final_state(self) -> Optional[Dict[str, Any]]:
        """Get final workflow state from last checkpoint"""
        if self.checkpoints:
            return self.checkpoints[-1]["state"]
        return None


class SSEWorkflowStreamer:
    """
    Server-Sent Events streamer for workflow progress

    Formats workflow events as SSE for HTTP streaming
    """

    def __init__(self, correlation_id: str = None):
        self.correlation_id = correlation_id

    def format_sse_event(
        self,
        event: WorkflowProgressEvent
    ) -> str:
        """
        Format workflow event as SSE message

        SSE format:
        event: workflow_progress
        data: {"type": "step_complete", "graph_name": "hotel_o2c", ...}

        """
        agui_event = event.to_agui_event()

        sse_message = f"event: {agui_event['type']}\n"
        sse_message += f"data: {json.dumps(agui_event['data'])}\n\n"

        return sse_message

    async def stream_workflow(
        self,
        graph,
        graph_name: str,
        initial_state: Dict[str, Any],
        total_steps: int = None
    ) -> AsyncGenerator[str, None]:
        """
        Stream workflow execution as SSE events

        Args:
            graph: Compiled LangGraph StateGraph
            graph_name: Name of the workflow graph
            initial_state: Initial workflow state
            total_steps: Optional total number of steps for progress calculation

        Yields:
            SSE-formatted strings ready to send to HTTP response
        """
        adapter = AGUIStreamAdapter(
            graph_name=graph_name,
            total_steps=total_steps,
            correlation_id=self.correlation_id
        )

        async for event in adapter.stream_workflow_execution(graph, initial_state):
            sse_message = self.format_sse_event(event)
            yield sse_message


def create_workflow_streamer(
    correlation_id: Optional[str] = None
) -> SSEWorkflowStreamer:
    """
    Factory function to create workflow streamer

    Args:
        correlation_id: Optional correlation ID for tracking

    Returns:
        SSEWorkflowStreamer instance
    """
    return SSEWorkflowStreamer(correlation_id=correlation_id)


async def execute_workflow_with_streaming(
    graph_name: str,
    initial_state: Dict[str, Any],
    emit_fn: Callable[[WorkflowProgressEvent], None]
) -> Dict[str, Any]:
    """
    Execute workflow with progress streaming to callback function

    This is the main integration point between LangGraph and AG-UI

    Args:
        graph_name: Name of the workflow graph to execute
        initial_state: Initial workflow state
        emit_fn: Callback function that receives WorkflowProgressEvent objects
                 (used to emit SSE events to frontend)

    Returns:
        Final workflow state
    """
    from .registry import load_workflow_graph

    # Load workflow graph
    graph = load_workflow_graph(graph_name)

    # Create stream adapter
    adapter = AGUIStreamAdapter(
        graph_name=graph_name,
        total_steps=None  # Will be calculated dynamically
    )

    # Execute with streaming
    final_state = None
    async for event in adapter.stream_workflow_execution(graph, initial_state, emit_fn):
        # Events are automatically emitted via emit_fn
        if event.type == "workflow_complete":
            final_state = event.state

    if final_state is None:
        # Fallback to last checkpoint
        final_state = adapter.get_final_state() or initial_state

    return {
        "final_state": final_state,
        "steps_completed": adapter.steps_completed,
        "checkpoints": adapter.checkpoints
    }


# Export main functions
__all__ = [
    "WorkflowProgressEvent",
    "AGUIStreamAdapter",
    "SSEWorkflowStreamer",
    "create_workflow_streamer",
    "execute_workflow_with_streaming"
]
