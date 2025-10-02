"""
Workflow Executor

Generic workflow execution engine with interrupt/resume support,
AG-UI frame emission, and future Redis persistence.

Implementation of T082: Generic workflow executor with interrupt/resume
support and AG-UI frame emission
"""

import asyncio
from typing import Any, Callable, Dict, List, Optional, TypedDict
from dataclasses import dataclass, field
from datetime import datetime
import json
import logging

from langgraph.types import interrupt
from langgraph.checkpoint.memory import MemorySaver

from .registry import (
    get_registry,
    load_workflow_graph,
    WorkflowGraphMetadata,
    validate_workflow_state
)
from .stream_adapter import (
    AGUIStreamAdapter,
    WorkflowProgressEvent,
    execute_workflow_with_streaming
)


logger = logging.getLogger(__name__)


class ExecutionConfig(TypedDict, total=False):
    """Configuration for workflow execution"""
    checkpointer: Optional[Any]  # LangGraph checkpointer (MemorySaver, RedisSaver, etc.)
    thread_id: Optional[str]  # Thread ID for checkpoint persistence
    recursion_limit: int  # Maximum recursion depth (default: 25)
    stream_mode: str  # "values", "updates", or "debug" (default: "values")
    emit_agui_events: bool  # Whether to emit AG-UI progress events (default: True)
    correlation_id: Optional[str]  # Correlation ID for tracking


