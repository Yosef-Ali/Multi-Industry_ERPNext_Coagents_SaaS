"""
Manufacturing Production Workflow Graph

Implements: Material Check → Work Order → Material Request → Stock Entry → Quality Inspection
Following LangGraph best practices with interrupt() for approval gates

CRITICAL: Material requests and quality inspections require approval

Implementation of T089
"""

from typing import Literal

from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.types import Command, interrupt

from core.state import ManufacturingProductionState, create_base_state


# Node 1: Check Material Availability (no approval)
async def check_material_availability(state: ManufacturingProductionState) -> ManufacturingProductionState:
    """
    Check material availability for production

    Verifies BOM and checks stock levels
    """
    # Get BOM for item
    # In production: bom = await frappe.get_doc("BOM", {"item": state["item_code"]})
    bom_id = f"BOM-{state['item_code']}-001"

    # Mock BOM materials
    required_materials = get_bom_materials(state["item_code"], state["qty_to_produce"])

    # Check stock availability
    # In production: stock_levels = await check_stock(required_materials)
    material_shortage = check_material_shortage(required_materials)

    print(f"🔍 Checking materials for {state['item_name']}")
    print(f"   - BOM: {bom_id}")
    print(f"   - Required materials: {len(required_materials)}")
    print(f"   - Shortage detected: {material_shortage}")

    return {
        **state,
        "bom_id": bom_id,
        "required_materials": required_materials,
        "material_shortage": material_shortage,
        "steps_completed": state["steps_completed"] + ["check_materials"],
        "current_step": "create_work_order"
    }


# Node 2: Create Work Order (no approval)
async def create_work_order(state: ManufacturingProductionState) -> ManufacturingProductionState:
    """
    Create work order for production

    Initiates production planning
    """
    # Create work order via Frappe API
    # In production: work_order = await create_doc("Work Order", {...})
    work_order_id = f"WO-{state['item_code']}-001"

    print(f"📋 Creating work order: {work_order_id}")
    print(f"   - Item: {state['item_name']}")
    print(f"   - Quantity: {state['qty_to_produce']}")

    return {
        **state,
        "work_order_id": work_order_id,
        "steps_completed": state["steps_completed"] + ["create_work_order"],
        "current_step": "create_material_request"
    }


# Node 3: Create Material Request (REQUIRES APPROVAL if shortage)
async def create_material_request(state: ManufacturingProductionState) -> Command[Literal["create_stock_entry", "workflow_rejected"]]:
    """
    Create material request - REQUIRES APPROVAL if materials are short

    Material procurement requires approval for cost control
    """
    if not state["material_shortage"]:
        # No shortage, skip to stock entry
        print(f"✅ All materials available - no purchase needed")
        return Command(
            goto="create_stock_entry",
            update={
                "steps_completed": state["steps_completed"] + ["skip_material_request"],
                "current_step": "create_stock_entry",
            },
        )

    # Calculate purchase requirements
    shortage_items = [m for m in state["required_materials"] if m.get("shortage", 0) > 0]
    total_cost = sum(item["shortage"] * item["rate"] for item in shortage_items)

    decision = interrupt({
        "operation": "create_material_request",
        "operation_type": "manufacturing_procurement",
        "details": {
            "work_order_id": state["work_order_id"],
            "item_code": state["item_code"],
            "item_name": state["item_name"],
            "shortage_items": shortage_items,
            "total_items": len(shortage_items),
            "estimated_cost": total_cost
        },
        "preview": f"""Material Request:

        Work Order: {state['work_order_id']}
        Production Item: {state['item_name']}
        Quantity: {state['qty_to_produce']}

        Materials Needed ({len(shortage_items)} items):
        {chr(10).join([f"  - {item['item_name']}: {item['shortage']:.2f} {item['uom']} @ ${item['rate']:.2f} = ${item['shortage'] * item['rate']:.2f}" for item in shortage_items])}

        ─────────────────────────────────
        Total Estimated Cost: ${total_cost:.2f}
        """,
        "action": "⚠️ Material purchase required - approval needed for procurement",
        "risk_level": "high"
    })

    if decision == "approve":
        # Create material request via Frappe API
        # In production: material_request = await create_doc("Material Request", {...})
        material_request_id = f"MR-{state['work_order_id']}"

        print(f"📦 Creating material request: {material_request_id}")
        print(f"   - Items: {len(shortage_items)}")
        print(f"   - Estimated cost: ${total_cost:.2f}")

        return Command(
            goto="create_stock_entry",
            update={
                "material_request_id": material_request_id,
                "steps_completed": state["steps_completed"] + ["create_material_request"],
                "current_step": "create_stock_entry",
                "approval_decision": "approved",
                "pending_approval": False,
            },
        )
    else:
        print(f"❌ Material request rejected")

        return Command(
            goto="workflow_rejected",
            update={
                "errors": state["errors"]
                + [
                    {
                        "step": "create_material_request",
                        "reason": "Material procurement rejected",
                    }
                ],
                "approval_decision": "rejected",
                "pending_approval": False,
            },
        )


