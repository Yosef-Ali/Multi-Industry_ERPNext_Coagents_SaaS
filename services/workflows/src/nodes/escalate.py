"""
Escalate node for LangGraph workflows.

Handles issue escalation by creating Frappe Notifications for designated approvers or managers.
"""

from typing import TypedDict, Optional, Literal, Any
from datetime import datetime


class EscalationRequest(TypedDict):
    """Escalation request structure."""
    workflow_name: str  # Name of the workflow requesting escalation
    issue_type: Literal["timeout", "error", "approval_required", "quality_issue", "custom"]
    severity: Literal["low", "medium", "high", "critical"]
    description: str  # Human-readable description of the issue
    context: dict[str, Any]  # Additional context (workflow state, error details, etc.)
    escalate_to: Optional[str]  # ERPNext user to escalate to (default: workflow owner)


class EscalationResult(TypedDict):
    """Result from escalation."""
    success: bool
    notification_id: Optional[str]  # Frappe Notification document name
    escalated_to: str  # User who received the escalation
    error: Optional[str]  # Error message if escalation failed


def escalate_issue(
    workflow_name: str,
    issue_type: Literal["timeout", "error", "approval_required", "quality_issue", "custom"],
    severity: Literal["low", "medium", "high", "critical"],
    description: str,
    context: dict[str, Any],
    escalate_to: Optional[str] = None,
    frappe_client: Optional[Any] = None
) -> EscalationResult:
    """
    Escalate a workflow issue by creating a Frappe Notification.
    
    Args:
        workflow_name: Name of the workflow (e.g., "hotel_o2c")
        issue_type: Type of issue being escalated
        severity: Severity level
        description: Human-readable description
        context: Additional context (workflow state, errors, etc.)
        escalate_to: ERPNext user to notify (default: current user's manager)
        frappe_client: Optional Frappe API client (if None, returns mock success)
    
    Returns:
        EscalationResult with notification ID and success status
        
    Example:
        ```python
        from nodes.escalate import escalate_issue
        
        def quality_inspection_node(state: WorkflowState) -> WorkflowState:
            if state["quality_score"] < state["quality_threshold"]:
                # Escalate quality issue to production manager
                result = escalate_issue(
                    workflow_name="manufacturing_production",
                    issue_type="quality_issue",
                    severity="high",
                    description=f"Quality score {state['quality_score']} below threshold",
                    context={
                        "work_order": state["work_order_id"],
                        "item": state["item_code"],
                        "score": state["quality_score"],
                        "threshold": state["quality_threshold"]
                    },
                    escalate_to="production_manager@company.com"
                )
                
                if not result["success"]:
                    return {**state, "error": result["error"]}
                
                return {
                    **state,
                    "escalation_id": result["notification_id"],
                    "status": "escalated"
                }
            
            return {**state, "status": "quality_passed"}
        ```
    """
    try:
        # Determine recipient (default to workflow owner if not specified)
        recipient = escalate_to or "Administrator"
        
        # Build notification subject based on severity and issue type
        severity_prefix = {
            "low": "⚠️",
            "medium": "⚠️",
            "high": "🚨",
            "critical": "🔥"
        }
        
        subject = f"{severity_prefix.get(severity, '⚠️')} {severity.upper()}: {workflow_name} - {issue_type}"
        
        # Build notification message with context
        message_parts = [
            f"**Workflow**: {workflow_name}",
            f"**Issue Type**: {issue_type}",
            f"**Severity**: {severity}",
            f"**Description**: {description}",
            "",
            "**Context**:"
        ]
        
        for key, value in context.items():
            message_parts.append(f"- **{key}**: {value}")
        
        message_parts.append("")
        message_parts.append(f"**Escalated at**: {datetime.utcnow().isoformat()}")
        
        message = "\n".join(message_parts)
        
        # If no Frappe client provided, return mock success
        if frappe_client is None:
            return EscalationResult(
                success=True,
                notification_id=f"NOTIF-{datetime.utcnow().strftime('%Y%m%d%H%M%S')}",
                escalated_to=recipient,
                error=None
            )
        
        # Create Frappe Notification document
        notification_doc = {
            "doctype": "Notification Log",
            "subject": subject,
            "email_content": message,
            "for_user": recipient,
            "type": "Alert",
            "document_type": "Workflow",
            "document_name": workflow_name
        }
        
        result = frappe_client.create_doc("Notification Log", notification_doc)
        
        return EscalationResult(
            success=True,
            notification_id=result.get("name"),
            escalated_to=recipient,
            error=None
        )
        
    except Exception as e:
        return EscalationResult(
            success=False,
            notification_id=None,
            escalated_to=escalate_to or "unknown",
            error=f"Failed to create escalation notification: {str(e)}"
        )


