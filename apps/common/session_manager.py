"""
Session Manager - Coagent Session Lifecycle
Manages 1:1 mapping between coagent sessions and ERPNext user sessions (FR-032, FR-033)
"""

from typing import Dict, Any, Optional, List
from dataclasses import dataclass, field
from datetime import datetime, timedelta
from enum import Enum
import uuid
import json


class SessionStatus(str, Enum):
    """Session lifecycle states"""
    ACTIVE = "active"
    PAUSED = "paused"
    EXPIRED = "expired"
    CLOSED = "closed"


@dataclass
class ConversationMessage:
    """Single message in conversation history"""
    role: str  # "user" | "assistant" | "system"
    content: str
    timestamp: datetime
    tool_calls: List[Dict[str, Any]] = field(default_factory=list)
    metadata: Dict[str, Any] = field(default_factory=dict)


@dataclass
class PendingApproval:
    """Approval request awaiting user decision"""
    approval_id: str
    tool_name: str
    operation: str
    preview: Dict[str, Any]
    risk_level: str
    created_at: datetime
    timeout_at: datetime
    status: str = "pending"  # pending | approved | rejected | expired


@dataclass
class CoagentSession:
    """
    Represents a user's active conversation with the coagent assistant
    Maps 1:1 to ERPNext user session (FR-032)
    """
    session_id: str
    user_id: str
    erpnext_session_token: str
    doctype: Optional[str]
    doc_name: Optional[str]
    status: SessionStatus
    created_at: datetime
    last_activity: datetime
    expires_at: datetime

    # Conversation state
    conversation_history: List[ConversationMessage] = field(default_factory=list)
    current_document_context: Dict[str, Any] = field(default_factory=dict)

    # Approval workflow state
    pending_approvals: List[PendingApproval] = field(default_factory=list)

    # Workflow execution state (for multi-step processes)
    active_workflow_id: Optional[str] = None
    workflow_state: Dict[str, Any] = field(default_factory=dict)

    # Session metadata
    enabled_industries: List[str] = field(default_factory=list)
    user_permissions: Dict[str, Any] = field(default_factory=dict)


