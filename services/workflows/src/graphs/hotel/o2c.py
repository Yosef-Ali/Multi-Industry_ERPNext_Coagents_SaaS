"""
T081: Hotel Order-to-Cash (O2C) Workflow
LangGraph state machine: check_availability → create_reservation → confirm_payment → send_confirmation
"""

from typing import TypedDict, Literal
from langgraph.graph import StateGraph, END
from datetime import datetime


class HotelO2CState(TypedDict):
    """State schema for hotel O2C workflow"""
    # Input
    check_in: str
    check_out: str
    guest_count: int
    room_type: str | None
    guest_name: str
    guest_email: str

    # Workflow state
    available_rooms: list[dict] | None
    selected_room: str | None
    reservation_id: str | None
    payment_confirmed: bool
    confirmation_sent: bool
    status: Literal["pending", "confirmed", "failed"]

    # Error handling
    error: str | None
    retry_count: int


def check_availability(state: HotelO2CState) -> HotelO2CState:
    """
    Node 1: Check room availability
    Calls room_availability tool
    """
    # TODO: Call room_availability tool via agent
    # For now, placeholder logic
    state["available_rooms"] = [
        {"room_number": "101", "room_type": "Deluxe", "rate": 150},
        {"room_number": "102", "room_type": "Suite", "rate": 250},
    ]

    if not state["available_rooms"]:
        state["status"] = "failed"
        state["error"] = "No rooms available for selected dates"

    return state


def create_reservation(state: HotelO2CState) -> HotelO2CState:
    """
    Node 2: Create reservation document
    Calls create_doc tool with approval gate
    """
    if not state["available_rooms"]:
        return state

    # Select first available room (in real implementation, user chooses)
    state["selected_room"] = state["available_rooms"][0]["room_number"]

    # TODO: Call create_doc tool via agent
    # This should trigger approval prompt in UI
    # For now, placeholder
    state["reservation_id"] = f"RES-{datetime.now().strftime('%Y%m%d%H%M%S')}"

    return state


def confirm_payment(state: HotelO2CState) -> HotelO2CState:
    """
    Node 3: Confirm payment
    May integrate with payment gateway
    """
    if not state["reservation_id"]:
        return state

    # TODO: Payment gateway integration
    # For now, auto-confirm
    state["payment_confirmed"] = True

    return state


def send_confirmation(state: HotelO2CState) -> HotelO2CState:
    """
    Node 4: Send confirmation email
    """
    if not state["payment_confirmed"]:
        return state

    # TODO: Email/notification service
    # For now, placeholder
    state["confirmation_sent"] = True
    state["status"] = "confirmed"

    return state


def should_continue(state: HotelO2CState) -> Literal["create_reservation", "end"]:
    """Conditional routing after availability check"""
    if state.get("error"):
        return "end"
    if state.get("available_rooms"):
        return "create_reservation"
    return "end"


def build_hotel_o2c_graph() -> StateGraph:
    """
    Build Hotel Order-to-Cash workflow graph
    """
    workflow = StateGraph(HotelO2CState)

    # Add nodes
    workflow.add_node("check_availability", check_availability)
    workflow.add_node("create_reservation", create_reservation)
    workflow.add_node("confirm_payment", confirm_payment)
    workflow.add_node("send_confirmation", send_confirmation)

    # Set entry point
    workflow.set_entry_point("check_availability")

    # Add edges
    workflow.add_conditional_edges(
        "check_availability",
        should_continue,
        {
            "create_reservation": "create_reservation",
            "end": END,
        },
    )

    workflow.add_edge("create_reservation", "confirm_payment")
    workflow.add_edge("confirm_payment", "send_confirmation")
    workflow.add_edge("send_confirmation", END)

    return workflow


# Compile workflow
hotel_o2c_graph = build_hotel_o2c_graph().compile()


# Export for workflow registry
def execute_hotel_o2c(initial_state: dict) -> dict:
    """
    Execute hotel O2C workflow with initial state

    Args:
        initial_state: Dict with check_in, check_out, guest_count, etc.

    Returns:
        Final state with reservation_id and status
    """
    # Set defaults
    state = {
        "retry_count": 0,
        "payment_confirmed": False,
        "confirmation_sent": False,
        "status": "pending",
        "error": None,
        **initial_state,
    }

    # Execute graph
    final_state = hotel_o2c_graph.invoke(state)

    return final_state
