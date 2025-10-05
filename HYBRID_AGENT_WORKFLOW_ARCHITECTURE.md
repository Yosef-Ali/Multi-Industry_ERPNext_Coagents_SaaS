# Hybrid Architecture: Claude Agent SDK + LangGraph Workflows

**Date**: October 1, 2025
**Context**: Solving multi-industry workflow orchestration with deterministic state machines
**Challenge**: Same `execute_workflow` tool, but different workflows per industry (Hotel O2C vs Hospital Admissions→Orders→Billing)

---

## The Problem: Workflow Variability

### Challenge Statement

```
Common Tool: execute_workflow(workflow_name, context)
                    ↓
┌───────────────────┴────────────────────┐
│                                        │
▼                                        ▼
Hotel: O2C Workflow                Hospital: Admissions Workflow
├─ Create Reservation               ├─ Create Patient
├─ Check In                         ├─ Schedule Appointment
├─ Create Folio                     ├─ Create Clinical Orders
├─ Check Out                        ├─ Submit Orders
├─ Generate Invoice                 ├─ Generate Invoice
└─ Process Payment                  └─ Process Payment

Manufacturing: MTO Workflow          Retail: E-commerce Workflow
├─ Receive Sales Order              ├─ Create Sales Order
├─ Check Material Availability      ├─ Check Inventory
├─ Create Work Order                ├─ Reserve Stock
├─ Issue Materials                  ├─ Create Delivery Note
├─ Complete Production              ├─ Process Shipment
├─ Quality Check                    └─ Generate Invoice
├─ Create Delivery Note
└─ Generate Invoice
```

**Key Issues**:
1. ❌ Same tool name but completely different execution logic
2. ❌ Different approval gates per industry (clinical orders ≠ reservations)
3. ❌ Different retry/rollback strategies per workflow
4. ❌ Industry-specific state validation rules
5. ❌ Variable workflow depth (3 steps vs 8 steps)

---

## The Solution: Hybrid Architecture

### Architecture Pattern: Agent SDK for Intelligence + LangGraph for Determinism

```
┌─────────────────────────────────────────────────────────────────────┐
│                    CLAUDE AGENT SDK LAYER                           │
│                   (Intelligence + Routing)                          │
│                                                                      │
│  Orchestrator Agent                                                 │
│  ├─ Classifies request                                             │
│  ├─ Routes to industry subagent                                    │
│  └─ Determines if workflow execution needed                        │
│                                                                      │
│  Industry Subagents (Hotel, Hospital, Manufacturing, Retail)       │
│  ├─ Understands domain context                                     │
│  ├─ Validates workflow prerequisites                               │
│  └─ Invokes execute_workflow_graph tool                           │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ delegates to
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    LANGGRAPH WORKFLOW LAYER                         │
│                  (Deterministic State Machines)                     │
│                                                                      │
│  Industry-Specific Graphs:                                         │
│  ├─ hotel_o2c_graph.py                                            │
│  ├─ hospital_admissions_graph.py                                  │
│  ├─ manufacturing_mto_graph.py                                    │
│  └─ retail_ecommerce_graph.py                                     │
│                                                                      │
│  Common Patterns:                                                  │
│  ├─ Approval Nodes (HITL gates)                                   │
│  ├─ Retry Logic (exponential backoff)                             │
│  ├─ Error Handling (rollback strategies)                          │
│  └─ Audit Logging (state transitions)                             │
└──────────────────────────┬──────────────────────────────────────────┘
                           │ calls tools via
                           ▼
┌─────────────────────────────────────────────────────────────────────┐
│                    COMMON TOOLS LAYER                               │
│                  (Industry-Agnostic Operations)                     │
│                                                                      │
│  ├─ search_doc()                                                   │
│  ├─ get_doc()                                                      │
│  ├─ create_doc()         ← with approval gate                     │
│  ├─ update_doc()         ← with approval gate                     │
│  ├─ submit_doc()         ← with approval gate                     │
│  └─ run_report()                                                   │
└──────────────────────────┬──────────────────────────────────────────┘
                           │
                           ▼
                  ERPNext Frappe API
```

