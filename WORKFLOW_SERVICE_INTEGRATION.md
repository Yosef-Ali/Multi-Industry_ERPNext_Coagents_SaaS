# Workflow Service Integration - Complete Guide

**Date**: 2025-10-02
**Status**: Ready for integration testing

## Overview

This document describes the complete integration between the Claude Agent SDK (TypeScript) and LangGraph Workflows (Python) using the hybrid architecture.

## Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                    USER REQUEST                              │
│  "Create a hotel reservation and check in the guest"        │
└──────────────────────┬──────────────────────────────────────┘
                       │
                       ▼
┌─────────────────────────────────────────────────────────────┐
│              CLAUDE AGENT SDK (TypeScript)                   │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Orchestrator Agent (orchestrator.ts)               │   │
│  │  - Classifies request                               │   │
│  │  - Routes to Hotel Subagent                         │   │
│  └──────────────────┬──────────────────────────────────┘   │
│                     │                                        │
│  ┌─────────────────▼──────────────────────────────────┐   │
│  │  Hotel Subagent (subagents/hotel.ts)               │   │
│  │  - Determines "hotel_o2c" workflow needed          │   │
│  │  - Calls executeWorkflowGraph() tool               │   │
│  └──────────────────┬──────────────────────────────────┘   │
└────────────────────┬┘                                       │
                     │                                         │
                     ▼                                         │
┌─────────────────────────────────────────────────────────────┐
│         WORKFLOW BRIDGE (TypeScript → Python)                │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  Workflow Executor Tool (executor.ts)               │   │
│  │  - Looks up "hotel_o2c" in WORKFLOW_REGISTRY       │   │
│  │  - Prepares HTTP request                           │   │
│  └──────────────────┬──────────────────────────────────┘   │
│                     │                                        │
│                     │ HTTP POST /execute                     │
│                     │                                        │
└────────────────────┬┘                                       │
                     │                                         │
                     ▼                                         │
┌─────────────────────────────────────────────────────────────┐
│           PYTHON WORKFLOW SERVICE (FastAPI)                  │
│  ┌─────────────────────────────────────────────────────┐   │
│  │  HTTP Server (server.py)                            │   │
│  │  - Receives execution request                       │   │
│  │  - Validates state                                  │   │
│  └──────────────────┬──────────────────────────────────┘   │
│                     │                                        │
│  ┌─────────────────▼──────────────────────────────────┐   │
│  │  Workflow Registry (registry.py)                    │   │
│  │  - Loads "hotel_o2c" graph                         │   │
│  │  - Returns compiled StateGraph                      │   │
│  └──────────────────┬──────────────────────────────────┘   │
│                     │                                        │
│  ┌─────────────────▼──────────────────────────────────┐   │
│  │  LangGraph StateGraph Execution                     │   │
│  │  - Runs nodes: check_in → folio → charges → ...   │   │
│  │  - Hits interrupt() at check_in approval           │   │
│  └──────────────────┬──────────────────────────────────┘   │
│                     │                                        │
│  ┌─────────────────▼──────────────────────────────────┐   │
│  │  Stream Adapter (stream_adapter.py)                 │   │
│  │  - Converts LangGraph events → AG-UI SSE format    │   │
│  └──────────────────┬──────────────────────────────────┘   │
└────────────────────┬┘                                       │
                     │                                         │
                     │ SSE Stream                              │
                     │                                         │
                     ▼                                         │
┌─────────────────────────────────────────────────────────────┐
│                    FRONTEND (AG-UI)                          │
│  - Receives SSE events                                       │
│  - Shows approval dialog: "Approve check-in?"               │
│  - User clicks "Approve"                                     │
│  - Sends resume command                                      │
└──────────────────┬──────────────────────────────────────────┘
                   │                                           │
                   │ POST /resume {decision: "approve"}        │
                   │                                           │
                   ▼                                           │
┌─────────────────────────────────────────────────────────────┐
│           PYTHON WORKFLOW SERVICE (Resume)                   │
│  - Receives resume command                                   │
│  - Calls graph.invoke(Command(resume="approve"))            │
│  - Continues execution: folio → charges → check_out        │
│  - Hits interrupt() again at invoice approval               │
│  - User approves → Workflow completes                       │
│  - Returns final state                                       │
└──────────────────┬──────────────────────────────────────────┘
                   │                                           │
                   │ Final State                               │
                   │                                           │
                   ▼                                           │