def escalate_timeout(
    workflow_name: str,
    timeout_duration: float,
    current_step: str,
    context: dict[str, Any],
    escalate_to: Optional[str] = None,
    frappe_client: Optional[Any] = None
) -> EscalationResult:
    """
    Convenience function for escalating workflow timeouts.
    
    Args:
        workflow_name: Name of the workflow
        timeout_duration: How long the workflow has been waiting (seconds)
        current_step: Current workflow step that timed out
        context: Workflow state context
        escalate_to: User to escalate to
        frappe_client: Frappe API client
    
    Returns:
        EscalationResult
        
    Example:
        ```python
        from nodes.escalate import escalate_timeout
        
        def wait_for_approval_node(state: WorkflowState) -> WorkflowState:
            # Check if approval is taking too long
            if state["approval_wait_time"] > 3600:  # 1 hour
                escalate_timeout(
                    workflow_name="hospital_admissions",
                    timeout_duration=state["approval_wait_time"],
                    current_step="clinical_orders_approval",
                    context={
                        "patient": state["patient_name"],
                        "orders": state["order_count"],
                        "requested_by": state["requester"]
                    }
                )
            
            return state
        ```
    """
    hours = timeout_duration / 3600
    description = f"Workflow has been waiting at '{current_step}' for {hours:.1f} hours"
    
    return escalate_issue(
        workflow_name=workflow_name,
        issue_type="timeout",
        severity="high" if timeout_duration > 7200 else "medium",  # High if >2 hours
        description=description,
        context={
            **context,
            "current_step": current_step,
            "timeout_duration_seconds": timeout_duration,
            "timeout_duration_hours": round(hours, 2)
        },
        escalate_to=escalate_to,
        frappe_client=frappe_client
    )


def escalate_error(
    workflow_name: str,
    error_message: str,
    error_type: str,
    failed_step: str,
    context: dict[str, Any],
    escalate_to: Optional[str] = None,
    frappe_client: Optional[Any] = None
) -> EscalationResult:
    """
    Convenience function for escalating workflow errors.
    
    Args:
        workflow_name: Name of the workflow
        error_message: Error message text
        error_type: Type/name of error (e.g., "ValidationError")
        failed_step: Workflow step where error occurred
        context: Workflow state context
        escalate_to: User to escalate to
        frappe_client: Frappe API client
    
    Returns:
        EscalationResult
        
    Example:
        ```python
        from nodes.escalate import escalate_error
        
        def create_document_node(state: WorkflowState) -> WorkflowState:
            try:
                # Attempt document creation
                result = frappe_client.create_doc(...)
                return {**state, "doc_id": result["name"]}
            except Exception as e:
                # Escalate critical errors
                escalate_error(
                    workflow_name="retail_fulfillment",
                    error_message=str(e),
                    error_type=type(e).__name__,
                    failed_step="create_delivery_note",
                    context={
                        "sales_order": state["sales_order_id"],
                        "customer": state["customer_name"]
                    }
                )
                
                return {**state, "error": str(e), "status": "failed"}
        ```
    """
    description = f"Error in '{failed_step}': {error_type}"
    
    return escalate_issue(
        workflow_name=workflow_name,
        issue_type="error",
        severity="critical",
        description=description,
        context={
            **context,
            "failed_step": failed_step,
            "error_type": error_type,
            "error_message": error_message
        },
        escalate_to=escalate_to,
        frappe_client=frappe_client
    )


def escalate_approval_required(
    workflow_name: str,
    approval_action: str,
    risk_level: Literal["low", "medium", "high", "critical"],
    context: dict[str, Any],
    escalate_to: Optional[str] = None,
    frappe_client: Optional[Any] = None
) -> EscalationResult:
    """
    Convenience function for escalating approval requests.
    
    Use this when an approval request needs escalation to a higher authority
    (e.g., high-value transactions, critical clinical decisions).
    
    Args:
        workflow_name: Name of the workflow
        approval_action: Action requiring approval (e.g., "create_invoice")
        risk_level: Risk level of the action
        context: Workflow state context
        escalate_to: User to escalate to (typically a manager)
        frappe_client: Frappe API client
    
    Returns:
        EscalationResult
        
    Example:
        ```python
        from nodes.escalate import escalate_approval_required
        from nodes.approve import approve_if_high_risk
        
        def create_invoice_node(state: WorkflowState) -> WorkflowState:
            # Request approval for high-value invoices
            if state["total_amount"] > 100000:
                # Escalate to CFO for amounts over $100k
                escalate_approval_required(
                    workflow_name="hotel_o2c",
                    approval_action="create_high_value_invoice",
                    risk_level="critical",
                    context={
                        "guest": state["guest_name"],
                        "amount": state["total_amount"],
                        "reservation": state["reservation_id"]
                    },
                    escalate_to="cfo@company.com"
                )
            
            # Regular approval flow
            approval = approve_if_high_risk(...)
            # ...
        ```
    """
    description = f"High-risk approval required: {approval_action}"
    
    severity_map = {
        "low": "medium",
        "medium": "medium",
        "high": "high",
        "critical": "critical"
    }
    
    return escalate_issue(
        workflow_name=workflow_name,
        issue_type="approval_required",
        severity=severity_map.get(risk_level, "medium"),
        description=description,
        context={
            **context,
            "approval_action": approval_action,
            "risk_level": risk_level
        },
        escalate_to=escalate_to,
        frappe_client=frappe_client
    )