---

## Architecture Design

### Layer 1: Claude Agent SDK (Intelligence)

**Responsibility**: Understanding user intent, routing to specialists, invoking workflows

**Hotel Subagent Example**:

```python
# /agents/hotel-specialist.md (extended)

@tool("execute_hotel_workflow", "Execute hotel-specific workflow", {
    "workflow_type": str,  # "o2c" | "reservation_modification" | "cancellation"
    "context": dict
})
async def execute_hotel_workflow(args):
    """
    Hotel subagent tool that delegates to LangGraph state machine.

    Example:
        User: "Check in guest John Doe and create invoice"

        Subagent:
        1. Validates prerequisites (reservation exists, room available)
        2. Determines workflow type: "o2c" (Order-to-Cash)
        3. Prepares context
        4. Invokes LangGraph: hotel_o2c_graph
        5. Streams progress back to user
    """
    workflow_type = args["workflow_type"]
    context = args["context"]

    # Invoke LangGraph workflow (deterministic state machine)
    return await invoke_langgraph_workflow(
        graph_name=f"hotel_{workflow_type}",
        initial_state=context,
        stream_emitter=get_stream_emitter()
    )
```

**Hospital Subagent Example**:

```python
# /agents/hospital-specialist.md (extended)

@tool("execute_hospital_workflow", "Execute hospital-specific workflow", {
    "workflow_type": str,  # "admissions" | "discharge" | "order_fulfillment"
    "context": dict
})
async def execute_hospital_workflow(args):
    """
    Hospital subagent tool that delegates to LangGraph state machine.

    Example:
        User: "Process new admission for patient with sepsis orders"

        Subagent:
        1. Validates patient information
        2. Determines workflow type: "admissions"
        3. Includes clinical context (sepsis protocol)
        4. Invokes LangGraph: hospital_admissions_graph
        5. Streams progress with approval gates
    """
    workflow_type = args["workflow_type"]
    context = args["context"]

    return await invoke_langgraph_workflow(
        graph_name=f"hospital_{workflow_type}",
        initial_state=context,
        stream_emitter=get_stream_emitter()
    )
```

---

### Layer 2: LangGraph Workflows (Determinism)

**Responsibility**: Deterministic state machines with approval gates, retry logic, audit trails

#### Hotel O2C Workflow Graph

**File**: `services/workflows/src/graphs/hotel/o2c_graph.py`