┌─────────────────────────────────────────────────────────────┐
│              CLAUDE AGENT SDK (Response)                     │
│  - Subagent receives final state                            │
│  - Formats human-readable response                          │
│  - Returns to user: "✅ Guest checked in successfully..."  │
└─────────────────────────────────────────────────────────────┘
```

## Components

### 1. TypeScript Bridge (executor.ts)

**Location**: `services/agent-gateway/src/tools/workflow/executor.ts`

**Purpose**: Bridge tool that connects Claude Agent SDK to Python workflow service

**Key Functions**:
```typescript
export async function executeWorkflowGraph(
  request: WorkflowGraphRequest,
  streamEmitter?: (event: WorkflowProgressEvent) => void
): Promise<WorkflowGraphResult>
```

**Workflow Registry**:
```typescript
export const WORKFLOW_REGISTRY: { [key: string]: { module: string; description: string } } = {
  "hotel_o2c": {
    module: "workflows.hotel.o2c_graph",
    description: "Hotel Order-to-Cash: Check-in → Folio → Check-out → Invoice"
  },
  "hospital_admissions": {
    module: "workflows.hospital.admissions_graph",
    description: "Patient admission: Record → Orders → Encounter → Billing"
  },
  "manufacturing_production": {
    module: "workflows.manufacturing.production_graph",
    description: "Manufacturing: Material check → Work order → Quality inspection"
  },
  "retail_fulfillment": {
    module: "workflows.retail.fulfillment_graph",
    description: "Retail: Inventory → Sales order → Delivery → Payment"
  },
  "education_admissions": {
    module: "workflows.education.admissions_graph",
    description: "Education: Application → Interview → Decision → Enrollment"
  }
};
```

### 2. Python Workflow Service (server.py)

**Location**: `services/workflows/src/server.py`

**Purpose**: FastAPI HTTP service for executing LangGraph workflows

**Endpoints**:

#### `GET /`
Health check and service info

```bash
curl http://localhost:8001/
```

Response:
```json
{
  "service": "ERPNext Workflow Service",
  "status": "healthy",
  "workflows": {
    "total_workflows": 5,
    "loaded_graphs": 0,
    "by_industry": {
      "hotel": 1,
      "hospital": 1,
      "manufacturing": 1,
      "retail": 1,
      "education": 1
    }
  }
}
```

#### `GET /workflows`
List available workflows

```bash
curl http://localhost:8001/workflows
```

Response:
```json
{
  "workflows": {
    "hotel_o2c": {
      "name": "hotel_o2c",
      "description": "Hotel Order-to-Cash: Check-in → Folio → Check-out → Invoice",
      "industry": "hotel",
      "initial_state_schema": {
        "reservation_id": "str",
        "guest_name": "str",
        "room_number": "str",
        "check_in_date": "str",
        "check_out_date": "str"
      },
      "estimated_steps": 5
    },
    ...
  },
  "total": 5,
  "by_industry": {...}
}
```

#### `POST /execute`
Execute a workflow with SSE streaming

```bash
curl -X POST http://localhost:8001/execute \
  -H "Content-Type: application/json" \
  -d '{
    "graph_name": "hotel_o2c",
    "initial_state": {
      "reservation_id": "RES-001",
      "guest_name": "John Doe",
      "room_number": "101",
      "check_in_date": "2025-10-01",
      "check_out_date": "2025-10-02"
    },
    "stream": true
  }'
```

SSE Response:
```
event: workflow_start
data: {"type":"workflow_start","graph_name":"hotel_o2c","thread_id":"..."}

event: step_complete
data: {"type":"step_complete","step":"check_in_guest","state":{...}}

event: approval_required
data: {"type":"approval_required","interrupt":{...},"message":"Workflow paused for approval"}

event: workflow_paused
data: {"type":"workflow_paused","thread_id":"..."}
```

#### `POST /resume`
Resume a paused workflow

```bash
curl -X POST http://localhost:8001/resume \
  -H "Content-Type: application/json" \
  -d '{
    "thread_id": "abc-123",
    "decision": "approve"
  }'
```

### 3. Workflow Registry (registry.py)

**Location**: `services/workflows/src/core/registry.py`

**Purpose**: Central registry for all workflow graphs

**Key Functions**:
```python
def load_workflow_graph(graph_name: str) -> StateGraph:
    """Load and compile a workflow graph"""

def validate_workflow_state(graph_name: str, initial_state: Dict) -> tuple[bool, str]:
    """Validate initial state against schema"""

def list_workflows(industry: Optional[str] = None) -> Dict:
    """List available workflows"""
