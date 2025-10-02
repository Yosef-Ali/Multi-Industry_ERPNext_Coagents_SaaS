"""
Notify node for LangGraph workflows.

Sends in-app notifications and emits AG-UI frames for real-time user updates.
"""

from typing import TypedDict, Optional, Literal, Callable, Any
from datetime import datetime


class NotificationMessage(TypedDict):
    """Notification message structure."""
    type: Literal["info", "success", "warning", "error"]
    title: str
    message: str
    action_url: Optional[str]  # Optional URL for user action
    action_label: Optional[str]  # Label for action button


class NotificationResult(TypedDict):
    """Result from notification."""
    success: bool
    notification_id: Optional[str]
    error: Optional[str]


def send_notification(
    notification_type: Literal["info", "success", "warning", "error"],
    title: str,
    message: str,
    action_url: Optional[str] = None,
    action_label: Optional[str] = None,
    emit_callback: Optional[Callable[[str, dict], None]] = None,
    frappe_client: Optional[Any] = None,
    user: Optional[str] = None
) -> NotificationResult:
    """
    Send an in-app notification and emit AG-UI frame.
    
    This function:
    1. Emits an AG-UI frame event (if callback provided)
    2. Creates a Frappe Notification Log (if frappe_client provided)
    3. Returns notification result
    
    Args:
        notification_type: Type of notification (info/success/warning/error)
        title: Notification title
        message: Notification message body
        action_url: Optional URL for user action
        action_label: Label for action button
        emit_callback: Optional callback to emit AG-UI events (signature: (event_type, payload))
        frappe_client: Optional Frappe API client for creating Notification Log
        user: ERPNext user to notify (default: current user)
    
    Returns:
        NotificationResult with success status and notification ID
        
    Example:
        ```python
        from nodes.notify import send_notification
        
        def complete_order_node(state: WorkflowState) -> WorkflowState:
            # Notify user of successful order completion
            send_notification(
                notification_type="success",
                title="Order Completed",
                message=f"Sales Order {state['order_id']} has been completed successfully",
                action_url=f"/app/sales-order/{state['order_id']}",
                action_label="View Order",
                emit_callback=state.get("emit_callback")
            )
            
            return {**state, "status": "completed"}
        ```
    """
    try:
        # Build notification payload
        notification = NotificationMessage(
            type=notification_type,
            title=title,
            message=message,
            action_url=action_url,
            action_label=action_label
        )
        
        # Emit AG-UI frame event if callback provided
        if emit_callback:
            emit_callback("frame", {
                "type": "notification",
                "notification_type": notification_type,
                "title": title,
                "message": message,
                "action_url": action_url,
                "action_label": action_label,
                "timestamp": datetime.utcnow().isoformat()
            })
        
        # Create Frappe Notification Log if client provided
        notification_id = None
        if frappe_client:
            # Map notification type to Frappe type
            frappe_type_map = {
                "info": "Alert",
                "success": "Alert",
                "warning": "Alert",
                "error": "Alert"
            }
            
            notification_doc = {
                "doctype": "Notification Log",
                "subject": title,
                "email_content": message,
                "for_user": user or "Administrator",
                "type": frappe_type_map.get(notification_type, "Alert"),
                "document_type": "Workflow"
            }
            
            result = frappe_client.create_doc("Notification Log", notification_doc)
            notification_id = result.get("name")
        
        return NotificationResult(
            success=True,
            notification_id=notification_id,
            error=None
        )
        
    except Exception as e:
        return NotificationResult(
            success=False,
            notification_id=None,
            error=f"Failed to send notification: {str(e)}"
        )