```python
from langgraph.graph import StateGraph, END
from typing import TypedDict, Annotated
from pydantic import BaseModel

# ============================================================================
# STATE DEFINITION
# ============================================================================

class HotelO2CState(TypedDict):
    """State for Hotel Order-to-Cash workflow"""
    reservation_id: str
    guest_name: str
    room_number: str
    check_in_date: str
    check_out_date: str

    # Progress tracking
    current_step: str
    steps_completed: list[str]

    # Created documents
    folio_id: str | None
    invoice_id: str | None
    payment_id: str | None

    # Error handling
    errors: list[dict]
    retry_count: int

    # Approval tracking
    pending_approval: bool
    approval_result: str | None  # "approved" | "rejected"

# ============================================================================
# NODE FUNCTIONS
# ============================================================================

async def check_in_guest(state: HotelO2CState) -> HotelO2CState:
    """
    Node: Check in guest and create folio
    """
    print(f"[O2C] Step 1/4: Checking in guest {state['guest_name']}")

    try:
        # Call common tool: update_doc (requires approval)
        reservation = await get_doc("Reservation", state["reservation_id"])

        # Request approval for check-in
        state["pending_approval"] = True
        approval = await request_approval(
            operation="check_in_guest",
            details={
                "guest": state["guest_name"],
                "room": state["room_number"],
                "reservation": state["reservation_id"]
            }
        )
        state["pending_approval"] = False
        state["approval_result"] = approval["decision"]

        if approval["decision"] == "rejected":
            state["errors"].append({"step": "check_in", "reason": "User rejected"})
            return state

        # Update reservation status
        await update_doc("Reservation", state["reservation_id"], {
            "status": "Checked In",
            "actual_check_in": datetime.now()
        })

        # Create folio
        folio = await create_doc("Folio", {
            "reservation": state["reservation_id"],
            "guest_name": state["guest_name"],
            "room_number": state["room_number"],
            "status": "Open"
        })

        state["folio_id"] = folio["name"]
        state["steps_completed"].append("check_in")
        state["current_step"] = "add_charges"

    except Exception as e:
        state["errors"].append({"step": "check_in", "error": str(e)})
        state["retry_count"] += 1

    return state

async def add_room_charges(state: HotelO2CState) -> HotelO2CState:
    """
    Node: Add room charges to folio
    """
    print(f"[O2C] Step 2/4: Adding charges to folio {state['folio_id']}")

    try:
        # Calculate room charges
        nights = calculate_nights(state["check_in_date"], state["check_out_date"])
        reservation = await get_doc("Reservation", state["reservation_id"])
        room_rate = reservation["room_rate"]
        total_charges = nights * room_rate

        # Add charges to folio
        await update_doc("Folio", state["folio_id"], {
            "room_charges": total_charges,
            "tax": total_charges * 0.1,  # 10% tax
            "total": total_charges * 1.1
        })

        state["steps_completed"].append("add_charges")
        state["current_step"] = "check_out"

    except Exception as e:
        state["errors"].append({"step": "add_charges", "error": str(e)})
        state["retry_count"] += 1

    return state

async def check_out_guest(state: HotelO2CState) -> HotelO2CState:
    """
    Node: Check out guest
    """
    print(f"[O2C] Step 3/4: Checking out guest {state['guest_name']}")

    try:
        # Request approval for check-out
        state["pending_approval"] = True
        approval = await request_approval(
            operation="check_out_guest",
            details={
                "guest": state["guest_name"],
                "folio": state["folio_id"],
                "total_amount": (await get_doc("Folio", state["folio_id"]))["total"]
            }
        )
        state["pending_approval"] = False
        state["approval_result"] = approval["decision"]

        if approval["decision"] == "rejected":
            state["errors"].append({"step": "check_out", "reason": "User rejected"})
            return state

        # Update reservation and room status
        await update_doc("Reservation", state["reservation_id"], {
            "status": "Checked Out",
            "actual_check_out": datetime.now()
        })

        await update_doc("Room", state["room_number"], {
            "status": "Available"
        })

        state["steps_completed"].append("check_out")
        state["current_step"] = "generate_invoice"

    except Exception as e:
        state["errors"].append({"step": "check_out", "error": str(e)})
        state["retry_count"] += 1

    return state

async def generate_invoice(state: HotelO2CState) -> HotelO2CState:
    """
    Node: Generate invoice from folio
    """
    print(f"[O2C] Step 4/4: Generating invoice")

    try:
        folio = await get_doc("Folio", state["folio_id"])

        # Request approval for invoice creation (high-risk: financial doc)
        state["pending_approval"] = True
        approval = await request_approval(
            operation="create_invoice",
            details={
                "customer": state["guest_name"],
                "amount": folio["total"],
                "folio": state["folio_id"]
            }
        )
        state["pending_approval"] = False
        state["approval_result"] = approval["decision"]

        if approval["decision"] == "rejected":
            state["errors"].append({"step": "invoice", "reason": "User rejected"})
            return state

        # Create invoice
        invoice = await create_doc("Invoice", {
            "customer": state["guest_name"],
            "folio": state["folio_id"],
            "items": [
                {
                    "item_name": "Room Charges",
                    "amount": folio["room_charges"]
                },
                {
                    "item_name": "Tax",
                    "amount": folio["tax"]
                }
            ],
            "grand_total": folio["total"]
        })

        state["invoice_id"] = invoice["name"]
        state["steps_completed"].append("generate_invoice")
        state["current_step"] = "complete"

    except Exception as e:
        state["errors"].append({"step": "invoice", "error": str(e)})
        state["retry_count"] += 1

    return state

# ============================================================================
# CONDITIONAL EDGES
# ============================================================================

def should_retry(state: HotelO2CState) -> str:
    """
    Decide if we should retry failed step or abort.
    """
    if state["errors"] and state["retry_count"] < 3:
        return "retry"
    elif state["errors"] and state["retry_count"] >= 3:
        return "abort"
    else:
        return "continue"

def is_approved(state: HotelO2CState) -> str:
    """
    Check if approval was granted.
    """
    if state["approval_result"] == "rejected":
        return "rejected"
    else:
        return "approved"

# ============================================================================
# GRAPH DEFINITION
# ============================================================================

def create_hotel_o2c_graph() -> StateGraph:
    """
    Creates Hotel Order-to-Cash workflow graph.

    Flow:
        START
          ↓
        check_in_guest ──(approval)──→ [WAIT FOR APPROVAL]
          ↓ (approved)
        add_room_charges
          ↓
        check_out_guest ──(approval)──→ [WAIT FOR APPROVAL]
          ↓ (approved)
        generate_invoice ──(approval)──→ [WAIT FOR APPROVAL]
          ↓ (approved)
        END
    """

    workflow = StateGraph(HotelO2CState)

    # Add nodes
    workflow.add_node("check_in", check_in_guest)
    workflow.add_node("add_charges", add_room_charges)
    workflow.add_node("check_out", check_out_guest)
    workflow.add_node("invoice", generate_invoice)

    # Define edges
    workflow.set_entry_point("check_in")

    workflow.add_conditional_edges(
        "check_in",
        is_approved,
        {
            "approved": "add_charges",
            "rejected": END
        }
    )

    workflow.add_edge("add_charges", "check_out")

    workflow.add_conditional_edges(
        "check_out",
        is_approved,
        {
            "approved": "invoice",
            "rejected": END
        }
    )

    workflow.add_conditional_edges(
        "invoice",
        is_approved,
        {
            "approved": END,
            "rejected": END
        }
    )

    return workflow.compile()

# ============================================================================
# STREAMING EXECUTION
# ============================================================================

async def execute_hotel_o2c_workflow(
    initial_state: HotelO2CState,
    stream_emitter
) -> HotelO2CState:
    """
    Execute Hotel O2C workflow with streaming progress.
    """
    graph = create_hotel_o2c_graph()

    # Stream each state transition
    async for state in graph.astream(initial_state):
        # Emit progress to frontend
        await stream_emitter.emit({
            "type": "workflow_progress",
            "workflow": "hotel_o2c",
            "current_step": state["current_step"],
            "steps_completed": state["steps_completed"],
            "pending_approval": state["pending_approval"]
        })

    return state
```

