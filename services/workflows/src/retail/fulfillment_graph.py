"""
Retail Order Fulfillment Workflow Graph

Implements: Inventory Check → Sales Order → Pick List → Delivery Note → Payment
Following LangGraph best practices with interrupt() for approval gates

CRITICAL: Low stock items and large orders require approval

Implementation of T090
"""

from typing import Literal

from langgraph.checkpoint.memory import InMemorySaver
from langgraph.graph import END, START, StateGraph
from langgraph.types import Command, interrupt

from core.state import RetailFulfillmentState, create_base_state


# Node 1: Check Inventory Availability (no approval)
async def check_inventory(state: RetailFulfillmentState) -> RetailFulfillmentState:
    """
    Check inventory availability for order items

    Validates stock levels and identifies low stock items
    """
    # Check stock for each item
    # In production: stock_levels = await get_stock_levels(state["order_items"], state["warehouse"])
    stock_availability = {}
    low_stock_items = []

    for item in state["order_items"]:
        item_code = item.get("item_code", item.get("item_name", "UNKNOWN"))
        available = get_available_stock(item_code, state["warehouse"])
        required = item["qty"]

        stock_availability[item_code] = {
            "available": available,
            "required": required,
            "sufficient": available >= required
        }

        # Flag low stock items (< 20% of required or < 10 units after fulfillment)
        remaining = available - required
        if remaining < required * 0.2 or remaining < 10:
            low_stock_items.append({
                "item_code": item_code,
                "item_name": item.get("item_name", item_code),
                "required": required,
                "available": available,
                "remaining_after": remaining
            })

    print(f"🔍 Checking inventory for {len(state['order_items'])} items")
    print(f"   - Warehouse: {state['warehouse']}")
    print(f"   - Low stock warnings: {len(low_stock_items)}")

    return {
        **state,
        "stock_availability": stock_availability,
        "low_stock_items": low_stock_items,
        "steps_completed": state.get("steps_completed", []) + ["check_inventory"],
        "current_step": "create_sales_order"
    }


# Node 2: Create Sales Order (REQUIRES APPROVAL for low stock or large orders)
async def create_sales_order(state: RetailFulfillmentState) -> Command[Literal["create_pick_list", "workflow_rejected"]]:
    """
    Create sales order - REQUIRES APPROVAL if:
    - Low stock items detected
    - Order total exceeds threshold ($5000)

    Approval ensures inventory management and credit control
    """
    # Calculate order total
    order_total = sum(item["qty"] * item.get("rate", 0.0) for item in state["order_items"])

    # Check if approval required
    has_low_stock = len(state["low_stock_items"]) > 0
    is_large_order = order_total > 5000.00

    if not has_low_stock and not is_large_order:
        # No approval needed
        sales_order_id = f"SO-{state['customer_id']}-001"
        print(f"📋 Creating sales order: {sales_order_id}")
        print(f"   - Total: ${order_total:.2f}")
        print(f"   - Items: {len(state['order_items'])}")

        return Command(
            goto="create_pick_list",
            update={
                "sales_order_id": sales_order_id,
                "order_total": order_total,
                "steps_completed": state.get("steps_completed", []) + ["create_sales_order"],
                "current_step": "create_pick_list",
            },
        )

    # Approval required
    warnings = []
    if has_low_stock:
        warnings.append(f"⚠️ {len(state['low_stock_items'])} items will have low stock after fulfillment")
    if is_large_order:
        warnings.append(f"⚠️ Large order: ${order_total:.2f} (threshold: $5,000)")

    decision = interrupt({
        "operation": "create_sales_order",
        "operation_type": "retail_order",
        "details": {
            "customer_name": state["customer_name"],
            "customer_id": state["customer_id"],
            "order_items": state["order_items"],
            "order_total": order_total,
            "total_items": len(state["order_items"]),
            "low_stock_items": state["low_stock_items"],
            "warnings": warnings
        },
        "preview": f"""Sales Order Review:

        Customer: {state['customer_name']} ({state['customer_id']})
        Delivery Date: {state['delivery_date']}

        Order Items ({len(state['order_items'])}):
        {chr(10).join([f"  - {item['item_name']}: {item['qty']} @ ${item['rate']:.2f} = ${item['qty'] * item['rate']:.2f}" for item in state['order_items']])}

        ─────────────────────────────────
        Order Total: ${order_total:.2f}

        {chr(10).join(warnings) if warnings else ''}

        {f'''
        Low Stock Items ({len(state['low_stock_items'])}):
        {chr(10).join([f"  - {item['item_name']}: {item['remaining_after']:.0f} remaining (was {item['available']:.0f})" for item in state['low_stock_items']])}
        ''' if has_low_stock else ''}
        """,
        "action": "⚠️ Order requires approval - review inventory impact or order value",
        "risk_level": "high" if is_large_order else "medium"
    })

    if decision == "approve":
        # Create sales order via Frappe API
        # In production: sales_order = await create_doc("Sales Order", {...})
        sales_order_id = f"SO-{state['customer_id']}-001"

        print(f"📋 Creating sales order: {sales_order_id}")
        print(f"   - Total: ${order_total:.2f}")
        if has_low_stock:
            print(f"   - ⚠️ Low stock warnings acknowledged")

        return Command(
            goto="create_pick_list",
            update={
                "sales_order_id": sales_order_id,
                "order_total": order_total,
                "steps_completed": state.get("steps_completed", []) + ["create_sales_order"],
                "current_step": "create_pick_list",
                "approval_decision": "approved",
                "pending_approval": False,
            },
        )
    else:
        print(f"❌ Sales order rejected")

        return Command(
            goto="workflow_rejected",
            update={
                "errors": state["errors"]
                + [
                    {
                        "step": "create_sales_order",
                        "reason": "Sales order rejected due to inventory concerns or order value",
                    }
                ],
                "approval_decision": "rejected",
                "pending_approval": False,
            },
        )