```

### 4. Stream Adapter (stream_adapter.py)

**Location**: `services/workflows/src/core/stream_adapter.py`

**Purpose**: Convert LangGraph events to AG-UI SSE format

**Key Classes**:
```python
class AGUIStreamAdapter:
    """Adapter for converting LangGraph events to AG-UI format"""

    async def stream_workflow_execution(
        self,
        graph,
        initial_state: Dict[str, Any],
        emit_fn: Optional[Callable] = None
    ) -> AsyncGenerator[WorkflowProgressEvent, None]:
        """Stream workflow execution with progress events"""
```

### 5. Workflow Graphs (5 implementations)

**Locations**:
- `services/workflows/src/hotel/o2c_graph.py`
- `services/workflows/src/hospital/admissions_graph.py`
- `services/workflows/src/manufacturing/production_graph.py`
- `services/workflows/src/retail/fulfillment_graph.py`
- `services/workflows/src/education/admissions_graph.py`

**Pattern** (all workflows):
```python
class WorkflowState(TypedDict):
    """State schema"""
    pass

async def node1(state: WorkflowState) -> WorkflowState:
    """Node implementation"""
    return updated_state

async def approval_node(state: WorkflowState) -> Command:
    """Approval gate with interrupt()"""
    decision = interrupt({...})
    if decision == "approve":
        return Command(goto="next_step")
    else:
        return Command(goto="rejected")

def create_graph() -> StateGraph:
    """Build and compile graph"""
    builder = StateGraph(WorkflowState)
    builder.add_node("node1", node1)
    # ... add edges ...
    checkpointer = InMemorySaver()
    return builder.compile(checkpointer=checkpointer)
```

## Integration Flow

### Step-by-Step Execution

#### 1. User Request
```
User: "Check in guest John Doe for room 101"
```

#### 2. Orchestrator Classification
```typescript
// orchestrator.ts
const classification = await classifyRequest(request);
// Result: { routing_decision: "delegate", requires_subagents: ["hotel"] }
```

#### 3. Subagent Invocation
```typescript
// orchestrator.ts
const result = await delegateToSubagent(request, "hotel");
```

#### 4. Subagent Determines Workflow
```typescript
// subagents/hotel.ts - tool definition
{
  name: "execute_workflow",
  description: "Execute hotel workflow",
  input_schema: {
    workflow_name: "hotel_o2c",
    initial_state: {...}
  }
}
```

#### 5. Execute Workflow Tool
```typescript
// executor.ts
const result = await executeWorkflowGraph({
  graphName: "hotel_o2c",
  initialState: {
    reservation_id: "RES-001",
    guest_name: "John Doe",
    room_number: "101",
    check_in_date: "2025-10-01",
    check_out_date: "2025-10-02"
  }
});
```

#### 6. HTTP Request to Python Service
```http
POST http://localhost:8001/execute
Content-Type: application/json

{
  "graph_name": "hotel_o2c",
  "initial_state": {
    "reservation_id": "RES-001",
    "guest_name": "John Doe",
    "room_number": "101",
    "check_in_date": "2025-10-01",
    "check_out_date": "2025-10-02"
  },
  "stream": true
}
```

#### 7. Python Workflow Execution
```python
# server.py
graph = load_workflow_graph("hotel_o2c")
config = {"configurable": {"thread_id": str(uuid.uuid4())}}

# Stream execution
async for state in graph.astream(initial_state, config):
    # Step 1: check_in_guest node executes
    # → Calls interrupt() for approval
    # → Pauses execution
    # → Emits SSE event
```

#### 8. SSE Stream to Frontend
```javascript
// Frontend receives:
{
  type: "approval_required",
  operation: "check_in_guest",
  details: {
    guest_name: "John Doe",
    room_number: "101",
    check_in_date: "2025-10-01"
  },
  preview: "Check-in Details:\n  - Guest: John Doe\n  - Room: 101",
  action: "Please approve guest check-in",
  risk_level: "medium"
}
```

#### 9. User Approves
```javascript
// Frontend sends:
POST /resume
{
  thread_id: "abc-123",
  decision: "approve"
}
```

#### 10. Resume Execution
```python
# server.py
result = await graph.ainvoke(Command(resume="approve"), config)
# → Continues from checkpoint
# → Executes: create_folio → add_charges → check_out
# → Hits interrupt() again at invoice approval
```

#### 11. Second Approval
```javascript
// User approves invoice
// Workflow completes
// Returns final state
```

#### 12. Response to Subagent
```typescript
// executor.ts returns:
{
  success: true,
  thread_id: "abc-123",
  final_state: {
    reservation_id: "RES-001",
    folio_id: "FO-RES-001",
    invoice_id: "INV-RES-001",
    current_step: "completed"
  }
}
```

#### 13. Subagent Formats Response
```typescript
// subagents/hotel.ts
return `✅ Guest check-in completed successfully!

Reservation: RES-001
Folio: FO-RES-001
Invoice: INV-RES-001

Guest John Doe is now checked into room 101.`;
```

## Setup Instructions

### 1. Install Python Dependencies

```bash
cd services/workflows
pip install -r requirements.txt
```

### 2. Start Python Workflow Service

```bash
cd services/workflows/src
python server.py
```

Service starts on `http://localhost:8001`

