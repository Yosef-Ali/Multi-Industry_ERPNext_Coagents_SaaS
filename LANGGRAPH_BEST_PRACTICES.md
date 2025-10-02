# LangGraph Best Practices for ERPNext Workflows

**Source**: LangGraph Official Documentation (via Context7 MCP)
**Date**: 2025-10-02
**Purpose**: Apply LangGraph patterns to ERPNext hybrid workflow architecture

## Key Patterns from LangGraph Documentation

### 1. Human-in-the-Loop with `interrupt()`

**Core Pattern**:
```python
from langgraph.types import interrupt, Command

def human_approval_node(state: State) -> Command[Literal["approved", "rejected"]]:
    """Node that pauses workflow for human approval"""
    decision = interrupt({
        "question": "Do you approve this operation?",
        "preview": state["operation_details"]
    })

    if decision == "approve":
        return Command(goto="approved_path", update={"status": "approved"})
    else:
        return Command(goto="rejected_path", update={"status": "rejected"})
```

**Key Features**:
- ✅ `interrupt()` pauses execution and returns payload to client
- ✅ `Command(resume=value)` resumes execution with human input
- ✅ Checkpointer (`InMemorySaver`, `PostgresSaver`) required for state persistence
- ✅ Thread ID tracks individual workflow instances

### 2. StateGraph with Conditional Edges

**Core Pattern**:
```python
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import InMemorySaver

builder = StateGraph(State)
builder.add_node("step_1", step_1_function)
builder.add_node("approval", approval_node)
builder.add_node("approved_path", approved_function)
builder.add_node("rejected_path", rejected_function)

builder.add_edge(START, "step_1")
builder.add_edge("step_1", "approval")
# Approval node uses Command(goto=...) to route
builder.add_edge("approved_path", END)
builder.add_edge("rejected_path", END)

checkpointer = InMemorySaver()
graph = builder.compile(checkpointer=checkpointer)
```

**Key Features**:
- ✅ Nodes are Python functions that receive and return state
- ✅ Conditional edges use `Command(goto=...)` for dynamic routing
- ✅ Checkpointer enables resume after interrupt
- ✅ Thread ID in config enables multi-session support

### 3. Streaming Progress Events

**Core Pattern**:
```python
import uuid

config = {"configurable": {"thread_id": str(uuid.uuid4())}}

# Stream execution with real-time updates
async for state in graph.astream(initial_state, config):
    # Each state update is streamed
    print(f"Current node: {state.get('__current_node__')}")
    print(f"State: {state}")
```

**Key Features**:
- ✅ `graph.astream()` yields state after each node execution
- ✅ Real-time progress updates to frontend
- ✅ Compatible with SSE (Server-Sent Events)
- ✅ Works with interrupt/resume pattern

## Application to ERPNext Workflows

### Pattern 1: Hotel O2C Workflow with Approval Gates

**Implementation** (T087):

