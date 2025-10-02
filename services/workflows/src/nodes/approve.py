"""
Approval node for LangGraph workflows.

Emits AG-UI ui_prompt events for human-in-the-loop approval gates.
Compatible with CopilotKit's renderAndWaitForResponse pattern.
"""

from typing import TypedDict, Optional, Literal, Callable, Any
from langgraph.types import interrupt


class ApprovalRequest(TypedDict):
    """Approval request structure for AG-UI emission."""
    action: str  # The action being requested (e.g., "create_sales_order")
    risk_level: Literal["low", "medium", "high", "critical"]
    details: dict[str, Any]  # Action-specific details for display
    reason: Optional[str]  # Optional explanation for why approval is needed


class ApprovalResult(TypedDict):
    """Result from approval interaction."""
    approved: bool
    comment: Optional[str]  # Optional user comment/reason
    timestamp: str


def request_approval(
    action: str,
    risk_level: Literal["low", "medium", "high", "critical"],
    details: dict[str, Any],
    reason: Optional[str] = None,
    emit_callback: Optional[Callable[[str, dict], None]] = None
) -> ApprovalResult:
    """
    Request human approval for a workflow action.
    
    This function:
    1. Emits an AG-UI ui_prompt event (if callback provided)
    2. Calls interrupt() to pause the workflow
    3. Returns the approval result when workflow resumes
    
    Args:
        action: Name of the action requiring approval (e.g., "create_invoice")
        risk_level: Risk classification (low/medium/high/critical)
        details: Action-specific details to display to user
        reason: Optional explanation for why approval is needed
        emit_callback: Optional callback to emit AG-UI events (signature: (event_type, payload))
    
    Returns:
        ApprovalResult with approved flag, optional comment, and timestamp
        
    Example:
        ```python
        from nodes.approve import request_approval
        
        def create_invoice_node(state: WorkflowState) -> WorkflowState:
            # Request approval before creating invoice
            approval = request_approval(
                action="create_invoice",
                risk_level="medium",
                details={
                    "customer": state["customer_name"],
                    "amount": state["total_amount"],
                    "items": state["items"]
                },
                reason="Invoice total exceeds $10,000"
            )
            
            if not approval["approved"]:
                return {**state, "status": "cancelled", "error": "User rejected invoice creation"}
            
            # Proceed with invoice creation
            return {**state, "invoice_created": True}
        ```
    """
    # Build approval request payload
    request = ApprovalRequest(
        action=action,
        risk_level=risk_level,
        details=details,
        reason=reason
    )
    
    # Emit AG-UI ui_prompt event if callback provided
    if emit_callback:
        emit_callback("ui_prompt", {
            "type": "approval_request",
            "action": action,
            "risk_level": risk_level,
            "details": details,
            "reason": reason,
            "prompt": f"Approve {action}?" + (f" ({reason})" if reason else "")
        })
    
    # Pause workflow and wait for human response
    # The value passed to interrupt() will be available in the workflow's interrupt state
    result = interrupt({
        "type": "approval_request",
        "request": request
    })
    
    # If result is None, it means workflow was resumed without providing approval data
    # Default to approved=False for safety
    if result is None:
        return ApprovalResult(
            approved=False,
            comment="No approval data provided on resume",
            timestamp=""
        )
    
    # Extract approval result from resume data
    # Expected format: {"approved": bool, "comment": str, "timestamp": str}
    return ApprovalResult(
        approved=result.get("approved", False),
        comment=result.get("comment"),
        timestamp=result.get("timestamp", "")
    )


def approve_if_high_risk(
    action: str,
    risk_level: Literal["low", "medium", "high", "critical"],
    details: dict[str, Any],
    threshold: Literal["medium", "high", "critical"] = "high",
    emit_callback: Optional[Callable[[str, dict], None]] = None
) -> Optional[ApprovalResult]:
    """
    Conditionally request approval only if risk level meets or exceeds threshold.
    
    This is a convenience function for workflows that only need approval for high-risk actions.
    
    Args:
        action: Name of the action requiring approval
        risk_level: Risk classification of the action
        details: Action-specific details to display
        threshold: Minimum risk level that requires approval (default: "high")
        emit_callback: Optional callback to emit AG-UI events
    
    Returns:
        ApprovalResult if approval was requested, None if action is below threshold
        
    Example:
        ```python
        from nodes.approve import approve_if_high_risk
        
        def update_inventory_node(state: WorkflowState) -> WorkflowState:
            # Only request approval for high-risk inventory updates
            approval = approve_if_high_risk(
                action="update_inventory",
                risk_level=state["risk_level"],
                details={"item": state["item_code"], "qty": state["quantity"]},
                threshold="high"  # Only approve if risk_level is "high" or "critical"
            )
            
            if approval and not approval["approved"]:
                return {**state, "status": "cancelled"}
            
            # Proceed with update (either low risk or approved)
            return {**state, "inventory_updated": True}
        ```
    """
    risk_hierarchy = ["low", "medium", "high", "critical"]
    
    # Check if risk level meets threshold
    if risk_hierarchy.index(risk_level) >= risk_hierarchy.index(threshold):
        return request_approval(action, risk_level, details, emit_callback=emit_callback)
    
    # Risk level below threshold, no approval needed
    return None


# Helper function to build approval details from common workflow state
def build_approval_details(
    operation: str,
    doctype: str,
    doc_data: dict[str, Any],
    key_fields: list[str]
) -> dict[str, Any]:
    """
    Build approval details dictionary from workflow state.
    
    Args:
        operation: Operation type (e.g., "create", "update", "cancel")
        doctype: ERPNext DocType name
        doc_data: Document data from workflow state
        key_fields: List of field names to include in approval details
    
    Returns:
        Formatted details dictionary for approval request
        
    Example:
        ```python
        from nodes.approve import build_approval_details, request_approval
        
        def create_sales_order_node(state: WorkflowState) -> WorkflowState:
            details = build_approval_details(
                operation="create",
                doctype="Sales Order",
                doc_data=state,
                key_fields=["customer", "total", "delivery_date"]
            )
            
            approval = request_approval(
                action="create_sales_order",
                risk_level="medium",
                details=details
            )
            # ...
        ```
    """
    details = {
        "operation": operation,
        "doctype": doctype
    }
    
    # Extract key fields from doc data
    for field in key_fields:
        if field in doc_data:
            details[field] = doc_data[field]
    
    return details