# Node 3: Create Pick List (no approval)
async def create_pick_list(state: RetailFulfillmentState) -> RetailFulfillmentState:
    """
    Create pick list for warehouse operations

    Generates picking instructions for warehouse staff
    """
    # Create pick list via Frappe API
    # In production: pick_list = await create_doc("Pick List", {...})
    pick_list_id = f"PL-{state['sales_order_id']}"

    print(f"📦 Creating pick list: {pick_list_id}")
    print(f"   - Sales Order: {state['sales_order_id']}")
    print(f"   - Items to pick: {len(state['order_items'])}")

    return {
        **state,
        "pick_list_id": pick_list_id,
        "steps_completed": state.get("steps_completed", []) + ["create_pick_list"],
        "current_step": "create_delivery_note"
    }


# Node 4: Create Delivery Note (no approval)
async def create_delivery_note(state: RetailFulfillmentState) -> RetailFulfillmentState:
    """
    Create delivery note for shipment

    Documents the goods being shipped
    """
    # Create delivery note via Frappe API
    # In production: delivery_note = await create_doc("Delivery Note", {...})
    delivery_note_id = f"DN-{state['sales_order_id']}"

    print(f"🚚 Creating delivery note: {delivery_note_id}")
    print(f"   - Sales Order: {state['sales_order_id']}")
    print(f"   - Delivery Date: {state['delivery_date']}")

    return {
        **state,
        "delivery_note_id": delivery_note_id,
        "steps_completed": state.get("steps_completed", []) + ["create_delivery_note"],
        "current_step": "create_payment"
    }