```python
# services/workflows/src/hotel/o2c_graph.py
from typing import TypedDict, Literal
from langgraph.graph import StateGraph, START, END
from langgraph.types import interrupt, Command
from langgraph.checkpoint.postgres import PostgresSaver

class HotelO2CState(TypedDict):
    """State for Hotel Order-to-Cash workflow"""
    reservation_id: str
    guest_name: str
    room_number: str
    check_in_date: str
    check_out_date: str

    # Workflow tracking
    folio_id: str | None
    invoice_id: str | None
    current_step: str
    steps_completed: list[str]
    errors: list[dict]

    # Approval tracking
    pending_approval: bool
    approval_decision: str | None

# Step 1: Check-in with approval
async def check_in_guest(state: HotelO2CState) -> Command[Literal["create_folio", "rejected"]]:
    """Check in guest - requires approval"""
    # Request approval
    decision = interrupt({
        "operation": "check_in_guest",
        "details": {
            "guest_name": state["guest_name"],
            "room_number": state["room_number"],
            "check_in_date": state["check_in_date"]
        },
        "action": "Please approve guest check-in"
    })

    if decision == "approve":
        # Perform actual check-in via Frappe API
        await update_doc("Reservation", state["reservation_id"], {
            "status": "Checked In"
        })

        return Command(
            goto="create_folio",
            update={
                "steps_completed": state["steps_completed"] + ["check_in"],
                "approval_decision": "approved"
            }
        )
    else:
        return Command(
            goto="rejected",
            update={
                "errors": state["errors"] + [{"step": "check_in", "reason": "User rejected"}],
                "approval_decision": "rejected"
            }
        )

# Step 2: Create folio (no approval)
async def create_folio(state: HotelO2CState) -> HotelO2CState:
    """Create guest folio"""
    folio = await create_doc("Folio", {
        "reservation": state["reservation_id"],
        "guest": state["guest_name"],
        "room": state["room_number"]
    })

    return {
        **state,
        "folio_id": folio["name"],
        "steps_completed": state["steps_completed"] + ["create_folio"]
    }

# Step 3: Add charges (no approval)
async def add_charges(state: HotelO2CState) -> HotelO2CState:
    """Add room charges to folio"""
    # Calculate charges logic
    return {
        **state,
        "steps_completed": state["steps_completed"] + ["add_charges"]
    }

# Step 4: Check-out (no approval)
async def check_out_guest(state: HotelO2CState) -> HotelO2CState:
    """Check out guest"""
    await update_doc("Reservation", state["reservation_id"], {
        "status": "Checked Out"
    })

    return {
        **state,
        "steps_completed": state["steps_completed"] + ["check_out"]
    }

# Step 5: Generate invoice with approval
async def generate_invoice(state: HotelO2CState) -> Command[Literal["completed", "rejected"]]:
    """Generate invoice - requires approval"""
    # Calculate total charges
    total = 150.0  # Placeholder

    decision = interrupt({
        "operation": "generate_invoice",
        "details": {
            "guest_name": state["guest_name"],
            "folio_id": state["folio_id"],
            "total_amount": total
        },
        "action": "Please approve invoice generation"
    })

    if decision == "approve":
        invoice = await create_doc("Sales Invoice", {
            "customer": state["guest_name"],
            "items": [{"item_code": "Room Charge", "amount": total}]
        })

        return Command(
            goto="completed",
            update={
                "invoice_id": invoice["name"],
                "steps_completed": state["steps_completed"] + ["generate_invoice"]
            }
        )
    else:
        return Command(
            goto="rejected",
            update={
                "errors": state["errors"] + [{"step": "generate_invoice", "reason": "User rejected"}]
            }
        )

# Terminal nodes
async def completed(state: HotelO2CState) -> HotelO2CState:
    """Workflow completed successfully"""
    return {**state, "current_step": "completed"}

async def rejected(state: HotelO2CState) -> HotelO2CState:
    """Workflow rejected by user"""
    return {**state, "current_step": "rejected"}

# Build the graph
def create_graph() -> StateGraph:
    """Create Hotel O2C workflow graph"""
    builder = StateGraph(HotelO2CState)

    # Add nodes
    builder.add_node("check_in_guest", check_in_guest)
    builder.add_node("create_folio", create_folio)
    builder.add_node("add_charges", add_charges)
    builder.add_node("check_out_guest", check_out_guest)
    builder.add_node("generate_invoice", generate_invoice)
    builder.add_node("completed", completed)
    builder.add_node("rejected", rejected)

    # Define edges
    builder.add_edge(START, "check_in_guest")
    # check_in_guest uses Command(goto=...) for conditional routing
    builder.add_edge("create_folio", "add_charges")
    builder.add_edge("add_charges", "check_out_guest")
    builder.add_edge("check_out_guest", "generate_invoice")
    # generate_invoice uses Command(goto=...) for conditional routing
    builder.add_edge("completed", END)
    builder.add_edge("rejected", END)

    # Use PostgreSQL checkpointer for production
    # checkpointer = PostgresSaver.from_conn_string(DB_URI)
    # For now, use in-memory
    from langgraph.checkpoint.memory import InMemorySaver
    checkpointer = InMemorySaver()

    return builder.compile(checkpointer=checkpointer)
```

### Pattern 2: Hospital Admissions Workflow

**Implementation** (T088):