---

#### Hospital Admissions Workflow Graph

**File**: `services/workflows/src/graphs/hospital/admissions_graph.py`

```python
from langgraph.graph import StateGraph, END
from typing import TypedDict

class HospitalAdmissionsState(TypedDict):
    """State for Hospital Admissions workflow"""
    patient_id: str
    patient_name: str
    admission_date: str
    primary_diagnosis: str
    clinical_protocol: str | None  # e.g., "sepsis_protocol"

    # Progress
    current_step: str
    steps_completed: list[str]

    # Created documents
    appointment_id: str | None
    encounter_id: str | None
    order_set_ids: list[str]
    invoice_id: str | None

    # Approval tracking
    pending_approval: bool
    approval_result: str | None

    # Error handling
    errors: list[dict]
    retry_count: int

# ============================================================================
# NODE FUNCTIONS
# ============================================================================

async def create_patient_record(state: HospitalAdmissionsState):
    """Node: Create or verify patient record"""
    print(f"[Admissions] Step 1/5: Creating patient record")

    try:
        # Check if patient exists
        existing = await search_doc("Patient", {"patient_name": state["patient_name"]})

        if existing:
            state["patient_id"] = existing[0]["name"]
        else:
            # Request approval (new patient creation)
            state["pending_approval"] = True
            approval = await request_approval(
                operation="create_patient",
                details={"patient_name": state["patient_name"]}
            )
            state["pending_approval"] = False

            if approval["decision"] == "rejected":
                state["errors"].append({"step": "create_patient", "reason": "Rejected"})
                return state

            patient = await create_doc("Patient", {
                "patient_name": state["patient_name"],
                "admission_date": state["admission_date"]
            })
            state["patient_id"] = patient["name"]

        state["steps_completed"].append("create_patient")
        state["current_step"] = "schedule_appointment"

    except Exception as e:
        state["errors"].append({"step": "create_patient", "error": str(e)})
        state["retry_count"] += 1

    return state

async def schedule_appointment(state: HospitalAdmissionsState):
    """Node: Schedule initial appointment"""
    print(f"[Admissions] Step 2/5: Scheduling appointment")

    try:
        # Create appointment
        appointment = await create_doc("Appointment", {
            "patient": state["patient_id"],
            "appointment_date": state["admission_date"],
            "appointment_type": "Initial Admission",
            "status": "Scheduled"
        })

        state["appointment_id"] = appointment["name"]
        state["steps_completed"].append("schedule_appointment")
        state["current_step"] = "create_clinical_orders"

    except Exception as e:
        state["errors"].append({"step": "schedule_appointment", "error": str(e)})
        state["retry_count"] += 1

    return state

async def create_clinical_orders(state: HospitalAdmissionsState):
    """Node: Create clinical order set if protocol specified"""
    print(f"[Admissions] Step 3/5: Creating clinical orders")

    if not state.get("clinical_protocol"):
        # Skip if no protocol
        state["current_step"] = "create_encounter"
        return state

    try:
        # Request approval (clinical orders are high-risk)
        protocol = state["clinical_protocol"]
        order_preview = await get_order_set_preview(protocol)

        state["pending_approval"] = True
        approval = await request_approval(
            operation="create_order_set",
            details={
                "patient": state["patient_name"],
                "protocol": protocol,
                "orders": order_preview
            }
        )
        state["pending_approval"] = False

        if approval["decision"] == "rejected":
            state["errors"].append({"step": "clinical_orders", "reason": "Rejected"})
            return state

        # Create order set
        order_set = await create_order_set(
            protocol=protocol,
            patient_id=state["patient_id"]
        )

        state["order_set_ids"] = order_set["order_ids"]
        state["steps_completed"].append("create_clinical_orders")
        state["current_step"] = "create_encounter"

    except Exception as e:
        state["errors"].append({"step": "clinical_orders", "error": str(e)})
        state["retry_count"] += 1

    return state

async def create_encounter(state: HospitalAdmissionsState):
    """Node: Create clinical encounter"""
    print(f"[Admissions] Step 4/5: Creating encounter")

    try:
        encounter = await create_doc("Encounter", {
            "patient": state["patient_id"],
            "appointment": state["appointment_id"],
            "primary_diagnosis": state["primary_diagnosis"],
            "encounter_date": state["admission_date"],
            "status": "In Progress"
        })

        state["encounter_id"] = encounter["name"]
        state["steps_completed"].append("create_encounter")
        state["current_step"] = "generate_invoice"

    except Exception as e:
        state["errors"].append({"step": "create_encounter", "error": str(e)})
        state["retry_count"] += 1

    return state

async def generate_invoice(state: HospitalAdmissionsState):
    """Node: Generate invoice for services"""
    print(f"[Admissions] Step 5/5: Generating invoice")

    try:
        # Calculate charges
        charges = await calculate_admission_charges(
            encounter_id=state["encounter_id"],
            order_set_ids=state["order_set_ids"]
        )

        # Request approval (financial document)
        state["pending_approval"] = True
        approval = await request_approval(
            operation="create_invoice",
            details={
                "patient": state["patient_name"],
                "total_amount": charges["total"],
                "items": charges["items"]
            }
        )
        state["pending_approval"] = False

        if approval["decision"] == "rejected":
            state["errors"].append({"step": "invoice", "reason": "Rejected"})
            return state

        invoice = await create_doc("Invoice", {
            "patient": state["patient_id"],
            "encounter": state["encounter_id"],
            "items": charges["items"],
            "grand_total": charges["total"]
        })

        state["invoice_id"] = invoice["name"]
        state["steps_completed"].append("generate_invoice")
        state["current_step"] = "complete"

    except Exception as e:
        state["errors"].append({"step": "invoice", "error": str(e)})
        state["retry_count"] += 1

    return state

# ============================================================================
# GRAPH DEFINITION
# ============================================================================

def create_hospital_admissions_graph() -> StateGraph:
    """
    Creates Hospital Admissions workflow graph.

    Flow:
        START
          ↓
        create_patient_record ──(approval if new)──→ [WAIT]
          ↓
        schedule_appointment
          ↓
        create_clinical_orders ──(approval)──→ [WAIT]
          ↓
        create_encounter
          ↓
        generate_invoice ──(approval)──→ [WAIT]
          ↓
        END
    """

    workflow = StateGraph(HospitalAdmissionsState)

    workflow.add_node("create_patient", create_patient_record)
    workflow.add_node("schedule", schedule_appointment)
    workflow.add_node("orders", create_clinical_orders)
    workflow.add_node("encounter", create_encounter)
    workflow.add_node("invoice", generate_invoice)

    workflow.set_entry_point("create_patient")
    workflow.add_edge("create_patient", "schedule")
    workflow.add_edge("schedule", "orders")
    workflow.add_edge("orders", "encounter")
    workflow.add_edge("encounter", "invoice")
    workflow.add_edge("invoice", END)

    return workflow.compile()
```

