"""
Hotel Order-to-Cash (O2C) Workflow Graph

Implements: Check-in → Folio → Charges → Check-out → Invoice
Following LangGraph best practices with interrupt() for approval gates

Implementation of T087
"""

from typing import TypedDict, Literal
from langgraph.graph import StateGraph, START, END
from langgraph.types import interrupt, Command
from langgraph.checkpoint.memory import InMemorySaver


# State definition using TypedDict (LangGraph best practice)
class HotelO2CState(TypedDict):
    """State for Hotel Order-to-Cash workflow"""
    # Input parameters
    reservation_id: str
    guest_name: str
    room_number: str
    check_in_date: str
    check_out_date: str

    # Created entities
    folio_id: str | None
    invoice_id: str | None

    # Workflow tracking
    current_step: str
    steps_completed: list[str]
    errors: list[dict]

    # Approval tracking
    pending_approval: bool
    approval_decision: str | None


# Node 1: Check-in Guest (with approval gate)
async def check_in_guest(state: HotelO2CState) -> Command[Literal["create_folio", "workflow_rejected"]]:
    """
    Check in guest - REQUIRES APPROVAL

    Uses LangGraph interrupt() to pause for human approval
    Returns Command(goto=...) for conditional routing
    """
    # Request approval using LangGraph interrupt()
    decision = interrupt({
        "operation": "check_in_guest",
        "operation_type": "hotel_check_in",
        "details": {
            "guest_name": state["guest_name"],
            "room_number": state["room_number"],
            "check_in_date": state["check_in_date"],
            "check_out_date": state["check_out_date"],
            "reservation_id": state["reservation_id"]
        },
        "preview": f"""Check-in Details:
        - Guest: {state['guest_name']}
        - Room: {state['room_number']}
        - Check-in: {state['check_in_date']}
        - Check-out: {state['check_out_date']}
        """,
        "action": "Please approve guest check-in",
        "risk_level": "medium"
    })

    if decision == "approve":
        # Perform actual check-in via Frappe API
        # This would call: await update_doc("Reservation", state["reservation_id"], {"status": "Checked In"})
        print(f"✅ Checking in guest: {state['guest_name']}")

        return Command(
            goto="create_folio",
            update={
                "steps_completed": state["steps_completed"] + ["check_in"],
                "current_step": "create_folio",
                "approval_decision": "approved",
                "pending_approval": False
            }
        )
    else:
        print(f"❌ Check-in rejected for guest: {state['guest_name']}")

        return Command(
            goto="workflow_rejected",
            update={
                "errors": state["errors"] + [{
                    "step": "check_in",
                    "reason": "User rejected check-in"
                }],
                "approval_decision": "rejected",
                "pending_approval": False
            }
        )


# Node 2: Create Folio (no approval needed)
async def create_folio(state: HotelO2CState) -> HotelO2CState:
    """
    Create guest folio

    No approval required - automatic step
    """
    # Create folio via Frappe API
    # This would call: folio = await create_doc("Folio", {...})
    folio_id = f"FO-{state['reservation_id']}"

    print(f"📋 Creating folio: {folio_id}")

    return {
        **state,
        "folio_id": folio_id,
        "steps_completed": state["steps_completed"] + ["create_folio"],
        "current_step": "add_charges"
    }


# Node 3: Add Room Charges (no approval needed)
async def add_charges(state: HotelO2CState) -> HotelO2CState:
    """
    Add room charges to folio

    Calculates charges based on room rate and duration
    """
    # Calculate charges
    # This would fetch room rate and calculate total
    room_rate = 150.00  # Placeholder
    nights = 1  # Placeholder - would be calculated from dates
    total_charges = room_rate * nights
    tax = total_charges * 0.10
    grand_total = total_charges + tax

    print(f"💰 Adding charges to folio: ${grand_total:.2f}")

    return {
        **state,
        "steps_completed": state["steps_completed"] + ["add_charges"],
        "current_step": "check_out_guest"
    }


# Node 4: Check-out Guest (no approval needed)
async def check_out_guest(state: HotelO2CState) -> HotelO2CState:
    """
    Check out guest

    Updates reservation status and room availability
    """
    # Update reservation status
    # This would call: await update_doc("Reservation", state["reservation_id"], {"status": "Checked Out"})
    print(f"🚪 Checking out guest: {state['guest_name']}")

    # Update room status to available
    # This would call: await update_doc("Room", state["room_number"], {"status": "Available"})

    return {
        **state,
        "steps_completed": state["steps_completed"] + ["check_out"],
        "current_step": "generate_invoice"
    }