```python
# services/workflows/src/hospital/admissions_graph.py
from typing import TypedDict, Literal
from langgraph.graph import StateGraph, START, END
from langgraph.types import interrupt, Command

class HospitalAdmissionsState(TypedDict):
    """State for Hospital Admissions workflow"""
    patient_name: str
    admission_date: str
    primary_diagnosis: str
    clinical_protocol: str | None

    # Created entities
    patient_id: str | None
    appointment_id: str | None
    encounter_id: str | None
    invoice_id: str | None

    # Workflow tracking
    steps_completed: list[str]
    errors: list[dict]

async def create_patient_record(state: HospitalAdmissionsState) -> HospitalAdmissionsState:
    """Create patient record - no approval needed"""
    patient = await create_doc("Patient", {
        "patient_name": state["patient_name"]
    })

    return {
        **state,
        "patient_id": patient["name"],
        "steps_completed": state["steps_completed"] + ["create_patient"]
    }

async def schedule_admission(state: HospitalAdmissionsState) -> HospitalAdmissionsState:
    """Schedule admission appointment - no approval"""
    appointment = await create_doc("Appointment", {
        "patient": state["patient_id"],
        "appointment_date": state["admission_date"],
        "appointment_type": "Admission"
    })

    return {
        **state,
        "appointment_id": appointment["name"],
        "steps_completed": state["steps_completed"] + ["schedule_admission"]
    }

async def create_order_set(state: HospitalAdmissionsState) -> Command[Literal["create_encounter", "rejected"]]:
    """Create clinical order set - REQUIRES APPROVAL (patient safety)"""
    protocol = state["clinical_protocol"] or "standard_admission"

    # Get protocol details
    orders = get_protocol_orders(protocol)  # Mock function

    decision = interrupt({
        "operation": "create_order_set",
        "details": {
            "patient_id": state["patient_id"],
            "protocol": protocol,
            "orders": orders,
            "total_orders": len(orders)
        },
        "action": "CRITICAL: Clinical orders require approval",
        "risk_level": "high"
    })

    if decision == "approve":
        # Create actual order set
        await create_doc("Order Set", {
            "patient": state["patient_id"],
            "protocol": protocol,
            "orders": orders
        })

        return Command(
            goto="create_encounter",
            update={"steps_completed": state["steps_completed"] + ["create_orders"]}
        )
    else:
        return Command(
            goto="rejected",
            update={"errors": state["errors"] + [{"step": "create_orders", "reason": "Clinical orders rejected"}]}
        )

async def create_encounter(state: HospitalAdmissionsState) -> HospitalAdmissionsState:
    """Create encounter documentation"""
    encounter = await create_doc("Encounter", {
        "patient": state["patient_id"],
        "appointment": state["appointment_id"],
        "encounter_date": state["admission_date"],
        "primary_diagnosis": state["primary_diagnosis"]
    })

    return {
        **state,
        "encounter_id": encounter["name"],
        "steps_completed": state["steps_completed"] + ["create_encounter"]
    }

async def generate_invoice(state: HospitalAdmissionsState) -> Command[Literal["completed", "rejected"]]:
    """Generate invoice - REQUIRES APPROVAL"""
    decision = interrupt({
        "operation": "generate_invoice",
        "details": {
            "patient_id": state["patient_id"],
            "encounter_id": state["encounter_id"]
        },
        "action": "Please approve billing invoice"
    })

    if decision == "approve":
        invoice = await create_doc("Sales Invoice", {
            "patient": state["patient_id"],
            "items": []  # Populated from encounter charges
        })

        return Command(
            goto="completed",
            update={
                "invoice_id": invoice["name"],
                "steps_completed": state["steps_completed"] + ["generate_invoice"]
            }
        )
    else:
        return Command(goto="rejected")

async def completed(state: HospitalAdmissionsState) -> HospitalAdmissionsState:
    return {**state, "status": "completed"}

async def rejected(state: HospitalAdmissionsState) -> HospitalAdmissionsState:
    return {**state, "status": "rejected"}

def create_graph() -> StateGraph:
    """Create Hospital Admissions workflow graph"""
    builder = StateGraph(HospitalAdmissionsState)

    builder.add_node("create_patient", create_patient_record)
    builder.add_node("schedule_admission", schedule_admission)
    builder.add_node("create_orders", create_order_set)
    builder.add_node("create_encounter", create_encounter)
    builder.add_node("generate_invoice", generate_invoice)
    builder.add_node("completed", completed)
    builder.add_node("rejected", rejected)

    builder.add_edge(START, "create_patient")
    builder.add_edge("create_patient", "schedule_admission")
    builder.add_edge("schedule_admission", "create_orders")
    # create_orders uses Command(goto=...)
    builder.add_edge("create_encounter", "generate_invoice")
    # generate_invoice uses Command(goto=...)
    builder.add_edge("completed", END)
    builder.add_edge("rejected", END)

    from langgraph.checkpoint.memory import InMemorySaver
    checkpointer = InMemorySaver()

    return builder.compile(checkpointer=checkpointer)
```