# Node 4: Create Stock Entry (no approval)
async def create_stock_entry(state: ManufacturingProductionState) -> ManufacturingProductionState:
    """
    Create stock entry for material transfer

    Transfers materials to production floor
    """
    # Create stock entry via Frappe API
    # In production: stock_entry = await create_doc("Stock Entry", {...})
    stock_entry_id = f"STE-{state['work_order_id']}"

    print(f"📦 Creating stock entry: {stock_entry_id}")
    print(f"   - Purpose: Material Transfer for Manufacture")
    print(f"   - Work Order: {state['work_order_id']}")

    return {
        **state,
        "stock_entry_id": stock_entry_id,
        "steps_completed": state["steps_completed"] + ["create_stock_entry"],
        "current_step": "create_quality_inspection"
    }


# Node 5: Create Quality Inspection (REQUIRES APPROVAL)
async def create_quality_inspection(state: ManufacturingProductionState) -> Command[Literal["workflow_completed", "workflow_rejected"]]:
    """
    Create quality inspection - REQUIRES APPROVAL

    CRITICAL: Quality inspection ensures product meets specifications
    """
    # Mock quality inspection parameters
    inspection_params = get_quality_parameters(state["item_code"])

    decision = interrupt({
        "operation": "create_quality_inspection",
        "operation_type": "manufacturing_quality",
        "details": {
            "work_order_id": state["work_order_id"],
            "item_code": state["item_code"],
            "item_name": state["item_name"],
            "qty_inspected": state["qty_to_produce"],
            "inspection_parameters": inspection_params,
            "total_parameters": len(inspection_params)
        },
        "preview": f"""Quality Inspection:

        Work Order: {state['work_order_id']}
        Item: {state['item_name']}
        Quantity: {state['qty_to_produce']}

        Inspection Parameters ({len(inspection_params)}):
        {chr(10).join([f"  - {param['parameter']}: {param['specification']}" for param in inspection_params])}

        Acceptance Criteria:
          - All parameters within specification
          - Visual inspection passed
          - Packaging quality verified
        """,
        "action": "⚠️ CRITICAL: Quality inspection requires approval before stock acceptance",
        "risk_level": "high",
        "requires_quality_approval": True
    })

    if decision == "approve":
        # Create quality inspection via Frappe API
        # In production: qi = await create_doc("Quality Inspection", {...})
        quality_inspection_id = f"QI-{state['work_order_id']}"

        print(f"✅ Quality inspection passed: {quality_inspection_id}")
        print(f"   - Item: {state['item_name']}")
        print(f"   - Status: Accepted")

        return Command(
            goto="workflow_completed",
            update={
                "quality_inspection_id": quality_inspection_id,
                "steps_completed": state["steps_completed"] + ["quality_inspection"],
                "current_step": "completed",
                "approval_decision": "approved",
                "pending_approval": False,
            },
        )
    else:
        print(f"❌ Quality inspection rejected - product does not meet specifications")

        return Command(
            goto="workflow_rejected",
            update={
                "errors": state["errors"]
                + [
                    {
                        "step": "quality_inspection",
                        "reason": "Product failed quality inspection",
                        "quality_critical": True,
                    }
                ],
                "approval_decision": "rejected",
                "pending_approval": False,
            },
        )