# Node 5: Generate Invoice (with approval gate)
async def generate_invoice(state: HotelO2CState) -> Command[Literal["workflow_completed", "workflow_rejected"]]:
    """
    Generate invoice - REQUIRES APPROVAL

    Final approval before creating financial document
    """
    # Calculate invoice totals
    room_rate = 150.00
    tax = 15.00
    grand_total = 165.00

    decision = interrupt({
        "operation": "generate_invoice",
        "operation_type": "hotel_invoice",
        "details": {
            "guest_name": state["guest_name"],
            "folio_id": state["folio_id"],
            "room_number": state["room_number"],
            "room_rate": room_rate,
            "tax": tax,
            "grand_total": grand_total
        },
        "preview": f"""Invoice Details:
        - Guest: {state['guest_name']}
        - Folio: {state['folio_id']}
        - Room Rate: ${room_rate:.2f}
        - Tax: ${tax:.2f}
        - Grand Total: ${grand_total:.2f}
        """,
        "action": "Please approve invoice generation",
        "risk_level": "high"
    })

    if decision == "approve":
        # Create invoice via Frappe API
        # This would call: invoice = await create_doc("Sales Invoice", {...})
        invoice_id = f"INV-{state['reservation_id']}"

        print(f"🧾 Generating invoice: {invoice_id}")

        return Command(
            goto="workflow_completed",
            update={
                "invoice_id": invoice_id,
                "steps_completed": state["steps_completed"] + ["generate_invoice"],
                "current_step": "completed",
                "approval_decision": "approved",
                "pending_approval": False
            }
        )
    else:
        print(f"❌ Invoice generation rejected")

        return Command(
            goto="workflow_rejected",
            update={
                "errors": state["errors"] + [{
                    "step": "generate_invoice",
                    "reason": "User rejected invoice"
                }],
                "approval_decision": "rejected",
                "pending_approval": False
            }
        )


# Terminal Node: Workflow Completed
async def workflow_completed(state: HotelO2CState) -> HotelO2CState:
    """
    Workflow completed successfully

    All steps executed, invoice generated
    """
    print(f"✅ Hotel O2C workflow completed successfully")
    print(f"   - Reservation: {state['reservation_id']}")
    print(f"   - Folio: {state['folio_id']}")
    print(f"   - Invoice: {state['invoice_id']}")

    return {
        **state,
        "current_step": "completed"
    }


# Terminal Node: Workflow Rejected
async def workflow_rejected(state: HotelO2CState) -> HotelO2CState:
    """
    Workflow rejected by user

    One or more approval gates were rejected
    """
    print(f"❌ Hotel O2C workflow rejected")
    print(f"   - Errors: {state['errors']}")

    return {
        **state,
        "current_step": "rejected"
    }


# Graph Builder Function
def create_graph() -> StateGraph:
    """
    Create Hotel O2C workflow graph

    Returns compiled StateGraph ready for execution
    This function is called by the workflow registry
    """
    # Initialize StateGraph with state schema
    builder = StateGraph(HotelO2CState)

    # Add nodes (order doesn't matter for execution, only for clarity)
    builder.add_node("check_in_guest", check_in_guest)
    builder.add_node("create_folio", create_folio)
    builder.add_node("add_charges", add_charges)
    builder.add_node("check_out_guest", check_out_guest)
    builder.add_node("generate_invoice", generate_invoice)
    builder.add_node("workflow_completed", workflow_completed)
    builder.add_node("workflow_rejected", workflow_rejected)

    # Define edges (workflow flow)
    builder.add_edge(START, "check_in_guest")
    # check_in_guest uses Command(goto=...) - no edge definition needed
    builder.add_edge("create_folio", "add_charges")
    builder.add_edge("add_charges", "check_out_guest")
    builder.add_edge("check_out_guest", "generate_invoice")
    # generate_invoice uses Command(goto=...) - no edge definition needed
    builder.add_edge("workflow_completed", END)
    builder.add_edge("workflow_rejected", END)

    # Set up checkpointer for interrupt/resume support
    # In production, use PostgresSaver for persistence
    checkpointer = InMemorySaver()

    # Compile the graph
    return builder.compile(checkpointer=checkpointer)


# Convenience function for testing
async def test_workflow():
    """Test the Hotel O2C workflow"""
    import uuid

    graph = create_graph()

    initial_state: HotelO2CState = {
        "reservation_id": "RES-001",
        "guest_name": "John Doe",
        "room_number": "101",
        "check_in_date": "2025-10-01",
        "check_out_date": "2025-10-02",
        "folio_id": None,
        "invoice_id": None,
        "current_step": "start",
        "steps_completed": [],
        "errors": [],
        "pending_approval": False,
        "approval_decision": None
    }

    config = {"configurable": {"thread_id": str(uuid.uuid4())}}

    print("\n" + "="*60)
    print("HOTEL O2C WORKFLOW TEST")
    print("="*60 + "\n")

    # Run until first interrupt
    result = await graph.ainvoke(initial_state, config)

    print(f"\n⏸️  Workflow paused for approval")
    print(f"   Interrupt: {result.get('__interrupt__')}")

    # Simulate approval
    print(f"\n👤 User approves check-in")
    result = await graph.ainvoke(Command(resume="approve"), config)

    # Continue until next interrupt (invoice)
    print(f"\n⏸️  Workflow paused for invoice approval")
    print(f"   Interrupt: {result.get('__interrupt__')}")

    # Simulate approval
    print(f"\n👤 User approves invoice")
    final_result = await graph.ainvoke(Command(resume="approve"), config)

    print(f"\n" + "="*60)
    print("FINAL STATE:")
    print("="*60)
    print(f"Steps completed: {final_result['steps_completed']}")
    print(f"Folio ID: {final_result['folio_id']}")
    print(f"Invoice ID: {final_result['invoice_id']}")
    print(f"Current step: {final_result['current_step']}")

    return final_result


# Export for workflow registry
__all__ = ["create_graph", "HotelO2CState", "test_workflow"]


if __name__ == "__main__":
    # Run test if executed directly
    import asyncio
    asyncio.run(test_workflow())