## Key Differences from Original Plan

### ✅ What We're Adopting from LangGraph Best Practices:

1. **`interrupt()` instead of custom approval nodes**
   - LangGraph's built-in `interrupt()` function
   - Returns payload to client via `__interrupt__` key
   - Resume with `Command(resume=value)`

2. **`Command(goto=...)` for conditional routing**
   - Instead of `add_conditional_edges()`
   - Node returns `Command` object with target node
   - Cleaner, more explicit routing logic

3. **TypedDict for state** (not Pydantic)
   - LangGraph uses Python's `TypedDict`
   - Simpler, more lightweight
   - Native Python type checking

4. **Checkpointer for state persistence**
   - `InMemorySaver` for development
   - `PostgresSaver` for production
   - Required for interrupt/resume

5. **Thread ID for multi-session support**
   - Each workflow instance has unique thread ID
   - Enables concurrent workflows
   - State isolated per thread

### ❌ What We're NOT Using:

1. ~~Pydantic models for state~~ → Use TypedDict
2. ~~Custom approval node with database polling~~ → Use `interrupt()`
3. ~~Manual conditional edges~~ → Use `Command(goto=...)`
4. ~~Custom checkpoint storage~~ → Use built-in checkpointers

## Integration with Our Hybrid Architecture

### Flow Diagram:

```
TypeScript (Claude Agent SDK)
    ↓
execute_workflow_graph("hotel_o2c", initial_state)
    ↓
Python Workflow Service
    ↓
Registry loads hotel/o2c_graph.py
    ↓
Compiled StateGraph with checkpointer
    ↓
graph.astream(initial_state, config={"thread_id": "..."})
    ↓
Node execution → interrupt() hit
    ↓
Stream adapter emits: {"type": "approval_required", "interrupt": {...}}
    ↓
AG-UI SSE → Frontend shows approval dialog
    ↓
User clicks "Approve"
    ↓
HTTP POST /resume {thread_id, decision: "approve"}
    ↓
graph.invoke(Command(resume="approve"), config)
    ↓
Workflow continues from where it paused
    ↓
Final state returned to TypeScript bridge
```

## Next Implementation Steps

### T087: Hotel O2C Workflow Graph
- [x] Learn LangGraph patterns from documentation
- [ ] Implement `services/workflows/src/hotel/o2c_graph.py`
- [ ] Use `interrupt()` for check-in and invoice approval
- [ ] Use `Command(goto=...)` for routing
- [ ] Test with InMemorySaver checkpointer

### T088: Hospital Admissions Workflow Graph
- [x] Learn LangGraph patterns from documentation
- [ ] Implement `services/workflows/src/hospital/admissions_graph.py`
- [ ] Use `interrupt()` for clinical orders and billing approval
- [ ] Use `Command(goto=...)` for routing
- [ ] Test with InMemorySaver checkpointer

### T080-T081: Workflow Core
- [ ] Update state schemas to use TypedDict (not Pydantic)
- [ ] Workflow registry already implemented ✅
- [ ] Add checkpointer configuration

### T083-T086: Reusable Nodes
- [ ] Approval node → Use `interrupt()` pattern
- [ ] Retry node → Implement with LangGraph best practices
- [ ] Escalate node → Implement notification logic
- [ ] Notify node → Integrate with AG-UI frames

## References

- LangGraph Documentation: https://langchain-ai.github.io/langgraph/
- Human-in-the-Loop Guide: https://langchain-ai.github.io/langgraph/how-tos/human_in_the_loop/
- StateGraph API: https://langchain-ai.github.io/langgraph/reference/graphs/
- Checkpointers: https://langchain-ai.github.io/langgraph/reference/checkpoints/

## Summary

✅ **LangGraph provides production-ready patterns for:**
- Human-in-the-loop with `interrupt()`
- State persistence with checkpointers
- Conditional routing with `Command(goto=...)`
- Streaming progress with `astream()`
- Multi-session support with thread IDs

✅ **We will adopt these patterns instead of custom implementations**
- Simpler code
- Better tested
- Production-ready
- Official best practices

✅ **Ready to implement T087-T088 workflows with LangGraph patterns**