---

## Integration Pattern: Agent SDK ↔ LangGraph

### Unified Workflow Invocation Tool

**File**: `services/agent-gateway/src/tools/workflow_executor.py`

```python
from claude_agent_sdk import tool

@tool("execute_workflow_graph", "Execute industry-specific LangGraph workflow", {
    "graph_name": str,  # "hotel_o2c" | "hospital_admissions" | etc.
    "initial_state": dict
})
async def execute_workflow_graph(args):
    """
    Common tool that Claude Agent SDK subagents use to invoke LangGraph workflows.

    This is the bridge between:
    - Claude Agent SDK (intelligence layer)
    - LangGraph (deterministic state machine layer)

    Usage by Hotel Subagent:
        await execute_workflow_graph({
            "graph_name": "hotel_o2c",
            "initial_state": {
                "reservation_id": "RES-001",
                "guest_name": "John Doe",
                ...
            }
        })

    Usage by Hospital Subagent:
        await execute_workflow_graph({
            "graph_name": "hospital_admissions",
            "initial_state": {
                "patient_name": "Jane Smith",
                "clinical_protocol": "sepsis_protocol",
                ...
            }
        })
    """
    graph_name = args["graph_name"]
    initial_state = args["initial_state"]

    # Load graph from registry
    graph_module = import_graph(graph_name)
    graph = graph_module.create_graph()

    # Execute with streaming
    stream_emitter = get_stream_emitter()

    results = []
    async for state in graph.astream(initial_state):
        # Emit progress
        await stream_emitter.emit({
            "type": "workflow_progress",
            "graph": graph_name,
            "state": state
        })
        results.append(state)

    final_state = results[-1]

    return {
        "graph": graph_name,
        "final_state": final_state,
        "steps_completed": final_state["steps_completed"],
        "errors": final_state.get("errors", [])
    }

# ============================================================================
# GRAPH REGISTRY
# ============================================================================

GRAPH_REGISTRY = {
    "hotel_o2c": "services.workflows.graphs.hotel.o2c_graph",
    "hotel_cancellation": "services.workflows.graphs.hotel.cancellation_graph",
    "hospital_admissions": "services.workflows.graphs.hospital.admissions_graph",
    "hospital_discharge": "services.workflows.graphs.hospital.discharge_graph",
    "manufacturing_mto": "services.workflows.graphs.manufacturing.mto_graph",
    "retail_ecommerce": "services.workflows.graphs.retail.ecommerce_graph",
    # Add more as needed
}

def import_graph(graph_name: str):
    """Dynamically import graph module"""
    module_path = GRAPH_REGISTRY.get(graph_name)
    if not module_path:
        raise ValueError(f"Unknown graph: {graph_name}")

    return importlib.import_module(module_path)
```

