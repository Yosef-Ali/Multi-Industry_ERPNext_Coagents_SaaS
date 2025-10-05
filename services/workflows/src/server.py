"""
Workflow HTTP Service

FastAPI server for executing LangGraph workflows with SSE streaming support.
Integrates with Claude Agent SDK via TypeScript bridge.

Architecture:
- TypeScript executor.ts → HTTP POST /execute → LangGraph StateGraph
- SSE streaming for progress events
- interrupt() support for approval gates
- Resume execution via /resume endpoint
"""

import asyncio
import uuid
from typing import Dict, Any, Optional, AsyncIterator
from contextlib import asynccontextmanager

from fastapi import FastAPI, HTTPException, Request
from fastapi.responses import StreamingResponse, JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, Field

from langgraph.types import Command

from core.registry import get_registry, load_workflow_graph, validate_workflow_state
from core.stream_adapter import AGUIStreamAdapter, SSEWorkflowStreamer, WorkflowProgressEvent
from core.executor import WorkflowExecutor, ExecutionConfig, execute_workflow as exec_workflow


# Request/Response Models
class WorkflowExecuteRequest(BaseModel):
    """Request to execute a workflow"""
    graph_name: str = Field(..., description="Name of the workflow graph to execute")
    initial_state: Dict[str, Any] = Field(..., description="Initial state for the workflow")
    thread_id: Optional[str] = Field(None, description="Thread ID for session (auto-generated if not provided)")
    stream: bool = Field(True, description="Enable SSE streaming of progress events")


class WorkflowResumeRequest(BaseModel):
    """Request to resume a paused workflow"""
    thread_id: str = Field(..., description="Thread ID of the paused workflow")
    decision: str = Field(..., description="Resume decision (e.g., 'approve', 'reject')")


class WorkflowExecuteResponse(BaseModel):
    """Response from workflow execution"""
    thread_id: str
    status: str  # "completed", "paused", "rejected", "error"
    final_state: Optional[Dict[str, Any]] = None
    interrupt_data: Optional[Dict[str, Any]] = None
    error: Optional[str] = None


class WorkflowListResponse(BaseModel):
    """Response listing available workflows"""
    workflows: Dict[str, Dict[str, Any]]
    total: int
    by_industry: Dict[str, int]


# Application lifespan
@asynccontextmanager
async def lifespan(app: FastAPI):
    """Application lifespan manager"""
    print("🚀 Workflow Service starting...")
    registry = get_registry()
    stats = registry.get_workflow_stats()
    print(f"📋 Loaded {stats['total_workflows']} workflows across {len(stats['available_industries'])} industries")
    print(f"   Industries: {', '.join(stats['available_industries'])}")
    yield
    print("👋 Workflow Service shutting down...")


# FastAPI app
app = FastAPI(
    title="ERPNext Workflow Service",
    description="LangGraph workflow execution service with SSE streaming",
    version="1.0.0",
    lifespan=lifespan
)

# CORS middleware for frontend access
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],  # In production, restrict to specific origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Endpoints

@app.get("/")
async def root():
    """Health check endpoint"""
    registry = get_registry()
    stats = registry.get_workflow_stats()
    return {
        "service": "ERPNext Workflow Service",
        "status": "healthy",
        "workflows": stats
    }


@app.get("/workflows", response_model=WorkflowListResponse)
async def list_workflows(industry: Optional[str] = None):
    """
    List available workflows

    Args:
        industry: Optional filter by industry (hotel, hospital, manufacturing, retail, education)
    """
    registry = get_registry()
    workflows = registry.list_workflows(industry)
    stats = registry.get_workflow_stats()

    # Convert to dict format
    workflow_dict = {
        name: {
            "name": meta.name,
            "description": meta.description,
            "industry": meta.industry,
            "initial_state_schema": meta.initial_state_schema,
            "estimated_steps": meta.estimated_steps
        }
        for name, meta in workflows.items()
    }

    return WorkflowListResponse(
        workflows=workflow_dict,
        total=len(workflow_dict),
        by_industry=stats["by_industry"]
    )