### 3. Start TypeScript Agent Gateway

```bash
cd services/agent-gateway
npm install
npm run dev
```

Service starts on `http://localhost:3000`

### 4. Test End-to-End

```bash
# Send request to orchestrator
curl -X POST http://localhost:3000/api/request \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Check in guest John Doe for room 101"
  }'
```

## Testing

### Test Python Service Only

```bash
# 1. Test workflow registry
cd services/workflows
python test_registry.py

# 2. Test individual workflow
cd src/hotel
python o2c_graph.py

# 3. Test HTTP service
python src/server.py
# In another terminal:
curl http://localhost:8001/workflows
```

### Test TypeScript Bridge Only

```bash
cd services/agent-gateway
npm run test:workflows
```

### Test Full Integration

```bash
# 1. Start Python service
cd services/workflows/src
python server.py

# 2. Start agent gateway (in another terminal)
cd services/agent-gateway
npm run dev

# 3. Send test request (in another terminal)
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Create a hotel reservation and check in John Doe"
  }'
```

## Deployment

### Development

```bash
# Terminal 1: Python service
cd services/workflows/src
python server.py

# Terminal 2: Agent gateway
cd services/agent-gateway
npm run dev

# Terminal 3: Frontend
cd frontend/coagent
npm run dev
```

### Production (Docker Compose)

```yaml
version: '3.8'

services:
  workflow-service:
    build: ./services/workflows
    ports:
      - "8001:8001"
    environment:
      - DATABASE_URL=postgresql://...
      - REDIS_URL=redis://...

  agent-gateway:
    build: ./services/agent-gateway
    ports:
      - "3000:3000"
    environment:
      - ANTHROPIC_API_KEY=${ANTHROPIC_API_KEY}
      - WORKFLOW_SERVICE_URL=http://workflow-service:8001
    depends_on:
      - workflow-service

  frontend:
    build: ./frontend/coagent
    ports:
      - "5173:5173"
    depends_on:
      - agent-gateway
```

## Monitoring

### Workflow Metrics

Track in production:
- Execution time per workflow
- Approval wait times
- Success/rejection rates
- Error frequencies
- Active workflow sessions

### Logging

Both services log execution:

**Python**:
```
✅ Checking in guest: John Doe
📋 Creating folio: FO-RES-001
⏸️  Workflow paused for invoice approval
```

**TypeScript**:
```
[Orchestrator] Routing to hotel subagent
[Hotel] Executing workflow: hotel_o2c
[Workflow] Waiting for approval...
```

## Troubleshooting

### Python Service Won't Start

```bash
# Check dependencies
pip list | grep langgraph

# Reinstall
pip install -r requirements.txt
```

### Workflow Not Found

```bash
# List available workflows
curl http://localhost:8001/workflows

# Check registry
python -c "from core.registry import get_registry; print(get_registry().list_workflows())"
```

### Connection Refused

```bash
# Check Python service is running
curl http://localhost:8001/

# Check TypeScript service
curl http://localhost:3000/health
```

### Approval Not Working

- Verify SSE connection in browser dev tools
- Check frontend is listening for SSE events
- Verify `/resume` endpoint is called with correct thread_id

## Next Steps

1. ✅ All 5 workflows implemented
2. ✅ Python HTTP service created
3. ✅ Workflow registry configured
4. ⏳ Add PostgresSaver for production persistence
5. ⏳ Implement `/resume` endpoint properly
6. ⏳ Add workflow monitoring/metrics
7. ⏳ Create frontend approval UI components
8. ⏳ End-to-end integration testing

## References

- [LangGraph Best Practices](./LANGGRAPH_BEST_PRACTICES.md)
- [Workflow Implementations T087-T088](./WORKFLOWS_T087_T088_COMPLETE.md)
- [Workflow Implementations T089-T091](./WORKFLOWS_T089_T091_COMPLETE.md)
- [Phase 3.4 Hybrid Bridge](./PHASE_3.4_HYBRID_BRIDGE_COMPLETE.md)
- [Workflows README](./services/workflows/README.md)

---

**Status**: ✅ Ready for integration testing
**Last Updated**: 2025-10-02