@dataclass
class WorkflowExecutionResult:
    """Result of workflow execution"""
    graph_name: str
    success: bool
    final_state: Dict[str, Any]
    steps_completed: List[str] = field(default_factory=list)
    error: Optional[str] = None
    execution_time_ms: int = 0
    interrupted: bool = False
    interrupt_reason: Optional[str] = None
    checkpoint_id: Optional[str] = None
    metadata: Dict[str, Any] = field(default_factory=dict)

    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary for JSON serialization"""
        return {
            "graph_name": self.graph_name,
            "success": self.success,
            "final_state": self.final_state,
            "steps_completed": self.steps_completed,
            "error": self.error,
            "execution_time_ms": self.execution_time_ms,
            "interrupted": self.interrupted,
            "interrupt_reason": self.interrupt_reason,
            "checkpoint_id": self.checkpoint_id,
            "metadata": self.metadata
        }


class WorkflowExecutor:
    """
    Generic workflow executor with advanced features

    Features:
    - Interrupt/resume support for human-in-the-loop workflows
    - AG-UI progress event emission
    - State validation
    - Error handling and recovery
    - Checkpointing (memory or Redis)
    - Execution metrics
    """

    def __init__(
        self,
        graph_name: str,
        config: Optional[ExecutionConfig] = None
    ):
        self.graph_name = graph_name
        self.config = config or {}
        self.registry = get_registry()
        self.metadata = self.registry.get_workflow_metadata(graph_name)
        
        if not self.metadata:
            raise ValueError(f"Unknown workflow: {graph_name}")

        # Set defaults
        self.config.setdefault("recursion_limit", 25)
        self.config.setdefault("stream_mode", "values")
        self.config.setdefault("emit_agui_events", True)

        # Create checkpointer if not provided
        if "checkpointer" not in self.config:
            self.config["checkpointer"] = MemorySaver()

        self.execution_history: List[WorkflowExecutionResult] = []

    async def execute(
        self,
        initial_state: Dict[str, Any],
        emit_fn: Optional[Callable[[WorkflowProgressEvent], None]] = None
    ) -> WorkflowExecutionResult:
        """
        Execute workflow from initial state

        Args:
            initial_state: Initial workflow state
            emit_fn: Optional callback for AG-UI event emission

        Returns:
            WorkflowExecutionResult with execution details
        """
        start_time = datetime.now()

        try:
            # Validate initial state
            is_valid, error_msg = validate_workflow_state(self.graph_name, initial_state)
            if not is_valid:
                logger.error(f"Invalid initial state for {self.graph_name}: {error_msg}")
                return WorkflowExecutionResult(
                    graph_name=self.graph_name,
                    success=False,
                    final_state=initial_state,
                    error=f"State validation failed: {error_msg}"
                )

            # Load workflow graph
            logger.info(f"Loading workflow graph: {self.graph_name}")
            graph = load_workflow_graph(self.graph_name)

            # Execute with or without streaming
            if self.config.get("emit_agui_events") and emit_fn:
                result = await self._execute_with_streaming(
                    graph, initial_state, emit_fn
                )
            else:
                result = await self._execute_basic(graph, initial_state)

            # Calculate execution time
            execution_time = (datetime.now() - start_time).total_seconds() * 1000

            # Create result
            execution_result = WorkflowExecutionResult(
                graph_name=self.graph_name,
                success=True,
                final_state=result.get("final_state", initial_state),
                steps_completed=result.get("steps_completed", []),
                execution_time_ms=int(execution_time),
                interrupted=result.get("interrupted", False),
                interrupt_reason=result.get("interrupt_reason"),
                checkpoint_id=result.get("checkpoint_id"),
                metadata={
                    "industry": self.metadata.industry,
                    "estimated_steps": self.metadata.estimated_steps,
                    "actual_steps": len(result.get("steps_completed", []))
                }
            )

            self.execution_history.append(execution_result)
            return execution_result

        except Exception as e:
            logger.error(f"Workflow execution failed: {e}", exc_info=True)
            execution_time = (datetime.now() - start_time).total_seconds() * 1000

            error_result = WorkflowExecutionResult(
                graph_name=self.graph_name,
                success=False,
                final_state=initial_state,
                error=str(e),
                execution_time_ms=int(execution_time)
            )

            self.execution_history.append(error_result)
            return error_result

    async def _execute_with_streaming(
        self,
        graph,
        initial_state: Dict[str, Any],
        emit_fn: Callable[[WorkflowProgressEvent], None]
    ) -> Dict[str, Any]:
        """Execute workflow with AG-UI streaming"""
        logger.info(f"Executing {self.graph_name} with AG-UI streaming")

        # Use stream adapter for execution
        adapter = AGUIStreamAdapter(
            graph_name=self.graph_name,
            total_steps=self.metadata.estimated_steps,
            correlation_id=self.config.get("correlation_id")
        )

        final_state = None
        interrupted = False
        interrupt_reason = None

        try:
            async for event in adapter.stream_workflow_execution(
                graph, initial_state, emit_fn
            ):
                if event.type == "workflow_complete":
                    final_state = event.state
                elif event.type == "approval_required":
                    interrupted = True
                    interrupt_reason = "Approval required"
                    # Note: Actual interrupt handling happens in the graph nodes
                    # via interrupt() function. We just track it here.

        except Exception as e:
            logger.error(f"Streaming execution error: {e}")
            raise

        return {
            "final_state": final_state or adapter.get_final_state() or initial_state,
            "steps_completed": adapter.steps_completed,
            "interrupted": interrupted,
            "interrupt_reason": interrupt_reason,
            "checkpoints": adapter.checkpoints
        }

    async def _execute_basic(
        self,
        graph,
        initial_state: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Execute workflow without streaming (basic mode)"""
        logger.info(f"Executing {self.graph_name} in basic mode")

        config = {
            "recursion_limit": self.config.get("recursion_limit", 25)
        }

        # Add checkpointer config - always provide thread_id if checkpointer exists
        if self.config.get("checkpointer"):
            import uuid
            thread_id = self.config.get("thread_id") or f"exec-{uuid.uuid4().hex[:12]}"
            config["configurable"] = {"thread_id": thread_id}

        try:
            # Execute workflow
            final_state = await graph.ainvoke(initial_state, config=config)

            return {
                "final_state": final_state,
                "steps_completed": [],  # Not tracked in basic mode
                "interrupted": False
            }

        except Exception as e:
            logger.error(f"Basic execution error: {e}")
            raise

    async def resume(
        self,
        checkpoint_id: str,
        resume_state: Optional[Dict[str, Any]] = None,
        emit_fn: Optional[Callable[[WorkflowProgressEvent], None]] = None
    ) -> WorkflowExecutionResult:
        """
        Resume workflow from checkpoint

        Args:
            checkpoint_id: Checkpoint ID (thread_id for LangGraph)
            resume_state: Optional state updates to apply before resuming
            emit_fn: Optional callback for AG-UI event emission

        Returns:
            WorkflowExecutionResult with resumed execution details
        """
        start_time = datetime.now()

        try:
            logger.info(f"Resuming workflow {self.graph_name} from checkpoint {checkpoint_id}")

            # Load workflow graph
            graph = load_workflow_graph(self.graph_name)

            # Configure for resume
            config = {
                "recursion_limit": self.config.get("recursion_limit", 25),
                "configurable": {"thread_id": checkpoint_id}
            }

            # Get checkpoint state
            # Note: This requires checkpointer to be set up properly
            # For now, we'll assume resume_state is provided

            if not resume_state:
                logger.warning("No resume_state provided, this may cause issues")
                resume_state = {}

            # Execute from checkpoint
            if self.config.get("emit_agui_events") and emit_fn:
                result = await self._execute_with_streaming(
                    graph, resume_state, emit_fn
                )
            else:
                result = await self._execute_basic(graph, resume_state)

            execution_time = (datetime.now() - start_time).total_seconds() * 1000

            execution_result = WorkflowExecutionResult(
                graph_name=self.graph_name,
                success=True,
                final_state=result.get("final_state", resume_state),
                steps_completed=result.get("steps_completed", []),
                execution_time_ms=int(execution_time),
                checkpoint_id=checkpoint_id,
                metadata={"resumed_from": checkpoint_id}
            )

            self.execution_history.append(execution_result)
            return execution_result

        except Exception as e:
            logger.error(f"Resume execution failed: {e}", exc_info=True)
            execution_time = (datetime.now() - start_time).total_seconds() * 1000

            error_result = WorkflowExecutionResult(
                graph_name=self.graph_name,
                success=False,
                final_state=resume_state or {},
                error=str(e),
                execution_time_ms=int(execution_time),
                checkpoint_id=checkpoint_id
            )

            self.execution_history.append(error_result)
            return error_result

    def get_execution_history(self) -> List[WorkflowExecutionResult]:
        """Get execution history for this executor"""
        return self.execution_history

    def get_last_execution(self) -> Optional[WorkflowExecutionResult]:
        """Get last execution result"""
        return self.execution_history[-1] if self.execution_history else None

    def get_metadata(self) -> WorkflowGraphMetadata:
        """Get workflow metadata"""
        return self.metadata


