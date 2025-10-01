# Custom Generated Workflows

This directory contains **auto-generated LangGraph workflows** from the SaaS App Generator.

## Auto-Registration

Workflows in this directory are automatically:
1. ✅ Discovered by the workflow registry at startup
2. ✅ Loaded as LangGraph state machines
3. ✅ Available for execution via `custom/{app_name}/{workflow_name}`
4. ✅ Integrated with approval, retry, and escalation nodes

## Directory Structure

```
custom/
├── {app_name}/                           # One directory per generated app
│   ├── {workflow_name}.py               # LangGraph workflow definition
│   └── __init__.py                      # Workflow exports
└── README.md                             # This file
```

## Example: Telemedicine Visit Workflow

```python
# custom/telemedicine_visits/consultation_flow.py

from langgraph.graph import StateGraph
from ...nodes.approve import approval_node
from ...nodes.notify import notify_node

def create_consultation_workflow():
    workflow = StateGraph()

    # Auto-generated state machine
    workflow.add_node("schedule_consultation", schedule_consultation)
    workflow.add_node("send_patient_link", send_patient_link)
    workflow.add_node("wait_for_approval", approval_node)  # HITL approval
    workflow.add_node("start_session", start_session)
    workflow.add_node("complete_visit", complete_visit)
    workflow.add_node("notify_provider", notify_node)

    # Conditional edges based on business logic
    workflow.add_edge("schedule_consultation", "send_patient_link")
    workflow.add_edge("send_patient_link", "wait_for_approval")
    workflow.add_conditional_edges("wait_for_approval",
        lambda state: "approved" if state.get("approved") else "rejected"
    )

    return workflow.compile()
```

## Workflow Registry Pattern

Generated workflows are registered as: `custom/{app_name}/{workflow_name}`

Example invocations:
- `custom/telemedicine_visits/consultation_flow`
- `custom/equipment_maintenance/maintenance_request`
- `custom/loyalty_program/reward_redemption`

## Reusable Nodes

All generated workflows can use core nodes:
- **approval_node** - HITL approval via renderAndWaitForResponse
- **retry_node** - Exponential backoff for transient failures
- **escalate_node** - Create Frappe Notification for manual intervention
- **notify_node** - In-app notifications and emails