---

## Complete Flow Example

### User Request → Orchestrator → Subagent → LangGraph

```python
# ============================================================================
# USER REQUEST
# ============================================================================

User: "Check in guest John Doe from reservation RES-001 and create invoice"

# ============================================================================
# STEP 1: Orchestrator classifies request
# ============================================================================

orchestrator.classify_request(
    request="Check in guest John Doe from reservation RES-001 and create invoice",
    current_doctype="Reservation"
)
→ Result: {
    "industry": "hotel",
    "complexity": "multi_step",  # Multi-step workflow
    "requires_subagents": ["hotel"]
}

# ============================================================================
# STEP 2: Orchestrator delegates to Hotel Subagent
# ============================================================================

orchestrator.invoke_subagent(
    subagent="hotel",
    task="Check in guest John Doe from reservation RES-001 and create invoice",
    context={"reservation_id": "RES-001"}
)

# ============================================================================
# STEP 3: Hotel Subagent analyzes and invokes workflow
# ============================================================================

hotel_subagent decides:
- This is a complete O2C workflow (check-in → charges → check-out → invoice)
- Needs deterministic state machine (LangGraph)
- Invokes: execute_workflow_graph

hotel_subagent.execute_workflow_graph({
    "graph_name": "hotel_o2c",
    "initial_state": {
        "reservation_id": "RES-001",
        "guest_name": "John Doe",
        "room_number": "101",
        "check_in_date": "2025-10-01",
        "check_out_date": "2025-10-02"
    }
})

# ============================================================================
# STEP 4: LangGraph executes state machine
# ============================================================================

hotel_o2c_graph.astream(initial_state):

    Node: check_in_guest
    ├─ Request approval: "Check in John Doe to Room 101"
    ├─ User approves ✓
    ├─ Update reservation status
    ├─ Create folio FO-001
    └─ Emit: {"current_step": "check_in", "folio_id": "FO-001"}

    Node: add_room_charges
    ├─ Calculate charges ($150/night × 1 night = $150)
    ├─ Add tax (10% = $15)
    ├─ Update folio total: $165
    └─ Emit: {"current_step": "add_charges", "total": 165}

    Node: check_out_guest
    ├─ Request approval: "Check out John Doe, total $165"
    ├─ User approves ✓
    ├─ Update reservation status
    ├─ Update room status to "Available"
    └─ Emit: {"current_step": "check_out"}

    Node: generate_invoice
    ├─ Request approval: "Create invoice for $165"
    ├─ User approves ✓
    ├─ Create invoice INV-001
    └─ Emit: {"current_step": "complete", "invoice_id": "INV-001"}

# ============================================================================
# STEP 5: Results streamed back to user
# ============================================================================

Frontend receives:
[workflow_progress] Step 1/4: Checking in guest...
[approval_required] Check in John Doe to Room 101? [Approve] [Reject]
[approval_received] Approved ✓
[workflow_progress] Step 2/4: Adding charges ($165)...
[workflow_progress] Step 3/4: Checking out guest...
[approval_required] Check out John Doe? Total: $165 [Approve] [Reject]
[approval_received] Approved ✓
[workflow_progress] Step 4/4: Generating invoice...
[approval_required] Create invoice INV-001 for $165? [Approve] [Reject]
[approval_received] Approved ✓
[workflow_complete] ✓ Order-to-Cash workflow complete
                     Folio: FO-001
                     Invoice: INV-001
```