# Terminal Node: Workflow Completed
async def workflow_completed(state: ManufacturingProductionState) -> ManufacturingProductionState:
    """
    Workflow completed successfully

    Production completed, quality approved, stock accepted
    """
    print(f"✅ Manufacturing Production workflow completed successfully")
    print(f"   - Work Order: {state['work_order_id']}")
    print(f"   - Stock Entry: {state['stock_entry_id']}")
    print(f"   - Quality Inspection: {state['quality_inspection_id']}")

    return {**state, "current_step": "completed"}


# Terminal Node: Workflow Rejected
async def workflow_rejected(state: ManufacturingProductionState) -> ManufacturingProductionState:
    """
    Workflow rejected by user

    Material procurement or quality inspection rejected
    """
    print(f"❌ Manufacturing Production workflow rejected")
    print(f"   - Errors: {state['errors']}")

    return {**state, "current_step": "rejected"}


# Helper function: Get BOM materials
def get_bom_materials(item_code: str, qty: float) -> list[dict]:
    """
    Get BOM materials for an item

    In production, this would query the database
    """
    # Mock BOM materials
    boms = {
        "CHAIR-WOODEN": [
            {"item_code": "WOOD-OAK", "item_name": "Oak Wood", "qty_per_unit": 2.5, "uom": "kg", "rate": 15.00, "available_qty": 20.0},
            {"item_code": "SCREWS-M6", "item_name": "M6 Screws", "qty_per_unit": 12, "uom": "nos", "rate": 0.25, "available_qty": 100},
            {"item_code": "VARNISH", "item_name": "Wood Varnish", "qty_per_unit": 0.5, "uom": "L", "rate": 25.00, "available_qty": 3.0},
            {"item_code": "SANDPAPER", "item_name": "Sandpaper 120-grit", "qty_per_unit": 2, "uom": "sheets", "rate": 1.50, "available_qty": 50}
        ]
    }

    base_materials = boms.get(item_code, [
        {"item_code": "RAW-MAT-001", "item_name": "Raw Material", "qty_per_unit": 1.0, "uom": "kg", "rate": 10.00, "available_qty": 100.0}
    ])

    # Calculate required quantities and shortages
    materials = []
    for material in base_materials:
        required_qty = material["qty_per_unit"] * qty
        available = material.get("available_qty", 0)
        shortage = max(0, required_qty - available)

        materials.append({
            **material,
            "required_qty": required_qty,
            "shortage": shortage
        })

    return materials


# Helper function: Check material shortage
def check_material_shortage(materials: list[dict]) -> bool:
    """Check if any materials are in shortage"""
    return any(m.get("shortage", 0) > 0 for m in materials)


# Helper function: Get quality parameters
def get_quality_parameters(item_code: str) -> list[dict]:
    """
    Get quality inspection parameters for an item

    In production, this would come from Quality Inspection Template
    """
    parameters = {
        "CHAIR-WOODEN": [
            {"parameter": "Dimensions", "specification": "45cm x 45cm x 90cm ± 2cm"},
            {"parameter": "Weight", "specification": "8-10 kg"},
            {"parameter": "Surface Finish", "specification": "Smooth, no rough edges"},
            {"parameter": "Structural Integrity", "specification": "Supports 150kg without wobble"},
            {"parameter": "Varnish Quality", "specification": "Even coating, no drips"}
        ]
    }

    return parameters.get(item_code, [
        {"parameter": "Visual Inspection", "specification": "No defects"},
        {"parameter": "Dimensional Check", "specification": "Within tolerance"}
    ])


