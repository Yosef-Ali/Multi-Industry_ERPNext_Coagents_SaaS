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
from core.stream_adapter import AGUIStreamAdapter, SSEWorkflowStreamer


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
async def execute_workflow(request: WorkflowExecuteRequest):
    """
    Execute a workflow graph

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

    # Validate initial state
    is_valid, error = validate_workflow_state(request.graph_name, request.initial_state)
    if not is_valid:
        raise HTTPException(status_code=400, detail=f"Invalid initial state: {error}")

    # Load workflow graph
    try:
        graph = load_workflow_graph(request.graph_name)
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load workflow: {str(e)}"
        )

    # Execute with streaming if requested
    if request.stream:
        return StreamingResponse(
            stream_workflow_execution(graph, request.initial_state, thread_id, request.graph_name),
            media_type="text/event-stream",
            headers={
                "Cache-Control": "no-cache",
                "Connection": "keep-alive",
                "X-Accel-Buffering": "no"  # Disable nginx buffering
            }
        )
    else:
        # Execute without streaming
        config = {"configurable": {"thread_id": thread_id}}

        try:
            final_state = await graph.ainvoke(request.initial_state, config)

            # Check if paused at interrupt
            if "__interrupt__" in final_state:
                return WorkflowExecuteResponse(
                    thread_id=thread_id,
                    status="paused",
                    interrupt_data=final_state["__interrupt__"]
                )

            # Check if rejected
            if final_state.get("current_step") == "rejected":
                return WorkflowExecuteResponse(
                    thread_id=thread_id,
                    status="rejected",
                    final_state=final_state
                )

            # Completed successfully
            return WorkflowExecuteResponse(
                thread_id=thread_id,
                status="completed",
                final_state=final_state
            )

        except Exception as e:
            return WorkflowExecuteResponse(
                thread_id=thread_id,
                status="error",
                error=str(e)
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


# SSE Streaming Helper
async def stream_workflow_execution(
    graph,
    initial_state: Dict[str, Any],
    thread_id: str,
    graph_name: str
) -> AsyncIterator[str]:
    """
    Stream workflow execution as SSE events

    Yields:
        SSE-formatted event strings
    """
    config = {"configurable": {"thread_id": thread_id}}

    # Create stream adapter
    adapter = AGUIStreamAdapter(graph_name)
    streamer = SSEWorkflowStreamer(adapter)

    try:
        # Start workflow execution
        yield streamer.format_sse_event({
            "type": "workflow_start",
            "graph_name": graph_name,
            "thread_id": thread_id,
            "initial_state": initial_state
        })

        # Stream execution
        async for state in graph.astream(initial_state, config):
            # Extract current node
            current_node = state.get("__current_node__")

            if current_node:
                # Node completed
                event = {
                    "type": "step_complete",
                    "step": current_node,
                    "state": state,
                    "thread_id": thread_id
                }
                yield streamer.format_sse_event(event)

            # Check for interrupt
            if "__interrupt__" in state:
                event = {
                    "type": "approval_required",
                    "thread_id": thread_id,
                    "interrupt": state["__interrupt__"],
                    "message": "Workflow paused for approval"
                }
                yield streamer.format_sse_event(event)

                # End stream - client must resume via /resume
                yield streamer.format_sse_event({
                    "type": "workflow_paused",
                    "thread_id": thread_id
                })
                return

        # Workflow completed
        final_state = state

        if final_state.get("current_step") == "rejected":
            yield streamer.format_sse_event({
                "type": "workflow_rejected",
                "thread_id": thread_id,
                "final_state": final_state
            })
        else:
            yield streamer.format_sse_event({
                "type": "workflow_completed",
                "thread_id": thread_id,
                "final_state": final_state
            })

    except Exception as e:
        # Error occurred
        yield streamer.format_sse_event({
            "type": "workflow_error",
            "thread_id": thread_id,
            "error": str(e)
        })


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
