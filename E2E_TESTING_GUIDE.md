# End-to-End Testing Guide

**Purpose**: Complete guide for testing the integrated Claude Agent SDK + LangGraph Workflow system

## Prerequisites

### System Requirements
- Node.js 18+
- Python 3.11+
- npm/pnpm
- pip

### Environment Setup
```bash
# Clone repository (if not already)
cd Multi-Industry_ERPNext_Coagents_SaaS

# Install Python dependencies
cd services/workflows
pip install -r requirements.txt

# Install TypeScript dependencies
cd ../agent-gateway
npm install

# Set environment variables
export ANTHROPIC_API_KEY=sk-ant-...
export WORKFLOW_SERVICE_URL=http://localhost:8001
```

## Testing Levels

### Level 1: Python Workflows (Standalone)

Test individual workflows without HTTP service.

#### Test Hotel O2C Workflow

```bash
cd services/workflows/src/hotel
python o2c_graph.py
```

**Expected Output**:
```
============================================================
HOTEL O2C WORKFLOW TEST
============================================================

✅ Checking in guest: John Doe
📋 Creating folio: FO-RES-001
💰 Adding charges to folio: $165.00
🚪 Checking out guest: John Doe

⏸️  Workflow paused for approval
   Interrupt: {'operation': 'check_in_guest', ...}

👤 User approves check-in

📋 Creating folio: FO-RES-001
...

⏸️  Workflow paused for invoice approval
   Interrupt: {'operation': 'generate_invoice', ...}

👤 User approves invoice
🧾 Generating invoice: INV-RES-001

✅ Hotel O2C workflow completed successfully
   - Reservation: RES-001
   - Folio: FO-RES-001
   - Invoice: INV-RES-001

============================================================
FINAL STATE:
============================================================
Steps completed: ['check_in', 'create_folio', 'add_charges', 'check_out', 'generate_invoice']
Folio ID: FO-RES-001
Invoice ID: INV-RES-001
Current step: completed
```

#### Test All Workflows

```bash
cd services/workflows

# Hospital Admissions
python src/hospital/admissions_graph.py

# Manufacturing Production
python src/manufacturing/production_graph.py

# Retail Fulfillment
python src/retail/fulfillment_graph.py

# Education Admissions
python src/education/admissions_graph.py
```

**Success Criteria**: All workflows complete without errors

---

### Level 2: Workflow Registry

Test that the registry can load all workflows correctly.

```bash
cd services/workflows
python test_registry.py
```

**Expected Output**:
```
============================================================
WORKFLOW REGISTRY TEST
============================================================

📊 Registry Statistics:
   Total workflows: 5
   Loaded graphs: 0
   Industries: hotel, hospital, manufacturing, retail, education

   By industry:
   - hotel: 1 workflow(s)
   - hospital: 1 workflow(s)
   - manufacturing: 1 workflow(s)
   - retail: 1 workflow(s)
   - education: 1 workflow(s)

============================================================
TESTING WORKFLOW LOADING
============================================================

🔄 Loading: hotel_o2c
   📋 Hotel Order-to-Cash: Check-in → Folio → Check-out → Invoice
   🏭 Industry: hotel
   📝 Module: workflows.hotel.o2c_graph
   ✅ Graph loaded successfully
   📊 Graph type: CompiledGraph

🔄 Loading: hospital_admissions
   📋 Patient admission: Record → Orders → Encounter → Billing
   🏭 Industry: hospital
   📝 Module: workflows.hospital.admissions_graph
   ✅ Graph loaded successfully
   📊 Graph type: CompiledGraph

... (similar for other 3 workflows)

============================================================
SUMMARY
============================================================

✅ Successful: 5/5

🎉 All workflows loaded successfully!
```

**Success Criteria**: All 5 workflows load without errors

---

### Level 3: HTTP Service

Test the Python FastAPI workflow service.

#### Start the Service

```bash
cd services/workflows/src
python server.py
```

**Expected Output**:
```
============================================================
ERPNext Workflow Service
============================================================

Starting server on http://localhost:8001

Available endpoints:
  GET  /                - Health check
  GET  /workflows       - List workflows
  GET  /workflows/{name} - Get workflow info
  POST /execute         - Execute workflow
  POST /resume          - Resume paused workflow

============================================================

🚀 Workflow Service starting...
📋 Loaded 5 workflows across 5 industries
   Industries: hotel, hospital, manufacturing, retail, education

INFO:     Started server process [12345]
INFO:     Waiting for application startup.
INFO:     Application startup complete.
INFO:     Uvicorn running on http://0.0.0.0:8001 (Press CTRL+C to quit)
```

#### Test Health Check

```bash
# In another terminal
curl http://localhost:8001/
```

**Expected Response**:
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

#### Test Workflow Listing

```bash
curl http://localhost:8001/workflows
```

