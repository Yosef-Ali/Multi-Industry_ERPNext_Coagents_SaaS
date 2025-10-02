"""
Reusable workflow nodes for LangGraph workflows.

This module provides Canvas Copilot building blocks that can be used
across all industry workflows for common patterns:

- **approve**: Human-in-the-loop approval gates with AG-UI emission
- **retry**: Exponential backoff retry logic for resilient operations
- **escalate**: Issue escalation via Frappe Notifications
- **notify**: In-app notifications and AG-UI frame emission

Example Usage:
    ```python
    from nodes import (
        request_approval,
        with_retry,
        escalate_issue,
        send_notification
    )
    
    def my_workflow_node(state: WorkflowState) -> WorkflowState:
        # Request approval for high-risk action
        approval = request_approval(
            action="create_invoice",
            risk_level="high",
            details={"amount": state["total"]}
        )
        
        if not approval["approved"]:
            return {**state, "status": "cancelled"}
        
        # Retry API call with exponential backoff
        result = with_retry(
            operation=lambda: create_invoice(state),
            config={"max_attempts": 3}
        )
        
        if not result["success"]:
            # Escalate failure to manager
            escalate_issue(
                workflow_name="hotel_o2c",
                issue_type="error",
                severity="high",
                description="Failed to create invoice",
                context={"error": result["error"]}
            )
            return {**state, "status": "failed"}
        
        # Notify user of success
        send_notification(
            notification_type="success",
            title="Invoice Created",
            message=f"Invoice {result['result']['name']} created successfully"
        )
        
        return {**state, "invoice_id": result["result"]["name"]}
    ```
"""

# Approval node exports
from .approve import (
    ApprovalRequest,
    ApprovalResult,
    request_approval,
    approve_if_high_risk,
    build_approval_details
)

# Retry node exports
from .retry import (
    RetryConfig,
    RetryState,
    RetryResult,
    with_retry,
    retry_on_network_error,
    retry_frappe_api_call
)

# Escalate node exports
from .escalate import (
    EscalationRequest,
    EscalationResult,
    escalate_issue,
    escalate_timeout,
    escalate_error,
    escalate_approval_required
)

# Notify node exports
from .notify import (
    NotificationMessage,
    NotificationResult,
    send_notification,
    notify_progress,
    notify_workflow_started,
    notify_workflow_completed,
    notify_workflow_failed,
    notify_approval_requested
)

__all__ = [
    # Approval
    "ApprovalRequest",
    "ApprovalResult",
    "request_approval",
    "approve_if_high_risk",
    "build_approval_details",
    
    # Retry
    "RetryConfig",
    "RetryState",
    "RetryResult",
    "with_retry",
    "retry_on_network_error",
    "retry_frappe_api_call",
    
    # Escalate
    "EscalationRequest",
    "EscalationResult",
    "escalate_issue",
    "escalate_timeout",
    "escalate_error",
    "escalate_approval_required",
    
    # Notify
    "NotificationMessage",
    "NotificationResult",
    "send_notification",
    "notify_progress",
    "notify_workflow_started",
    "notify_workflow_completed",
    "notify_workflow_failed",
    "notify_approval_requested"
]
