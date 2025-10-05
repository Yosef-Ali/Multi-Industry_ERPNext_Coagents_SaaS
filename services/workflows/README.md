# ERPNext Workflow Service

LangGraph-based workflow orchestration service for ERPNext multi-industry SaaS platform.

## Architecture

**Hybrid Two-Layer Design:**
- **Layer 1**: Claude Agent SDK (TypeScript) - Intelligence and decision-making
- **Layer 2**: LangGraph (Python) - Deterministic workflow execution with approval gates

## Implemented Workflows

All 5 industry workflows implemented with LangGraph best practices:

| Workflow | Industry | File | Approvals |
|----------|----------|------|-----------|
| Hotel O2C | Hospitality | `src/hotel/o2c_graph.py` | Check-in, Invoice |
| Hospital Admissions | Healthcare | `src/hospital/admissions_graph.py` | Clinical orders, Invoice |
| Manufacturing Production | Manufacturing | `src/manufacturing/production_graph.py` | Material request*, Quality |
| Retail Fulfillment | Retail | `src/retail/fulfillment_graph.py` | Sales order*, Payment* |
| Education Admissions | Education | `src/education/admissions_graph.py` | Interview, Admission |

*Conditional approval based on business rules

## Setup

### 1. Install Dependencies

```bash
cd services/workflows
pip install -r requirements.txt
```

### 2. Test Workflow Registry

```bash
python test_registry.py
```

Expected output:
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

...

✅ Successful: 5/5
🎉 All workflows loaded successfully!
```

### 3. Test Individual Workflows

```bash
# Hotel O2C
cd src/hotel
python o2c_graph.py

# Hospital Admissions
cd src/hospital
python admissions_graph.py

# Manufacturing Production
cd src/manufacturing
python production_graph.py

# Retail Fulfillment
cd src/retail
python fulfillment_graph.py

# Education Admissions
cd src/education
python admissions_graph.py
```

### 4. Start HTTP Service

```bash
cd src
python server.py
```

Server starts on `http://localhost:8001`

#### Available Endpoints:

- `GET /` - Health check
- `GET /workflows` - List all workflows
- `GET /workflows/{name}` - Get workflow info
- `POST /execute` - Execute workflow (with SSE streaming)
- `POST /resume` - Resume paused workflow

## Usage

### Execute Workflow via HTTP

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

### Execute from TypeScript Bridge

```typescript
import { executeWorkflowGraph } from './tools/workflow/executor';

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

## LangGraph Patterns Used

### 1. interrupt() for Approval Gates

```python
decision = interrupt({
    "operation": "check_in_guest",
    "details": {...},
    "preview": "Check-in details...",
    "risk_level": "medium"
})

if decision == "approve":
    return Command(goto="next_step")
else:
    return Command(goto="rejected")
```

### 2. Command(goto=...) for Routing

```python
async def approval_node(state) -> Command[Literal["next", "rejected"]]:
    decision = interrupt({...})

    if decision == "approve":
        return Command(goto="next", update={...})
    else:
        return Command(goto="rejected", update={...})
```

### 3. TypedDict State Schema

```python
class WorkflowState(TypedDict):
    # Input
    field1: str

    # Created entities
    entity_id: str | None

    # Tracking
    steps_completed: list[str]
    errors: list[dict]
```

### 4. InMemorySaver Checkpointer

```python
def create_graph() -> StateGraph:
    builder = StateGraph(WorkflowState)
    # ... add nodes ...
    checkpointer = InMemorySaver()
    return builder.compile(checkpointer=checkpointer)
```

## File Structure

```
services/workflows/
├── src/
│   ├── hotel/
│   │   └── o2c_graph.py              # Hotel O2C workflow
│   ├── hospital/
│   │   └── admissions_graph.py       # Hospital admissions
│   ├── manufacturing/
│   │   └── production_graph.py       # Manufacturing production
│   ├── retail/
│   │   └── fulfillment_graph.py      # Retail fulfillment
│   ├── education/
│   │   └── admissions_graph.py       # Education admissions
│   ├── core/
│   │   ├── registry.py               # Workflow registry
│   │   └── stream_adapter.py         # SSE streaming
│   └── server.py                     # FastAPI HTTP service
├── test_registry.py                  # Registry test script
├── requirements.txt                  # Python dependencies
└── README.md                         # This file
```

## Development

### Adding a New Workflow

1. **Create workflow file**: `src/{industry}/{workflow}_graph.py`

2. **Define state schema**:
```python
class MyWorkflowState(TypedDict):
    # Define state fields
    pass
```

3. **Create nodes**:
```python
async def my_node(state: MyWorkflowState) -> MyWorkflowState:
    # Node logic
    return updated_state
```

4. **Build graph**:
```python
def create_graph() -> StateGraph:
    builder = StateGraph(MyWorkflowState)
    builder.add_node("node1", my_node)
    # ... add edges ...
    checkpointer = InMemorySaver()
    return builder.compile(checkpointer=checkpointer)
```

5. **Register in registry.py**:
```python
"my_workflow": WorkflowGraphMetadata(
    name="my_workflow",
    module_path="workflows.industry.workflow_graph",
    description="Description",
    industry="industry",
    initial_state_schema={...},
    estimated_steps=5
)
```

6. **Test**: Run `python test_registry.py`

## Production Deployment

### 1. Use PostgresSaver for Persistence

Replace `InMemorySaver()` with:

```python
from langgraph.checkpoint.postgres import PostgresSaver

checkpointer = PostgresSaver(connection_string="postgresql://...")
```

### 2. Environment Variables

```bash
DATABASE_URL=postgresql://user:pass@host:5432/db
REDIS_URL=redis://localhost:6379
ANTHROPIC_API_KEY=sk-...
```

### 3. Docker Deployment

```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY src/ ./src/
CMD ["python", "src/server.py"]
```

## Monitoring

### Workflow Metrics

- Execution time per workflow
- Approval wait times
- Success/rejection rates
- Error frequencies

### Logging

All workflows log execution steps:
```
✅ Checking in guest: John Doe
📋 Creating folio: FO-RES-001
💰 Adding charges to folio: $165.00
🚪 Checking out guest: John Doe
⏸️  Workflow paused for invoice approval
```

## Troubleshooting

### "ModuleNotFoundError: No module named 'langgraph'"

Install dependencies: `pip install -r requirements.txt`

### "Unknown workflow graph: xyz"

Check registered workflows: `GET /workflows`

### "Failed to load workflow module"

Verify module path in registry matches actual file location

## References

- [LangGraph Documentation](https://langchain-ai.github.io/langgraph/)
- [Claude Agent SDK](https://github.com/anthropics/claude-agent-sdk)
- [ERPNext API](https://frappeframework.com/docs/user/en/api)

## License

MIT