**Expected Response**:
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
  "by_industry": {
    "hotel": 1,
    "hospital": 1,
    "manufacturing": 1,
    "retail": 1,
    "education": 1
  }
}
```

#### Test Workflow Execution (Non-Streaming)

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
      "check_out_date": "2025-10-02",
      "folio_id": null,
      "invoice_id": null,
      "current_step": "start",
      "steps_completed": [],
      "errors": [],
      "pending_approval": false,
      "approval_decision": null
    },
    "stream": false
  }'
```

**Expected Response** (paused at first approval):
```json
{
  "thread_id": "abc-123-def-456",
  "status": "paused",
  "interrupt_data": {
    "operation": "check_in_guest",
    "operation_type": "hotel_check_in",
    "details": {
      "guest_name": "John Doe",
      "room_number": "101",
      "check_in_date": "2025-10-01",
      "check_out_date": "2025-10-02"
    },
    "preview": "Check-in Details:\n  - Guest: John Doe\n  - Room: 101\n  ...",
    "action": "Please approve guest check-in",
    "risk_level": "medium"
  }
}
```

#### Test SSE Streaming

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
      "check_out_date": "2025-10-02",
      "folio_id": null,
      "invoice_id": null,
      "current_step": "start",
      "steps_completed": [],
      "errors": [],
      "pending_approval": false,
      "approval_decision": null
    },
    "stream": true
  }'
```

**Expected Output** (SSE stream):
```
event: message
data: {"type":"workflow_start","graph_name":"hotel_o2c","thread_id":"...","initial_state":{...}}

event: message
data: {"type":"step_complete","step":"check_in_guest","state":{...},"thread_id":"..."}

event: message
data: {"type":"approval_required","thread_id":"...","interrupt":{...},"message":"Workflow paused for approval"}

event: message
data: {"type":"workflow_paused","thread_id":"..."}
```

**Success Criteria**:
- Health check returns 200
- Workflow listing shows all 5 workflows
- Execution pauses at first approval gate
- SSE stream emits events correctly

---

### Level 4: TypeScript Bridge

Test the TypeScript executor tool that calls the Python service.

#### Update Executor Configuration

First, ensure `services/agent-gateway/src/tools/workflow/executor.ts` has correct URL:

```typescript
const WORKFLOW_SERVICE_URL = process.env.WORKFLOW_SERVICE_URL || "http://localhost:8001";
```

#### Test Executor Function

Create test file: `services/agent-gateway/src/tools/workflow/__tests__/executor.test.ts`

```typescript
import { executeWorkflowGraph } from '../executor';

async function testExecutor() {
  console.log('Testing workflow executor...\n');

  const result = await executeWorkflowGraph({
    graphName: 'hotel_o2c',
    initialState: {
      reservation_id: 'RES-001',
      guest_name: 'John Doe',
      room_number: '101',
      check_in_date: '2025-10-01',
      check_out_date: '2025-10-02',
      folio_id: null,
      invoice_id: null,
      current_step: 'start',
      steps_completed: [],
      errors: [],
      pending_approval: false,
      approval_decision: null
    }
  });

  console.log('Result:', JSON.stringify(result, null, 2));
}

testExecutor().catch(console.error);
```

Run test:
```bash
cd services/agent-gateway
npm run test:executor
```

**Expected Output**:
```
Testing workflow executor...

Result: {
  "success": true,
  "thread_id": "abc-123",
  "status": "paused",
  "interrupt_data": {
    "operation": "check_in_guest",
    ...
  }
}
```

**Success Criteria**: Executor successfully calls Python service and returns result

---

### Level 5: Full Agent Integration

Test complete flow: User request → Orchestrator → Subagent → Workflow → Response

#### Start Both Services

**Terminal 1** (Python Workflow Service):
```bash
cd services/workflows/src
python server.py
```

**Terminal 2** (TypeScript Agent Gateway):
```bash
cd services/agent-gateway
npm run dev
```

#### Test Hotel Workflow via Agent

```bash
# Terminal 3
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Check in guest John Doe for room 101, reservation RES-001"
  }'
```

**Expected Flow**:

1. **Orchestrator** receives request
2. **Orchestrator** classifies as hotel domain
3. **Orchestrator** delegates to Hotel Subagent
4. **Hotel Subagent** determines workflow needed
5. **Hotel Subagent** calls `executeWorkflowGraph` tool
6. **Executor Tool** makes HTTP POST to Python service
7. **Python Service** loads and executes workflow
8. **Workflow** pauses at approval gate
9. **Response** returns to subagent with approval prompt
10. **Subagent** formats response for user

**Expected Response**:
```json
{
  "role": "assistant",
  "content": "I've started the check-in process for John Doe (room 101).\n\n⏸️ **Approval Required**\n\nPlease review the check-in details:\n- Guest: John Doe\n- Room: 101\n- Check-in: 2025-10-01\n- Check-out: 2025-10-02\n\nWould you like to approve this check-in?"
}
```

#### Test Approval Flow

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Yes, approve the check-in",
    "thread_id": "abc-123"
  }'
```

**Expected**: Workflow resumes and continues to next step