---

## Benefits of Hybrid Architecture

| Aspect | Claude Agent SDK Alone | LangGraph Alone | **Hybrid (Best of Both)** |
|--------|------------------------|-----------------|---------------------------|
| **Intent Understanding** | ✅ Excellent | ❌ None | ✅ SDK handles |
| **Routing** | ✅ Smart routing | ❌ Manual | ✅ SDK handles |
| **Workflow Determinism** | ❌ Non-deterministic | ✅ State machine | ✅ LangGraph handles |
| **Approval Gates** | ✅ Built-in hooks | ⚠️ Manual | ✅ LangGraph + SDK hooks |
| **Retry Logic** | ⚠️ Basic | ✅ Sophisticated | ✅ LangGraph handles |
| **Audit Trail** | ⚠️ Basic logging | ✅ State persistence | ✅ LangGraph handles |
| **Industry Modularity** | ✅ MCP servers | ❌ Monolithic | ✅ SDK + per-industry graphs |
| **Testing** | ⚠️ Hard to test | ✅ Deterministic tests | ✅ Testable workflows |

---

## Project Structure

```
services/
├── agent-gateway/              # Claude Agent SDK layer
│   └── src/
│       ├── orchestrator.py     # Master agent
│       ├── subagent_loader.py  # Loads agent configs
│       └── tools/
│           └── workflow_executor.py  # Bridge to LangGraph
│
└── workflows/                  # LangGraph layer
    └── src/
        └── graphs/
            ├── hotel/
            │   ├── o2c_graph.py              # O2C workflow
            │   └── cancellation_graph.py     # Cancellation workflow
            ├── hospital/
            │   ├── admissions_graph.py       # Admissions workflow
            │   └── discharge_graph.py        # Discharge workflow
            ├── manufacturing/
            │   └── mto_graph.py              # Make-to-Order workflow
            └── retail/
                └── ecommerce_graph.py        # E-commerce workflow

agents/                         # Subagent configurations
├── orchestrator.md
├── hotel-specialist.md         # Includes execute_hotel_workflow tool
├── hospital-specialist.md      # Includes execute_hospital_workflow tool
├── manufacturing-specialist.md
├── retail-specialist.md
└── education-specialist.md
```