# Node 5: Create Payment Entry (REQUIRES APPROVAL for large payments)
async def create_payment_entry(state: RetailFulfillmentState) -> Command[Literal["workflow_completed", "workflow_rejected"]]:
    """
    Create payment entry - REQUIRES APPROVAL for large amounts

    Payment processing requires approval for financial control
    """
    order_total = state["order_total"]

    # Small orders (<$1000) auto-approved
    if order_total < 1000.00:
        payment_entry_id = f"PE-{state['sales_order_id']}"
        print(f"💳 Creating payment entry: {payment_entry_id}")
        print(f"   - Amount: ${order_total:.2f}")

        return Command(
            goto="workflow_completed",
            update={
                "payment_entry_id": payment_entry_id,
                "steps_completed": state.get("steps_completed", []) + ["create_payment"],
                "current_step": "completed",
            },
        )

    # Large payments require approval
    decision = interrupt({
        "operation": "create_payment_entry",
        "operation_type": "retail_payment",
        "details": {
            "customer_name": state["customer_name"],
            "customer_id": state["customer_id"],
            "sales_order_id": state["sales_order_id"],
            "delivery_note_id": state["delivery_note_id"],
            "amount": order_total,
            "payment_method": "Credit Card"
        },
        "preview": f"""Payment Entry:

        Customer: {state['customer_name']}
        Sales Order: {state['sales_order_id']}
        Delivery Note: {state['delivery_note_id']}

        Payment Details:
          - Amount:           ${order_total:>10.2f}
          - Payment Method:   Credit Card
          - Status:           Pending Approval

        ⚠️ Large payment - requires approval
        """,
        "action": "Please approve payment processing",
        "risk_level": "high"
    })

    if decision == "approve":
        # Create payment entry via Frappe API
        # In production: payment = await create_doc("Payment Entry", {...})
        payment_entry_id = f"PE-{state['sales_order_id']}"

        print(f"💳 Creating payment entry: {payment_entry_id}")
        print(f"   - Amount: ${order_total:.2f}")

        return Command(
            goto="workflow_completed",
            update={
                "payment_entry_id": payment_entry_id,
                "steps_completed": state.get("steps_completed", []) + ["create_payment"],
                "current_step": "completed",
                "approval_decision": "approved",
                "pending_approval": False,
            },
        )
    else:
        print(f"❌ Payment entry rejected")

        return Command(
            goto="workflow_rejected",
            update={
                "errors": state["errors"]
                + [
                    {
                        "step": "create_payment",
                        "reason": "Payment processing rejected",
                    }
                ],
                "approval_decision": "rejected",
                "pending_approval": False,
            },
        )


# Terminal Node: Workflow Completed
async def workflow_completed(state: RetailFulfillmentState) -> RetailFulfillmentState:
    """
    Workflow completed successfully

    Order fulfilled, shipped, and paid
    """
    print(f"✅ Retail Order Fulfillment workflow completed successfully")
    print(f"   - Sales Order: {state['sales_order_id']}")
    print(f"   - Delivery Note: {state['delivery_note_id']}")
    print(f"   - Payment: {state['payment_entry_id']}")
    print(f"   - Total: ${state['order_total']:.2f}")

    return {**state, "current_step": "completed"}


# Terminal Node: Workflow Rejected
async def workflow_rejected(state: RetailFulfillmentState) -> RetailFulfillmentState:
    """
    Workflow rejected by user

    Order or payment rejected
    """
    print(f"❌ Retail Order Fulfillment workflow rejected")
    print(f"   - Errors: {state['errors']}")

    return {**state, "current_step": "rejected"}


# Helper function: Get available stock
def get_available_stock(item_code: str, warehouse: str) -> float:
    """
    Get available stock for an item in a warehouse

    In production, this would query the database
    """
    # Mock stock levels
    stock_levels = {
        "LAPTOP-DELL-I5": 25.0,
        "MOUSE-WIRELESS": 150.0,
        "KEYBOARD-MECH": 45.0,
        "MONITOR-24": 12.0,  # Low stock
        "HDMI-CABLE": 200.0
    }

    return stock_levels.get(item_code, 100.0)