@app.get("/workflows/{graph_name}")
async def get_workflow_info(graph_name: str):
    """Get information about a specific workflow"""
    registry = get_registry()
    metadata = registry.get_workflow_metadata(graph_name)

    if not metadata:
        raise HTTPException(status_code=404, detail=f"Workflow '{graph_name}' not found")

    return {
        "name": metadata.name,
        "description": metadata.description,
        "industry": metadata.industry,
        "initial_state_schema": metadata.initial_state_schema,
        "estimated_steps": metadata.estimated_steps,
        "module_path": metadata.module_path
    }


@app.post("/execute")
async def execute_workflow_endpoint(request: WorkflowExecuteRequest):
    """
    Execute a workflow graph using T082 WorkflowExecutor

    Returns SSE stream if stream=true, otherwise returns final state
    """
    # Generate thread_id if not provided
    thread_id = request.thread_id or str(uuid.uuid4())

    # Validate workflow exists
    registry = get_registry()
    if not registry.get_workflow_metadata(request.graph_name):
        raise HTTPException(
            status_code=404,
            detail=f"Workflow '{request.graph_name}' not found"
        )

    # Execute with streaming if requested
    if request.stream:
        return StreamingResponse(
            stream_workflow_with_executor(
                request.graph_name,
                request.initial_state,
                thread_id
            ),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"  # Disable nginx buffering
            }
        )
    else:
        # Execute without streaming using T082 executor
        try:
            config = ExecutionConfig(
                thread_id=thread_id,
                emit_agui_events=False,
                recursion_limit=30
            )

            result = await exec_workflow(
                request.graph_name,
                request.initial_state,
                config=config
            )

            if not result.success:
                return WorkflowExecuteResponse(
                    thread_id=thread_id,
                    status="error",
                    error=result.error
                )

            # Check if interrupted
            if result.interrupted:
                return WorkflowExecuteResponse(
                    thread_id=thread_id,
                    status="paused",
                    interrupt_data={"reason": result.interrupt_reason},
                    final_state=result.final_state
                )

            # Completed successfully
            return WorkflowExecuteResponse(
                thread_id=thread_id,
                status="completed",
                final_state=result.final_state
            )

        except Exception as e:
            raise HTTPException(
                status_code=500,
                detail=f"Execution failed: {str(e)}"
            )


@app.post("/resume")
async def resume_workflow(request: WorkflowResumeRequest):
    """
    Resume a paused workflow with a decision

    Used after interrupt() pauses workflow for approval
    """
    # This is a simplified implementation
    # In production, you'd need to:
    # 1. Store the graph instance associated with thread_id
    # 2. Retrieve the paused state
    # 3. Resume with Command(resume=decision)

    # For now, return instructions
    return {
        "message": "Resume endpoint - implementation requires persistent state storage",
        "thread_id": request.thread_id,
        "decision": request.decision,
        "note": "In production, use PostgresSaver or Redis for state persistence"
    }


# SSE Streaming Helpers