# Convenience functions

async def execute_workflow(
    graph_name: str,
    initial_state: Dict[str, Any],
    config: Optional[ExecutionConfig] = None,
    emit_fn: Optional[Callable[[WorkflowProgressEvent], None]] = None
) -> WorkflowExecutionResult:
    """
    Execute a workflow (convenience function)

    Args:
        graph_name: Name of the workflow to execute
        initial_state: Initial workflow state
        config: Optional execution configuration
        emit_fn: Optional AG-UI event emission callback

    Returns:
        WorkflowExecutionResult
    """
    executor = WorkflowExecutor(graph_name, config)
    return await executor.execute(initial_state, emit_fn)


async def resume_workflow(
    graph_name: str,
    checkpoint_id: str,
    resume_state: Optional[Dict[str, Any]] = None,
    config: Optional[ExecutionConfig] = None,
    emit_fn: Optional[Callable[[WorkflowProgressEvent], None]] = None
) -> WorkflowExecutionResult:
    """
    Resume a workflow from checkpoint (convenience function)

    Args:
        graph_name: Name of the workflow to resume
        checkpoint_id: Checkpoint ID to resume from
        resume_state: Optional state updates
        config: Optional execution configuration
        emit_fn: Optional AG-UI event emission callback

    Returns:
        WorkflowExecutionResult
    """
    executor = WorkflowExecutor(graph_name, config)
    return await executor.resume(checkpoint_id, resume_state, emit_fn)


def create_executor(
    graph_name: str,
    config: Optional[ExecutionConfig] = None
) -> WorkflowExecutor:
    """
    Create a workflow executor (factory function)

    Args:
        graph_name: Name of the workflow
        config: Optional execution configuration

    Returns:
        WorkflowExecutor instance
    """
    return WorkflowExecutor(graph_name, config)


# Export main classes and functions
__all__ = [
    "WorkflowExecutor",
    "ExecutionConfig",
    "WorkflowExecutionResult",
    "execute_workflow",
    "resume_workflow",
    "create_executor"
]
