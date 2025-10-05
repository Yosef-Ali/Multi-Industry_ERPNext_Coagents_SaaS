"""
Hospital Admissions Workflow Graph

Implements: Patient Record → Admission → Clinical Orders → Encounter → Invoice
Following LangGraph best practices with interrupt() for approval gates

CRITICAL: Clinical orders require approval for patient safety

Implementation of T088
"""

from typing import Literal

from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.types import Command, interrupt

from core.state import HospitalAdmissionsState, create_base_state


# Node 1: Create Patient Record (no approval - administrative)
async def create_patient_record(state: HospitalAdmissionsState) -> HospitalAdmissionsState:
    """
    Create patient record

    No approval required - administrative task
    """
    # Create patient via Frappe API
    # This would call: patient = await create_doc("Patient", {"patient_name": state["patient_name"]})
    patient_id = f"PAT-{state['patient_name'].replace(' ', '-')[:10]}"

    print(f"👤 Creating patient record: {patient_id}")

    return {
        **state,
        "patient_id": patient_id,
        "steps_completed": state.get("steps_completed", []) + ["create_patient"],
        "current_step": "schedule_admission"
    }


# Node 2: Schedule Admission Appointment (no approval)
async def schedule_admission(state: HospitalAdmissionsState) -> HospitalAdmissionsState:
    """
    Schedule admission appointment

    No approval required - scheduling task
    """
    # Create appointment via Frappe API
    # This would call: appointment = await create_doc("Appointment", {...})
    appointment_id = f"APT-{state['patient_id']}-001"

    print(f"📅 Scheduling admission: {appointment_id}")

    return {
        **state,
        "appointment_id": appointment_id,
        "steps_completed": state.get("steps_completed", []) + ["schedule_admission"],
        "current_step": "create_order_set"
    }


# Node 3: Create Clinical Order Set (REQUIRES APPROVAL - PATIENT SAFETY)
async def create_order_set(state: HospitalAdmissionsState) -> Command[Literal["create_encounter", "workflow_rejected"]]:
    """
    Create clinical order set - REQUIRES APPROVAL

    CRITICAL: Clinical orders directly affect patient care
    Approval required for patient safety
    """
    protocol = state["clinical_protocol"] or "standard_admission"

    # Mock protocol orders (in production, would fetch from database)
    protocol_orders = get_protocol_orders(protocol, state["primary_diagnosis"])

    decision = interrupt({
        "operation": "create_order_set",
        "operation_type": "clinical_orders",
        "details": {
            "patient_id": state["patient_id"],
            "patient_name": state["patient_name"],
            "primary_diagnosis": state["primary_diagnosis"],
            "protocol": protocol,
            "orders": protocol_orders["orders"],
            "total_orders": protocol_orders["total_count"],
            "estimated_cost": protocol_orders["estimated_cost"]
        },
        "preview": f"""Clinical Order Set:

        Patient: {state['patient_name']} ({state['patient_id']})
        Diagnosis: {state['primary_diagnosis']}
        Protocol: {protocol}

        Lab Tests ({protocol_orders['lab_count']}):
        {chr(10).join(['  - ' + lab for lab in protocol_orders['labs']])}

        Medications ({protocol_orders['med_count']}):
        {chr(10).join(['  - ' + med for med in protocol_orders['meds']])}

        Procedures ({protocol_orders['proc_count']}):
        {chr(10).join(['  - ' + proc for proc in protocol_orders['procedures']])}

        Total Orders: {protocol_orders['total_count']}
        Estimated Cost: ${protocol_orders['estimated_cost']:.2f}
        """,
        "action": "⚠️ CRITICAL: Clinical orders require approval for patient safety",
        "risk_level": "high",
        "requires_physician_approval": True
    })

    if decision == "approve":
        # Create order set via Frappe API
        # This would call: order_set = await create_doc("Order Set", {...})
        order_set_id = f"OS-{state['patient_id']}-001"

        print(f"💊 Creating clinical order set: {order_set_id}")
        print(f"   - {protocol_orders['total_count']} orders")

        return Command(
            goto="create_encounter",
            update={
                "order_set_id": order_set_id,
                "steps_completed": state.get("steps_completed", []) + ["create_orders"],
                "current_step": "create_encounter",
                "approval_decision": "approved",
                "pending_approval": False,
            },
        )
    else:
        print(f"❌ Clinical orders rejected - patient safety concern")

        return Command(
            goto="workflow_rejected",
            update={
                "errors": state["errors"]
                + [
                    {
                        "step": "create_orders",
                        "reason": "Clinical orders rejected by physician",
                        "safety_critical": True,
                    }
                ],
                "approval_decision": "rejected",
                "pending_approval": False,
            },
        )