---

### Level 6: Industry-Specific Tests

Test all 5 industries end-to-end.

#### Hotel Test

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Check in guest Sarah Johnson for room 205, reservation RES-102"
  }'
```

#### Hospital Test

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Admit patient Michael Chen with pneumonia diagnosis"
  }'
```

#### Manufacturing Test

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Start production of 10 wooden chairs, item code CHAIR-WOODEN"
  }'
```

#### Retail Test

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Process order for customer TechCorp: 10 laptops, 15 mice, 10 keyboards"
  }'
```

#### Education Test

```bash
curl -X POST http://localhost:3000/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Process admission application for Alice Rodriguez, Computer Science program, GPA 3.7"
  }'
```

**Success Criteria**: All 5 workflows execute and pause at approval gates

---

## Testing Checklist

### ✅ Level 1: Python Workflows
- [ ] Hotel O2C workflow runs standalone
- [ ] Hospital Admissions workflow runs standalone
- [ ] Manufacturing Production workflow runs standalone
- [ ] Retail Fulfillment workflow runs standalone
- [ ] Education Admissions workflow runs standalone

### ✅ Level 2: Workflow Registry
- [ ] Registry loads all 5 workflows
- [ ] State validation works correctly
- [ ] Workflow metadata is accurate

### ✅ Level 3: HTTP Service
- [ ] Health check endpoint responds
- [ ] Workflow listing endpoint works
- [ ] Workflow execution (non-streaming) works
- [ ] SSE streaming works
- [ ] Error handling works (invalid workflow, invalid state)

### ✅ Level 4: TypeScript Bridge
- [ ] Executor tool calls Python service
- [ ] Request/response mapping works
- [ ] Error handling works
- [ ] Stream events are captured

### ✅ Level 5: Full Agent Integration
- [ ] Orchestrator routes to correct subagent
- [ ] Subagent determines correct workflow
- [ ] Workflow executes via executor tool
- [ ] Approval prompts reach user
- [ ] Resume flow works

### ✅ Level 6: Industry Tests
- [ ] Hotel workflow end-to-end
- [ ] Hospital workflow end-to-end
- [ ] Manufacturing workflow end-to-end
- [ ] Retail workflow end-to-end
- [ ] Education workflow end-to-end

---

## Troubleshooting

### Python Service Won't Start

**Problem**: `ModuleNotFoundError: No module named 'langgraph'`

**Solution**:
```bash
cd services/workflows
pip install -r requirements.txt
```

---

**Problem**: `ImportError: cannot import name 'StateGraph'`

**Solution**:
```bash
pip install --upgrade langgraph langchain-core
```

---

### Workflow Not Loading

**Problem**: `Unknown workflow graph: xyz`

**Solution**:
```bash
# Check registered workflows
curl http://localhost:8001/workflows

# Or test registry directly
cd services/workflows
python test_registry.py
```

---

### TypeScript Service Can't Connect

**Problem**: `ECONNREFUSED localhost:8001`

**Solution**:
1. Ensure Python service is running: `curl http://localhost:8001/`
2. Check environment variable: `echo $WORKFLOW_SERVICE_URL`
3. Update `executor.ts` with correct URL

---

### Approval Not Working

**Problem**: Workflow doesn't pause at approval gate

**Solution**:
1. Check that workflow uses `interrupt()` correctly
2. Verify checkpointer is configured: `InMemorySaver()`
3. Check thread_id is passed in config

---

### SSE Stream Not Working

**Problem**: No events received from `/execute` endpoint

**Solution**:
1. Ensure `stream: true` in request
2. Check Content-Type in response is `text/event-stream`
3. Disable nginx buffering if behind proxy
4. Test with curl: `curl -N http://localhost:8001/execute ...`

---

## Performance Benchmarks

### Target Metrics

| Workflow | Load Time | Execution Time* | Memory Usage |
|----------|-----------|-----------------|--------------|
| Hotel O2C | <100ms | <5s | <50MB |
| Hospital Admissions | <150ms | <8s | <60MB |
| Manufacturing | <150ms | <10s | <70MB |
| Retail | <120ms | <7s | <55MB |
| Education | <120ms | <7s | <55MB |

*Excludes approval wait time

### Measure Performance

```bash
# Load time
time curl http://localhost:8001/workflows/hotel_o2c

# Execution time (non-streaming)
time curl -X POST http://localhost:8001/execute -d '{...}'

# Memory usage
ps aux | grep "python server.py"
```

---

## Next Steps After Testing

1. ✅ All workflows execute correctly
2. ⏳ Add PostgresSaver for production persistence
3. ⏳ Implement proper `/resume` endpoint
4. ⏳ Add monitoring and metrics
5. ⏳ Create frontend approval UI
6. ⏳ Deploy to staging environment
7. ⏳ Load testing with concurrent workflows
8. ⏳ Production deployment

---

**Testing Status**: Ready for testing once dependencies are installed

**Last Updated**: 2025-10-02