---

## Migration Strategy

### Phase 1: Core Infrastructure (Week 1)
1. ✅ Create `execute_workflow_graph` tool
2. ✅ Create graph registry
3. ✅ Add workflow invocation to subagent configs

### Phase 2: Reference Workflows (Week 2)
1. ✅ Implement `hotel_o2c_graph`
2. ✅ Implement `hospital_admissions_graph`
3. ✅ Test approval gates and streaming

### Phase 3: Additional Workflows (Week 3)
1. Manufacturing MTO workflow
2. Retail e-commerce workflow
3. Education admissions workflow

### Phase 4: Optimization (Week 4)
1. Workflow retry strategies
2. State persistence (Redis/PostgreSQL)
3. Performance benchmarking

---

## Conclusion

**Hybrid Architecture Solves the Problem**:

✅ **One Common Tool** (`execute_workflow_graph`) that works for all industries
✅ **Industry-Specific Graphs** - Each industry has tailored state machines
✅ **Intelligence Layer** - Claude Agent SDK understands intent and routes
✅ **Deterministic Execution** - LangGraph ensures repeatable workflows
✅ **Approval Gates** - Built into graph nodes with streaming
✅ **Audit Trails** - State transitions logged automatically
✅ **Testable** - LangGraph workflows are unit-testable
✅ **Maintainable** - Clear separation of concerns

**Best of Both Worlds**: Claude Agent SDK for intelligence + LangGraph for determinism! 🎉

---

**Next Steps**:
1. Review architecture
2. Create first workflow graph (hotel_o2c)
3. Test integration with subagent
4. Measure performance vs targets