def notify_progress(
    step_name: str,
    total_steps: int,
    current_step: int,
    message: Optional[str] = None,
    emit_callback: Optional[Callable[[str, dict], None]] = None
) -> NotificationResult:
    """
    Send a progress update notification.
    
    Useful for long-running workflows to keep users informed of progress.
    
    Args:
        step_name: Name of current step
        total_steps: Total number of steps in workflow
        current_step: Current step number (1-indexed)
        message: Optional additional message
        emit_callback: Optional callback to emit AG-UI events
    
    Returns:
        NotificationResult
        
    Example:
        ```python
        from nodes.notify import notify_progress
        
        def process_items_node(state: WorkflowState) -> WorkflowState:
            items = state["items"]
            total = len(items)
            
            for i, item in enumerate(items, 1):
                # Process item
                process_item(item)
                
                # Notify progress
                notify_progress(
                    step_name=f"Processing {item['name']}",
                    total_steps=total,
                    current_step=i,
                    emit_callback=state.get("emit_callback")
                )
            
            return {**state, "items_processed": total}
        ```
    """
    progress_percent = int((current_step / total_steps) * 100)
    
    title = f"Progress: {progress_percent}%"
    msg = message or f"Step {current_step} of {total_steps}: {step_name}"
    
    if emit_callback:
        emit_callback("frame", {
            "type": "progress",
            "step_name": step_name,
            "total_steps": total_steps,
            "current_step": current_step,
            "progress_percent": progress_percent,
            "message": msg,
            "timestamp": datetime.utcnow().isoformat()
        })
    
    return NotificationResult(
        success=True,
        notification_id=None,
        error=None
    )


def notify_workflow_started(
    workflow_name: str,
    workflow_id: str,
    details: dict[str, Any],
    emit_callback: Optional[Callable[[str, dict], None]] = None
) -> NotificationResult:
    """
    Notify that a workflow has started.
    
    Args:
        workflow_name: Name of the workflow
        workflow_id: Unique workflow execution ID
        details: Workflow details to display
        emit_callback: Optional callback to emit AG-UI events
    
    Returns:
        NotificationResult
        
    Example:
        ```python
        from nodes.notify import notify_workflow_started
        
        def initialize_workflow_node(state: WorkflowState) -> WorkflowState:
            notify_workflow_started(
                workflow_name="Hotel O2C",
                workflow_id=state["thread_id"],
                details={
                    "reservation": state["reservation_id"],
                    "guest": state["guest_name"],
                    "room": state["room_number"]
                },
                emit_callback=state.get("emit_callback")
            )
            
            return {**state, "workflow_started": True}
        ```
    """
    detail_lines = [f"**{k}**: {v}" for k, v in details.items()]
    message = f"Workflow '{workflow_name}' started\n\n" + "\n".join(detail_lines)
    
    return send_notification(
        notification_type="info",
        title="Workflow Started",
        message=message,
        emit_callback=emit_callback
    )


def notify_workflow_completed(
    workflow_name: str,
    workflow_id: str,
    result: dict[str, Any],
    action_url: Optional[str] = None,
    emit_callback: Optional[Callable[[str, dict], None]] = None,
    frappe_client: Optional[Any] = None,
    user: Optional[str] = None
) -> NotificationResult:
    """
    Notify that a workflow has completed successfully.
    
    Args:
        workflow_name: Name of the workflow
        workflow_id: Unique workflow execution ID
        result: Workflow result details
        action_url: Optional URL to view result
        emit_callback: Optional callback to emit AG-UI events
        frappe_client: Optional Frappe API client
        user: ERPNext user to notify
    
    Returns:
        NotificationResult
        
    Example:
        ```python
        from nodes.notify import notify_workflow_completed
        
        def finalize_workflow_node(state: WorkflowState) -> WorkflowState:
            notify_workflow_completed(
                workflow_name="Hospital Admissions",
                workflow_id=state["thread_id"],
                result={
                    "patient": state["patient_name"],
                    "encounter": state["encounter_id"],
                    "invoice": state["invoice_id"]
                },
                action_url=f"/app/patient-encounter/{state['encounter_id']}",
                emit_callback=state.get("emit_callback"),
                frappe_client=state.get("frappe_client")
            )
            
            return {**state, "status": "completed"}
        ```
    """
    result_lines = [f"**{k}**: {v}" for k, v in result.items()]
    message = f"Workflow '{workflow_name}' completed successfully\n\n" + "\n".join(result_lines)
    
    return send_notification(
        notification_type="success",
        title="Workflow Completed",
        message=message,
        action_url=action_url,
        action_label="View Result" if action_url else None,
        emit_callback=emit_callback,
        frappe_client=frappe_client,
        user=user
    )


