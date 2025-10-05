"""Shared workflow state schemas for Canvas and SaaS copilots.

These `TypedDict` definitions keep LangGraph workflows aligned across both the
Canvas Copilot builder experience and the SaaS copilots embedded in ERPNext
apps.
"""

from __future__ import annotations

from typing import Any, Literal, NotRequired, TypedDict, cast


class WorkflowRunMetadata(TypedDict, total=False):
    """Optional metadata associated with a workflow run."""

    workflow_name: str
    industry: str
    run_id: str
    session_id: str
    initiated_by: str
    trigger: Literal["canvas", "agent", "api", "manual"]
    canvas_board_id: str
    notes: list[str]


class WorkflowError(TypedDict, total=False):
    """Reusable error structure for workflow states."""

    step: str
    reason: str
    severity: Literal["info", "warning", "error", "critical"]
    safety_critical: bool
    requires_followup: bool
    details: dict[str, Any]


class ApprovalCheckpoint(TypedDict, total=False):
    """Snapshot of the latest approval gate surfaced to a user."""

    operation: str
    operation_type: str
    action: str
    preview: str
    risk_level: Literal["low", "medium", "high", "critical"]
    metadata: dict[str, Any]


class BaseWorkflowState(TypedDict):
    """Fields common to every workflow state."""

    current_step: str
    steps_completed: list[str]
    errors: list[WorkflowError]
    pending_approval: bool
    approval_decision: str | None
    metadata: NotRequired[WorkflowRunMetadata]
    last_approval: NotRequired[ApprovalCheckpoint]


class CanvasWorkflowState(BaseWorkflowState, total=False):
    """Augmented state used by Canvas Copilot while designing workflows."""

    focus_region: str
    annotations: list[dict[str, Any]]
    proposed_changes: list[dict[str, Any]]
    builder_notes: list[str]


class SaaSWorkflowState(BaseWorkflowState, total=False):
    """Runtime state used by SaaS copilots embedded inside ERPNext apps."""

    session_id: str
    tenant_id: str
    user_id: str
    channel: Literal["web", "mobile", "api"]
    locale: str


class HotelO2CState(SaaSWorkflowState):
    reservation_id: str
    guest_name: str
    room_number: str
    check_in_date: str
    check_out_date: str
    folio_id: str | None
    invoice_id: str | None


class HospitalAdmissionsState(SaaSWorkflowState):
    patient_name: str
    admission_date: str
    primary_diagnosis: str
    clinical_protocol: str | None
    patient_id: str | None
    appointment_id: str | None
    order_set_id: str | None
    encounter_id: str | None
    invoice_id: str | None


class ManufacturingProductionState(SaaSWorkflowState):
    item_code: str
    item_name: str
    qty_to_produce: float
    production_date: str
    warehouse: str
    work_order_id: str | None
    material_request_id: str | None
    stock_entry_id: str | None
    quality_inspection_id: str | None
    bom_id: str | None
    required_materials: list[dict[str, Any]] | None
    material_shortage: bool
    work_order_status: str | None
    required_operations: list[str] | None


class RetailFulfillmentState(SaaSWorkflowState):
    customer_name: str
    customer_id: str
    order_items: list[dict[str, Any]]
    delivery_date: str
    warehouse: str
    sales_order_id: str | None
    pick_list_id: str | None
    delivery_note_id: str | None
    payment_entry_id: str | None
    stock_availability: dict[str, Any] | None
    low_stock_items: list[dict[str, Any]] | None
    order_total: float


class EducationAdmissionsState(SaaSWorkflowState):
    applicant_name: str
    applicant_email: str
    program_name: str
    application_date: str
    academic_score: float
    application_id: str | None
    interview_id: str | None
    assessment_id: str | None
    admission_decision_id: str | None
    student_enrollment_id: str | None
    application_status: str
    interview_score: float | None
    assessment_score: float | None
    final_score: float | None
    admission_recommended: bool


def create_base_state(*, initial_step: str = "start") -> BaseWorkflowState:
    """Helper for initializing a workflow state dictionary with defaults."""

    return cast(
        BaseWorkflowState,
        {
            "current_step": initial_step,
            "steps_completed": [],
            "errors": [],
            "pending_approval": False,
            "approval_decision": None,
        },
    )


__all__ = [
    "WorkflowRunMetadata",
    "WorkflowError",
    "ApprovalCheckpoint",
    "BaseWorkflowState",
    "CanvasWorkflowState",
    "SaaSWorkflowState",
    "HotelO2CState",
    "HospitalAdmissionsState",
    "ManufacturingProductionState",
    "RetailFulfillmentState",
    "EducationAdmissionsState",
    "create_base_state",
]