# Node 4: Create Encounter Documentation (no approval)
async def create_encounter(state: HospitalAdmissionsState) -> HospitalAdmissionsState:
    """
    Create encounter documentation

    Documents the clinical visit
    """
    # Create encounter via Frappe API
    # This would call: encounter = await create_doc("Encounter", {...})
    encounter_id = f"ENC-{state['patient_id']}-001"

    print(f"📋 Creating encounter: {encounter_id}")

    return {
        **state,
        "encounter_id": encounter_id,
        "steps_completed": state.get("steps_completed", []) + ["create_encounter"],
        "current_step": "generate_invoice",
    }


# Node 5: Generate Invoice (REQUIRES APPROVAL - FINANCIAL)
async def generate_invoice(state: HospitalAdmissionsState) -> Command[Literal["workflow_completed", "workflow_rejected"]]:
    """
    Generate invoice - REQUIRES APPROVAL

    Final financial document creation
    """
    # Calculate invoice totals (would come from charges/orders)
    admission_fee = 500.00
    lab_charges = 350.00
    medication_charges = 250.00
    procedure_charges = 400.00
    subtotal = admission_fee + lab_charges + medication_charges + procedure_charges
    tax = subtotal * 0.0  # Hospital services often tax-exempt
    grand_total = subtotal + tax

    decision = interrupt({
        "operation": "generate_invoice",
        "operation_type": "hospital_billing",
        "details": {
            "patient_id": state["patient_id"],
            "patient_name": state["patient_name"],
            "encounter_id": state["encounter_id"],
            "admission_fee": admission_fee,
            "lab_charges": lab_charges,
            "medication_charges": medication_charges,
            "procedure_charges": procedure_charges,
            "subtotal": subtotal,
            "tax": tax,
            "grand_total": grand_total
        },
        "preview": f"""Invoice Details:

        Patient: {state['patient_name']} ({state['patient_id']})
        Encounter: {state['encounter_id']}

        Charges:
          - Admission Fee:       ${admission_fee:>10.2f}
          - Lab Tests:           ${lab_charges:>10.2f}
          - Medications:         ${medication_charges:>10.2f}
          - Procedures:          ${procedure_charges:>10.2f}
          ─────────────────────────────────
          Subtotal:              ${subtotal:>10.2f}
          Tax:                   ${tax:>10.2f}
          ─────────────────────────────────
          Grand Total:           ${grand_total:>10.2f}
        """,
        "action": "Please approve invoice generation",
        "risk_level": "high"
    })

    if decision == "approve":
        # Create invoice via Frappe API
        # This would call: invoice = await create_doc("Sales Invoice", {...})
        invoice_id = f"INV-{state['patient_id']}-001"

        print(f"🧾 Generating invoice: {invoice_id}")

        return Command(
            goto="workflow_completed",
            update={
                "invoice_id": invoice_id,
                "steps_completed": state.get("steps_completed", []) + ["generate_invoice"],
                "current_step": "completed",
                "approval_decision": "approved",
                "pending_approval": False,
            },
        )
    else:
        print(f"❌ Invoice generation rejected")

        return Command(
            goto="workflow_rejected",
            update={
                "errors": state["errors"]
                + [
                    {
                        "step": "generate_invoice",
                        "reason": "Invoice rejected",
                    }
                ],
                "approval_decision": "rejected",
                "pending_approval": False,
            },
        )


# Terminal Node: Workflow Completed
async def workflow_completed(state: HospitalAdmissionsState) -> HospitalAdmissionsState:
    """
    Workflow completed successfully

    Patient admitted, orders created, encounter documented, invoice generated
    """
    print(f"✅ Hospital Admissions workflow completed successfully")
    print(f"   - Patient: {state['patient_id']}")
    print(f"   - Encounter: {state['encounter_id']}")
    print(f"   - Order Set: {state['order_set_id']}")
    print(f"   - Invoice: {state['invoice_id']}")

    return {**state, "current_step": "completed"}


# Terminal Node: Workflow Rejected
async def workflow_rejected(state: HospitalAdmissionsState) -> HospitalAdmissionsState:
    """
    Workflow rejected by user

    Critical approval gates were rejected
    """
    print(f"❌ Hospital Admissions workflow rejected")
    print(f"   - Errors: {state['errors']}")

    return {**state, "current_step": "rejected"}