async def stream_workflow_with_executor(
    graph_name: str,
    initial_state: Dict[str, Any],
    thread_id: str
) -> AsyncIterator[str]:
    """
    Stream workflow execution using T082 WorkflowExecutor

    Yields:
        SSE-formatted event strings
    """
    # Create SSE streamer
    streamer = SSEWorkflowStreamer(correlation_id=thread_id)
    
    # Event buffer to emit via SSE
    events_emitted = []
    
    def emit_callback(event: WorkflowProgressEvent):
        """Callback to capture events from executor"""
        events_emitted.append(event)
    
    try:
        # Create executor with streaming enabled
        config = ExecutionConfig(
            thread_id=thread_id,
            emit_agui_events=True,
            recursion_limit=30
        )
        
        executor = WorkflowExecutor(graph_name, config)
        
        # Start execution with callback
        # Note: We need to run this in a task and yield events as they come
        execution_task = asyncio.create_task(
            executor.execute(initial_state, emit_fn=emit_callback)
        )
        
        # Poll for events and yield them
        last_emitted = 0
        while not execution_task.done():
            await asyncio.sleep(0.05)  # 50ms poll interval
            
            # Yield any new events
            while last_emitted < len(events_emitted):
                event = events_emitted[last_emitted]
                sse_message = streamer.format_sse_event(event)
                yield sse_message
                last_emitted += 1
        
        # Get final result
        result = await execution_task
        
        # Yield any remaining events
        while last_emitted < len(events_emitted):
            event = events_emitted[last_emitted]
            sse_message = streamer.format_sse_event(event)
            yield sse_message
            last_emitted += 1
        
        # Emit final result event
        if result.interrupted:
            final_event = WorkflowProgressEvent(
                type="workflow_paused",
                graph_name=graph_name,
                state=result.final_state
            )
        elif result.success:
            final_event = WorkflowProgressEvent(
                type="workflow_complete",
                graph_name=graph_name,
                state=result.final_state
            )
        else:
            final_event = WorkflowProgressEvent(
                type="workflow_error",
                graph_name=graph_name,
                state={"error": result.error}
            )
        
        yield streamer.format_sse_event(final_event)
        
    except Exception as e:
        # Error occurred
        error_event = WorkflowProgressEvent(
            type="workflow_error",
            graph_name=graph_name,
            state={"error": str(e)}
        )
        yield streamer.format_sse_event(error_event)


async def stream_workflow_execution(
    graph,
    initial_state: Dict[str, Any],
    thread_id: str,
    graph_name: str
) -> AsyncIterator[str]:
    """
    Stream workflow execution as SSE events (legacy - kept for compatibility)

    Yields:
        SSE-formatted event strings
    """
    config = {"configurable": {"thread_id": thread_id}}

    # Create stream adapter
    streamer = SSEWorkflowStreamer(correlation_id=thread_id)

    try:
        # Start workflow execution
        start_event = WorkflowProgressEvent(
            type="workflow_start",
            graph_name=graph_name,
            state=initial_state
        )
        yield streamer.format_sse_event(start_event)

        # Stream execution
        async for state in graph.astream(initial_state, config):
            # Extract current node
            current_node = state.get("__current_node__")

            if current_node:
                # Node completed
                event = WorkflowProgressEvent(
                    type="step_complete",
                    graph_name=graph_name,
                    step=current_node,
                    state=state
                )
                yield streamer.format_sse_event(event)

            # Check for interrupt
            if "__interrupt__" in state:
                event = WorkflowProgressEvent(
                    type="approval_required",
                    graph_name=graph_name,
                    state=state
                )
                yield streamer.format_sse_event(event)

                # End stream - client must resume via /resume
                pause_event = WorkflowProgressEvent(
                    type="workflow_paused",
                    graph_name=graph_name,
                    state=state
                )
                yield streamer.format_sse_event(pause_event)
                return

        # Workflow completed
        final_state = state

        if final_state.get("current_step") == "rejected":
            event = WorkflowProgressEvent(
                type="workflow_rejected",
                graph_name=graph_name,
                state=final_state
            )
        else:
            event = WorkflowProgressEvent(
                type="workflow_complete",
                graph_name=graph_name,
                state=final_state
            )
        yield streamer.format_sse_event(event)

    except Exception as e:
        # Error occurred
        error_event = WorkflowProgressEvent(
            type="workflow_error",
            graph_name=graph_name,
            state={"error": str(e)}
        )
        yield streamer.format_sse_event(error_event)


# Development server runner
if __name__ == "__main__":
    import uvicorn

    print("\n" + "="*60)
    print("ERPNext Workflow Service")
    print("="*60)
    print("\nStarting server on http://localhost:8001")
    print("\nAvailable endpoints:")
    print("  GET  /                - Health check")
    print("  GET  /workflows       - List workflows")
    print("  GET  /workflows/{name} - Get workflow info")
    print("  POST /execute         - Execute workflow")
    print("  POST /resume          - Resume paused workflow")
    print("\n" + "="*60 + "\n")

    uvicorn.run(
        app,
        host="0.0.0.0",
        port=8001,
        log_level="info",
        access_log=True
    )