class SessionManager:
    """
    Manages coagent session lifecycle
    Enforces 1:1 mapping with ERPNext user sessions
    """

    def __init__(self, session_timeout_minutes: int = 30):
        self.sessions: Dict[str, CoagentSession] = {}
        self.session_timeout = timedelta(minutes=session_timeout_minutes)

    def create_session(
        self,
        user_id: str,
        erpnext_session_token: str,
        doctype: Optional[str] = None,
        doc_name: Optional[str] = None,
        enabled_industries: List[str] = None,
        user_permissions: Dict[str, Any] = None,
    ) -> CoagentSession:
        """
        Create new coagent session tied to ERPNext user session

        Args:
            user_id: ERPNext user ID
            erpnext_session_token: Valid ERPNext session token
            doctype: Optional - DocType being viewed
            doc_name: Optional - Specific document name
            enabled_industries: List of enabled industry verticals
            user_permissions: User's ERPNext role permissions

        Returns:
            CoagentSession instance
        """
        session_id = str(uuid.uuid4())
        now = datetime.utcnow()

        session = CoagentSession(
            session_id=session_id,
            user_id=user_id,
            erpnext_session_token=erpnext_session_token,
            doctype=doctype,
            doc_name=doc_name,
            status=SessionStatus.ACTIVE,
            created_at=now,
            last_activity=now,
            expires_at=now + self.session_timeout,
            enabled_industries=enabled_industries or [],
            user_permissions=user_permissions or {},
        )

        # Load document context if specific doc provided
        if doctype and doc_name:
            session.current_document_context = {
                "doctype": doctype,
                "name": doc_name,
                "loaded_at": now.isoformat(),
            }

        self.sessions[session_id] = session
        return session

    def get_session(self, session_id: str) -> Optional[CoagentSession]:
        """Retrieve session by ID, check expiration"""
        session = self.sessions.get(session_id)

        if not session:
            return None

        # Check expiration
        if session.expires_at < datetime.utcnow():
            session.status = SessionStatus.EXPIRED
            return None

        return session

    def update_activity(self, session_id: str) -> bool:
        """Update last activity timestamp, extend expiration"""
        session = self.get_session(session_id)
        if not session:
            return False

        now = datetime.utcnow()
        session.last_activity = now
        session.expires_at = now + self.session_timeout
        return True

    def add_message(
        self,
        session_id: str,
        role: str,
        content: str,
        tool_calls: List[Dict[str, Any]] = None,
        metadata: Dict[str, Any] = None,
    ) -> bool:
        """Add message to conversation history"""
        session = self.get_session(session_id)
        if not session:
            return False

        message = ConversationMessage(
            role=role,
            content=content,
            timestamp=datetime.utcnow(),
            tool_calls=tool_calls or [],
            metadata=metadata or {},
        )

        session.conversation_history.append(message)
        self.update_activity(session_id)
        return True

    def create_approval_request(
        self,
        session_id: str,
        tool_name: str,
        operation: str,
        preview: Dict[str, Any],
        risk_level: str,
        timeout_minutes: int = 10,
    ) -> Optional[str]:
        """
        Create approval request for high-risk operation

        Returns:
            approval_id if created, None if session invalid
        """
        session = self.get_session(session_id)
        if not session:
            return None

        approval_id = str(uuid.uuid4())
        now = datetime.utcnow()

        approval = PendingApproval(
            approval_id=approval_id,
            tool_name=tool_name,
            operation=operation,
            preview=preview,
            risk_level=risk_level,
            created_at=now,
            timeout_at=now + timedelta(minutes=timeout_minutes),
        )

        session.pending_approvals.append(approval)
        self.update_activity(session_id)
        return approval_id

    def resolve_approval(
        self,
        session_id: str,
        approval_id: str,
        decision: str,  # "approved" | "rejected"
    ) -> Optional[PendingApproval]:
        """
        Resolve pending approval request

        Returns:
            PendingApproval if found and updated, None otherwise
        """
        session = self.get_session(session_id)
        if not session:
            return None

        for approval in session.pending_approvals:
            if approval.approval_id == approval_id:
                # Check timeout
                if approval.timeout_at < datetime.utcnow():
                    approval.status = "expired"
                    return approval

                approval.status = decision
                self.update_activity(session_id)
                return approval

        return None

    def update_document_context(
        self,
        session_id: str,
        doctype: str,
        doc_name: str,
        context_data: Dict[str, Any] = None,
    ) -> bool:
        """Update current document context"""
        session = self.get_session(session_id)
        if not session:
            return False

        session.doctype = doctype
        session.doc_name = doc_name
        session.current_document_context = {
            "doctype": doctype,
            "name": doc_name,
            "loaded_at": datetime.utcnow().isoformat(),
            **(context_data or {}),
        }

        self.update_activity(session_id)
        return True

    def start_workflow(
        self,
        session_id: str,
        workflow_id: str,
        initial_state: Dict[str, Any],
    ) -> bool:
        """Start multi-step workflow execution"""
        session = self.get_session(session_id)
        if not session:
            return False

        session.active_workflow_id = workflow_id
        session.workflow_state = initial_state
        self.update_activity(session_id)
        return True

    def update_workflow_state(
        self,
        session_id: str,
        state_update: Dict[str, Any],
    ) -> bool:
        """Update workflow execution state"""
        session = self.get_session(session_id)
        if not session:
            return False

        session.workflow_state.update(state_update)
        self.update_activity(session_id)
        return True

    def close_session(self, session_id: str) -> bool:
        """Close session gracefully"""
        session = self.get_session(session_id)
        if not session:
            return False

        session.status = SessionStatus.CLOSED
        return True

    def cleanup_expired_sessions(self) -> int:
        """Remove expired sessions, return count"""
        now = datetime.utcnow()
        expired_count = 0

        for session_id, session in list(self.sessions.items()):
            if session.expires_at < now:
                session.status = SessionStatus.EXPIRED
                del self.sessions[session_id]
                expired_count += 1

        return expired_count

    def export_session_state(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Export session state for persistence (Redis, etc.)"""
        session = self.get_session(session_id)
        if not session:
            return None

        return {
            "session_id": session.session_id,
            "user_id": session.user_id,
            "doctype": session.doctype,
            "doc_name": session.doc_name,
            "status": session.status.value,
            "created_at": session.created_at.isoformat(),
            "last_activity": session.last_activity.isoformat(),
            "expires_at": session.expires_at.isoformat(),
            "conversation_history": [
                {
                    "role": msg.role,
                    "content": msg.content,
                    "timestamp": msg.timestamp.isoformat(),
                    "tool_calls": msg.tool_calls,
                    "metadata": msg.metadata,
                }
                for msg in session.conversation_history
            ],
            "pending_approvals": [
                {
                    "approval_id": appr.approval_id,
                    "tool_name": appr.tool_name,
                    "operation": appr.operation,
                    "preview": appr.preview,
                    "risk_level": appr.risk_level,
                    "status": appr.status,
                    "created_at": appr.created_at.isoformat(),
                    "timeout_at": appr.timeout_at.isoformat(),
                }
                for appr in session.pending_approvals
            ],
            "workflow_state": session.workflow_state,
            "enabled_industries": session.enabled_industries,
        }
