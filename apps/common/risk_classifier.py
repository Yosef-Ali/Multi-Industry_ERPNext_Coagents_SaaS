"""
Risk Classifier - Hybrid Risk Assessment (FR-010)
Implements field sensitivity + document state + operation scope analysis
"""

from typing import Dict, Any, List, Literal
from dataclasses import dataclass
from enum import Enum


class RiskLevel(str, Enum):
    """Risk levels for operations"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"


class FieldSensitivity(str, Enum):
    """Field sensitivity categories"""
    LOW = "low"  # text, note, description fields
    MEDIUM = "medium"  # dates, references, selections
    HIGH = "high"  # financial, status, workflow fields


class DocumentState(str, Enum):
    """Document lifecycle states"""
    DRAFT = "draft"  # Lower risk
    SUBMITTED = "submitted"  # Higher risk
    CANCELLED = "cancelled"  # Higher risk


@dataclass
class RiskAssessment:
    """Risk assessment result"""
    level: RiskLevel
    score: float  # 0.0 to 1.0
    factors: Dict[str, Any]
    requires_approval: bool
    reasoning: str


class RiskClassifier:
    """
    Hybrid risk classification using:
    1. Field sensitivity (what fields are being modified)
    2. Document state (draft vs submitted)
    3. Operation scope (single vs bulk)
    """

    # Field sensitivity mapping (configurable per deployment)
    SENSITIVE_FIELDS = {
        # Financial fields - HIGH risk
        "grand_total": FieldSensitivity.HIGH,
        "total": FieldSensitivity.HIGH,
        "paid_amount": FieldSensitivity.HIGH,
        "outstanding_amount": FieldSensitivity.HIGH,
        "rate": FieldSensitivity.HIGH,
        "amount": FieldSensitivity.HIGH,
        "price": FieldSensitivity.HIGH,

        # Status/Workflow fields - HIGH risk
        "status": FieldSensitivity.HIGH,
        "workflow_state": FieldSensitivity.HIGH,
        "docstatus": FieldSensitivity.HIGH,
        "approved_by": FieldSensitivity.HIGH,

        # Relationship fields - MEDIUM risk
        "customer": FieldSensitivity.MEDIUM,
        "supplier": FieldSensitivity.MEDIUM,
        "item_code": FieldSensitivity.MEDIUM,
        "warehouse": FieldSensitivity.MEDIUM,

        # Text/Note fields - LOW risk
        "notes": FieldSensitivity.LOW,
        "description": FieldSensitivity.LOW,
        "remarks": FieldSensitivity.LOW,
        "comments": FieldSensitivity.LOW,
    }

    # Configurable thresholds (can be overridden per deployment)
    THRESHOLDS = {
        "low_threshold": 0.3,
        "high_threshold": 0.7,
        "bulk_size_threshold": 10,  # Operations affecting >10 docs = higher risk
    }

    @classmethod
    def assess(
        cls,
        operation: Literal["create", "update", "submit", "cancel", "delete", "bulk_update"],
        doctype: str,
        fields: List[str] = None,
        document_state: DocumentState = DocumentState.DRAFT,
        operation_count: int = 1,
        data: Dict[str, Any] = None,
    ) -> RiskAssessment:
        """
        Assess risk level for an operation

        Args:
            operation: Type of operation
            doctype: ERPNext DocType being operated on
            fields: List of fields being modified
            document_state: Current state of document (draft/submitted/cancelled)
            operation_count: Number of documents affected (for bulk operations)
            data: Actual data being written (for value-based rules)

        Returns:
            RiskAssessment with level, score, and reasoning
        """
        factors = {
            "operation": operation,
            "doctype": doctype,
            "fields": fields or [],
            "document_state": document_state.value,
            "operation_count": operation_count,
        }

        score = 0.0
        reasoning_parts = []

        # Factor 1: Field Sensitivity (40% weight)
        if fields:
            field_score = cls._assess_field_sensitivity(fields)
            score += field_score * 0.4
            factors["field_sensitivity_score"] = field_score
            reasoning_parts.append(
                f"Field sensitivity: {field_score:.2f} "
                f"(modifying {len(fields)} fields including "
                f"{', '.join(f for f in fields if f in cls.SENSITIVE_FIELDS)})"
            )

        # Factor 2: Document State (30% weight)
        state_score = cls._assess_document_state(document_state, operation)
        score += state_score * 0.3
        factors["document_state_score"] = state_score
        reasoning_parts.append(
            f"Document state: {state_score:.2f} "
            f"(state={document_state.value}, operation={operation})"
        )

        # Factor 3: Operation Scope (30% weight)
        scope_score = cls._assess_operation_scope(operation_count)
        score += scope_score * 0.3
        factors["operation_scope_score"] = scope_score
        reasoning_parts.append(
            f"Operation scope: {scope_score:.2f} "
            f"(affecting {operation_count} document(s))"
        )

        # Determine risk level from score
        if score >= cls.THRESHOLDS["high_threshold"]:
            level = RiskLevel.HIGH
        elif score >= cls.THRESHOLDS["low_threshold"]:
            level = RiskLevel.MEDIUM
        else:
            level = RiskLevel.LOW

        # Approval requirement
        requires_approval = level in [RiskLevel.MEDIUM, RiskLevel.HIGH]

        reasoning = " | ".join(reasoning_parts)

        return RiskAssessment(
            level=level,
            score=score,
            factors=factors,
            requires_approval=requires_approval,
            reasoning=reasoning,
        )

    @classmethod
    def _assess_field_sensitivity(cls, fields: List[str]) -> float:
        """Calculate field sensitivity score (0.0 to 1.0)"""
        if not fields:
            return 0.0

        sensitivity_scores = {
            FieldSensitivity.LOW: 0.2,
            FieldSensitivity.MEDIUM: 0.5,
            FieldSensitivity.HIGH: 1.0,
        }

        total_score = 0.0
        for field in fields:
            sensitivity = cls.SENSITIVE_FIELDS.get(field, FieldSensitivity.MEDIUM)
            total_score += sensitivity_scores[sensitivity]

        # Average score across all fields
        return min(total_score / len(fields), 1.0)

    @classmethod
    def _assess_document_state(
        cls, state: DocumentState, operation: str
    ) -> float:
        """Calculate document state risk score (0.0 to 1.0)"""
        # Draft documents = lower risk
        if state == DocumentState.DRAFT:
            return 0.2

        # Submitted/Cancelled documents = higher risk
        if state in [DocumentState.SUBMITTED, DocumentState.CANCELLED]:
            # Even higher risk for submit/cancel operations
            if operation in ["submit", "cancel", "delete"]:
                return 1.0
            return 0.7

        return 0.5

    @classmethod
    def _assess_operation_scope(cls, count: int) -> float:
        """Calculate operation scope risk score (0.0 to 1.0)"""
        if count == 1:
            return 0.1  # Single document = low risk

        if count <= cls.THRESHOLDS["bulk_size_threshold"]:
            return 0.5  # Small batch = medium risk

        # Large bulk operations = high risk
        # Linear scale from threshold to 100 documents
        return min(0.5 + (count - cls.THRESHOLDS["bulk_size_threshold"]) / 100, 1.0)

    @classmethod
    def configure_thresholds(cls, **kwargs):
        """Update configurable thresholds at runtime"""
        for key, value in kwargs.items():
            if key in cls.THRESHOLDS:
                cls.THRESHOLDS[key] = value