# Graph Builder Function
def create_graph() -> StateGraph:
    """
    Create Manufacturing Production workflow graph

    Returns compiled StateGraph ready for execution
    This function is called by the workflow registry
    """
    # Initialize StateGraph with state schema
    builder = StateGraph(ManufacturingProductionState)

    # Add nodes
    builder.add_node("check_materials", check_material_availability)
    builder.add_node("create_work_order", create_work_order)
    builder.add_node("create_material_request", create_material_request)
    builder.add_node("create_stock_entry", create_stock_entry)
    builder.add_node("create_quality_inspection", create_quality_inspection)
    builder.add_node("workflow_completed", workflow_completed)
    builder.add_node("workflow_rejected", workflow_rejected)

    # Define edges (workflow flow)
    builder.add_edge(START, "check_materials")
    builder.add_edge("check_materials", "create_work_order")
    builder.add_edge("create_work_order", "create_material_request")
    # create_material_request uses Command(goto=...) - no edge needed
    builder.add_edge("create_stock_entry", "create_quality_inspection")
    # create_quality_inspection uses Command(goto=...) - no edge needed
    builder.add_edge("workflow_completed", END)
    builder.add_edge("workflow_rejected", END)

    # Set up checkpointer for interrupt/resume support
    checkpointer = InMemorySaver()

    # Compile the graph
    return builder.compile(checkpointer=checkpointer)


# Convenience function for testing
async def test_workflow():
    """Test the Manufacturing Production workflow"""
    import uuid

    graph = create_graph()

    initial_state: ManufacturingProductionState = {
        **create_base_state(),
        "item_code": "CHAIR-WOODEN",
        "item_name": "Wooden Office Chair",
        "qty_to_produce": 10.0,
        "production_date": "2025-10-05",
        "warehouse": "Production Floor - WH",
        "work_order_id": None,
        "material_request_id": None,
        "stock_entry_id": None,
        "quality_inspection_id": None,
        "bom_id": None,
        "required_materials": None,
        "material_shortage": False,
    }

    config = {"configurable": {"thread_id": str(uuid.uuid4())}}

    print("\n" + "="*60)
    print("MANUFACTURING PRODUCTION WORKFLOW TEST")
    print("="*60 + "\n")

    # Run until first interrupt (material request if shortage)
    result = await graph.ainvoke(initial_state, config)

    if result.get("material_shortage"):
        print(f"\n⏸️  Workflow paused for material request approval")
        print(f"   Interrupt: {result.get('__interrupt__')}")

        # Simulate approval
        print(f"\n👤 Production manager approves material request")
        result = await graph.ainvoke(Command(resume="approve"), config)

    # Continue until quality inspection
    print(f"\n⏸️  Workflow paused for quality inspection")
    print(f"   Interrupt: {result.get('__interrupt__')}")

    # Simulate approval
    print(f"\n👨‍🔧 Quality inspector approves inspection")
    final_result = await graph.ainvoke(Command(resume="approve"), config)

    print(f"\n" + "="*60)
    print("FINAL STATE:")
    print("="*60)
    print(f"Steps completed: {final_result['steps_completed']}")
    print(f"Work Order: {final_result['work_order_id']}")
    print(f"Material Request: {final_result.get('material_request_id', 'N/A')}")
    print(f"Stock Entry: {final_result['stock_entry_id']}")
    print(f"Quality Inspection: {final_result['quality_inspection_id']}")
    print(f"Current step: {final_result['current_step']}")

    return final_result


# Export for workflow registry
__all__ = ["create_graph", "ManufacturingProductionState", "test_workflow"]


if __name__ == "__main__":
    # Run test if executed directly
    import asyncio
    asyncio.run(test_workflow())