def notify_workflow_failed(
    workflow_name: str,
    workflow_id: str,
    error: str,
    failed_step: str,
    emit_callback: Optional[Callable[[str, dict], None]] = None,
    frappe_client: Optional[Any] = None,
    user: Optional[str] = None
) -> NotificationResult:
    """
    Notify that a workflow has failed.
    
    Args:
        workflow_name: Name of the workflow
        workflow_id: Unique workflow execution ID
        error: Error message
        failed_step: Step where workflow failed
        emit_callback: Optional callback to emit AG-UI events
        frappe_client: Optional Frappe API client
        user: ERPNext user to notify
    
    Returns:
        NotificationResult
        
    Example:
        ```python
        from nodes.notify import notify_workflow_failed
        
        def error_handler_node(state: WorkflowState) -> WorkflowState:
            notify_workflow_failed(
                workflow_name="Manufacturing Production",
                workflow_id=state["thread_id"],
                error=state["error"],
                failed_step=state["failed_step"],
                emit_callback=state.get("emit_callback"),
                frappe_client=state.get("frappe_client")
            )
            
            return {**state, "status": "failed"}
        ```
    """
    message = (
        f"Workflow '{workflow_name}' failed at step '{failed_step}'\n\n"
        f"**Error**: {error}\n\n"
        f"**Workflow ID**: {workflow_id}"
    )
    
    return send_notification(
        notification_type="error",
        title="Workflow Failed",
        message=message,
        emit_callback=emit_callback,
        frappe_client=frappe_client,
        user=user
    )


def notify_approval_requested(
    action: str,
    details: dict[str, Any],
    risk_level: Literal["low", "medium", "high", "critical"],
    emit_callback: Optional[Callable[[str, dict], None]] = None,
    frappe_client: Optional[Any] = None,
    user: Optional[str] = None
) -> NotificationResult:
    """
    Notify that an approval is requested.
    
    This is typically used in conjunction with the approve node to alert
    users via notification channels in addition to the AG-UI prompt.
    
    Args:
        action: Action requiring approval
        details: Details to display
        risk_level: Risk level of the action
        emit_callback: Optional callback to emit AG-UI events
        frappe_client: Optional Frappe API client
        user: ERPNext user to notify
    
    Returns:
        NotificationResult
        
    Example:
        ```python
        from nodes.notify import notify_approval_requested
        from nodes.approve import request_approval
        
        def create_purchase_order_node(state: WorkflowState) -> WorkflowState:
            # Notify approver
            notify_approval_requested(
                action="create_purchase_order",
                details={
                    "supplier": state["supplier_name"],
                    "amount": state["total_amount"],
                    "items": len(state["items"])
                },
                risk_level=state["risk_level"],
                frappe_client=state.get("frappe_client"),
                user="purchase_manager@company.com"
            )
            
            # Request approval
            approval = request_approval(
                action="create_purchase_order",
                risk_level=state["risk_level"],
                details=state["po_details"]
            )
            # ...
        ```
    """
    risk_emoji = {
        "low": "✅",
        "medium": "⚠️",
        "high": "🚨",
        "critical": "🔥"
    }
    
    detail_lines = [f"**{k}**: {v}" for k, v in details.items()]
    message = (
        f"{risk_emoji.get(risk_level, '⚠️')} Approval required for: {action}\n\n"
        f"**Risk Level**: {risk_level.upper()}\n\n"
        + "\n".join(detail_lines)
    )
    
    return send_notification(
        notification_type="warning",
        title="Approval Required",
        message=message,
        emit_callback=emit_callback,
        frappe_client=frappe_client,
        user=user
    )