# Helper function: Get protocol orders
def get_protocol_orders(protocol: str, diagnosis: str) -> dict:
    """
    Get clinical orders for a protocol

    In production, this would query the database for protocol definitions
    """
    protocols = {
        "sepsis_protocol": {
            "labs": [
                "CBC with differential",
                "Blood cultures x2 (aerobic + anaerobic)",
                "Lactate level",
                "Comprehensive metabolic panel"
            ],
            "meds": [
                "Ceftriaxone 2g IV q24h",
                "Azithromycin 500mg IV daily",
                "Normal saline 30mL/kg IV bolus"
            ],
            "procedures": [
                "Continuous vital signs monitoring",
                "Central line placement"
            ]
        },
        "pneumonia_protocol": {
            "labs": [
                "CBC with differential",
                "Blood cultures",
                "Chest X-ray"
            ],
            "meds": [
                "Azithromycin 500mg IV daily",
                "Ceftriaxone 1g IV q24h"
            ],
            "procedures": [
                "Oxygen therapy",
                "Pulse oximetry monitoring"
            ]
        },
        "standard_admission": {
            "labs": [
                "CBC",
                "Basic metabolic panel"
            ],
            "meds": [
                "As needed per condition"
            ],
            "procedures": [
                "Vital signs q4h"
            ]
        }
    }

    protocol_def = protocols.get(protocol, protocols["standard_admission"])

    return {
        "orders": (
            protocol_def["labs"] +
            protocol_def["meds"] +
            protocol_def["procedures"]
        ),
        "labs": protocol_def["labs"],
        "meds": protocol_def["meds"],
        "procedures": protocol_def["procedures"],
        "lab_count": len(protocol_def["labs"]),
        "med_count": len(protocol_def["meds"]),
        "proc_count": len(protocol_def["procedures"]),
        "total_count": (
            len(protocol_def["labs"]) +
            len(protocol_def["meds"]) +
            len(protocol_def["procedures"])
        ),
        "estimated_cost": 1500.00  # Placeholder
    }


# Graph Builder Function
def create_graph() -> StateGraph:
    """
    Create Hospital Admissions workflow graph

    Returns compiled StateGraph ready for execution
    This function is called by the workflow registry
    """
    # Initialize StateGraph with state schema
    builder = StateGraph(HospitalAdmissionsState)

    # Add nodes
    builder.add_node("create_patient", create_patient_record)
    builder.add_node("schedule_admission", schedule_admission)
    builder.add_node("create_order_set", create_order_set)
    builder.add_node("create_encounter", create_encounter)
    builder.add_node("generate_invoice", generate_invoice)
    builder.add_node("workflow_completed", workflow_completed)
    builder.add_node("workflow_rejected", workflow_rejected)

    # Define edges (workflow flow)
    builder.add_edge(START, "create_patient")
    builder.add_edge("create_patient", "schedule_admission")
    builder.add_edge("schedule_admission", "create_order_set")
    # create_order_set uses Command(goto=...) - no edge definition needed
    builder.add_edge("create_encounter", "generate_invoice")
    # generate_invoice uses Command(goto=...) - no edge definition needed
    builder.add_edge("workflow_completed", END)
    builder.add_edge("workflow_rejected", END)

    # Set up checkpointer for interrupt/resume support
    checkpointer = InMemorySaver()

    # Compile the graph
    return builder.compile(checkpointer=checkpointer)


# Convenience function for testing
async def test_workflow():
    """Test the Hospital Admissions workflow"""
    import uuid

    graph = create_graph()

    initial_state: HospitalAdmissionsState = {
        **create_base_state(),
        "patient_name": "Jane Smith",
        "admission_date": "2025-10-01",
        "primary_diagnosis": "Community-acquired pneumonia",
        "clinical_protocol": "pneumonia_protocol",
        "patient_id": None,
        "appointment_id": None,
        "order_set_id": None,
        "encounter_id": None,
        "invoice_id": None,
    }

    config = {"configurable": {"thread_id": str(uuid.uuid4())}}

    print("\n" + "="*60)
    print("HOSPITAL ADMISSIONS WORKFLOW TEST")
    print("="*60 + "\n")

    # Run until first interrupt (clinical orders)
    result = await graph.ainvoke(initial_state, config)

    print(f"\n⏸️  Workflow paused for clinical order approval")
    print(f"   Interrupt: {result.get('__interrupt__')}")

    # Simulate approval
    print(f"\n👨‍⚕️ Physician approves clinical orders")
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
    print(f"Patient ID: {final_result['patient_id']}")
    print(f"Order Set ID: {final_result['order_set_id']}")
    print(f"Encounter ID: {final_result['encounter_id']}")
    print(f"Invoice ID: {final_result['invoice_id']}")
    print(f"Current step: {final_result['current_step']}")

    return final_result


# Export for workflow registry
__all__ = ["create_graph", "HospitalAdmissionsState", "test_workflow"]


if __name__ == "__main__":
    # Run test if executed directly
    import asyncio
    asyncio.run(test_workflow())