# Graph Builder Function
def create_graph() -> StateGraph:
    """
    Create Retail Order Fulfillment workflow graph

    Returns compiled StateGraph ready for execution
    This function is called by the workflow registry
    """
    # Initialize StateGraph with state schema
    builder = StateGraph(RetailFulfillmentState)

    # Add nodes
    builder.add_node("check_inventory", check_inventory)
    builder.add_node("create_sales_order", create_sales_order)
    builder.add_node("create_pick_list", create_pick_list)
    builder.add_node("create_delivery_note", create_delivery_note)
    builder.add_node("create_payment_entry", create_payment_entry)
    builder.add_node("workflow_completed", workflow_completed)
    builder.add_node("workflow_rejected", workflow_rejected)

    # Define edges (workflow flow)
    builder.add_edge(START, "check_inventory")
    builder.add_edge("check_inventory", "create_sales_order")
    # create_sales_order uses Command(goto=...) - no edge needed
    builder.add_edge("create_pick_list", "create_delivery_note")
    builder.add_edge("create_delivery_note", "create_payment_entry")
    # create_payment_entry uses Command(goto=...) - no edge needed
    builder.add_edge("workflow_completed", END)
    builder.add_edge("workflow_rejected", END)

    # Set up checkpointer for interrupt/resume support
    checkpointer = InMemorySaver()

    # Compile the graph
    return builder.compile(checkpointer=checkpointer)


# Convenience function for testing
async def test_workflow():
    """Test the Retail Order Fulfillment workflow"""
    import uuid

    graph = create_graph()

    # Test scenario: Large order with low stock item
    initial_state: RetailFulfillmentState = {
        **create_base_state(),
        "customer_name": "TechCorp Solutions",
        "customer_id": "CUST-001",
        "order_items": [
            {"item_code": "LAPTOP-DELL-I5", "item_name": "Dell Laptop i5", "qty": 10, "rate": 850.00},
            {"item_code": "MOUSE-WIRELESS", "item_name": "Wireless Mouse", "qty": 15, "rate": 25.00},
            {"item_code": "KEYBOARD-MECH", "item_name": "Mechanical Keyboard", "qty": 10, "rate": 120.00},
            {"item_code": "MONITOR-24", "item_name": "24-inch Monitor", "qty": 8, "rate": 200.00},
        ],
        "delivery_date": "2025-10-10",
        "warehouse": "Main Store - WH",
        "sales_order_id": None,
        "pick_list_id": None,
        "delivery_note_id": None,
        "payment_entry_id": None,
        "stock_availability": None,
        "low_stock_items": None,
        "order_total": 0.0,
    }

    config = {"configurable": {"thread_id": str(uuid.uuid4())}}

    print("\n" + "="*60)
    print("RETAIL ORDER FULFILLMENT WORKFLOW TEST")
    print("="*60 + "\n")

    # Run until first interrupt (sales order approval)
    result = await graph.ainvoke(initial_state, config)

    print(f"\n⏸️  Workflow paused for sales order approval")
    print(f"   Interrupt: {result.get('__interrupt__')}")

    # Simulate approval
    print(f"\n👤 Sales manager approves order")
    result = await graph.ainvoke(Command(resume="approve"), config)

    # Continue until payment approval
    print(f"\n⏸️  Workflow paused for payment approval")
    print(f"   Interrupt: {result.get('__interrupt__')}")

    # Simulate approval
    print(f"\n💳 Finance team approves payment")
    final_result = await graph.ainvoke(Command(resume="approve"), config)

    print(f"\n" + "="*60)
    print("FINAL STATE:")
    print("="*60)
    print(f"Steps completed: {final_result['steps_completed']}")
    print(f"Sales Order: {final_result['sales_order_id']}")
    print(f"Pick List: {final_result['pick_list_id']}")
    print(f"Delivery Note: {final_result['delivery_note_id']}")
    print(f"Payment Entry: {final_result['payment_entry_id']}")
    print(f"Order Total: ${final_result['order_total']:.2f}")
    print(f"Current step: {final_result['current_step']}")

    return final_result


# Export for workflow registry
__all__ = ["create_graph", "RetailFulfillmentState", "test_workflow"]


if __name__ == "__main__":
    # Run test if executed directly
    import asyncio
    asyncio.run(test_workflow())
