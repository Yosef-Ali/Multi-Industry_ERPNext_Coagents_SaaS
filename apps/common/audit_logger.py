"""
Audit Logger - Structured File-Based Logging (FR-038 to FR-042)
JSON Lines format with automatic rotation
"""

from typing import Dict, Any, Optional, List
from dataclasses import dataclass, asdict
from datetime import datetime
from pathlib import Path
import json
import os
from enum import Enum


class LogType(str, Enum):
    """Log entry types"""
    TOOL_EXECUTION = "tool_execution"
    APPROVAL_DECISION = "approval_decision"
    WORKFLOW_TRANSITION = "workflow_transition"
    ERROR = "error"
    SECURITY = "security"


@dataclass
class LogEntry:
    """Base log entry structure"""
    timestamp: str
    log_type: str
    user_id: str
    session_id: str
    data: Dict[str, Any]


class AuditLogger:
    """
    File-based audit logging with JSON Lines format and automatic rotation
    FR-042: 30-day minimum retention, size/time-based rotation
    """

    def __init__(
        self,
        log_dir: str = "./logs",
        max_file_size_mb: int = 100,
        retention_days: int = 30,
    ):
        self.log_dir = Path(log_dir)
        self.max_file_size_bytes = max_file_size_mb * 1024 * 1024
        self.retention_days = retention_days

        # Ensure log directory exists
        self.log_dir.mkdir(parents=True, exist_ok=True)

        # Log file paths
        self.log_files = {
            LogType.TOOL_EXECUTION: self.log_dir / "tools.jsonl",
            LogType.APPROVAL_DECISION: self.log_dir / "approvals.jsonl",
            LogType.WORKFLOW_TRANSITION: self.log_dir / "workflows.jsonl",
            LogType.ERROR: self.log_dir / "errors.jsonl",
            LogType.SECURITY: self.log_dir / "security.jsonl",
        }

    def log_tool_execution(
        self,
        user_id: str,
        session_id: str,
        tool_name: str,
        input_params: Dict[str, Any],
        result: Dict[str, Any],
        success: bool,
        execution_time_ms: float,
        affected_documents: List[str] = None,
    ) -> None:
        """
        Log tool execution (FR-038, FR-039)

        Args:
            user_id: ERPNext user ID
            session_id: Coagent session ID
            tool_name: Name of tool executed
            input_params: Tool input parameters
            result: Tool execution result
            success: Whether execution succeeded
            execution_time_ms: Execution latency in milliseconds
            affected_documents: List of affected document IDs
        """
        entry = LogEntry(
            timestamp=datetime.utcnow().isoformat(),
            log_type=LogType.TOOL_EXECUTION.value,
            user_id=user_id,
            session_id=session_id,
            data={
                "tool_name": tool_name,
                "input_params": input_params,
                "result": result,
                "success": success,
                "execution_time_ms": execution_time_ms,
                "affected_documents": affected_documents or [],
            },
        )

        self._write_log(LogType.TOOL_EXECUTION, entry)

    def log_approval_decision(
        self,
        user_id: str,
        session_id: str,
        approval_id: str,
        tool_name: str,
        operation: str,
        decision: str,  # "approved" | "rejected" | "expired"
        risk_level: str,
        preview_data: Dict[str, Any],
    ) -> None:
        """
        Log approval decision (FR-040)

        Args:
            user_id: ERPNext user ID
            session_id: Coagent session ID
            approval_id: Unique approval request ID
            tool_name: Tool requiring approval
            operation: Operation type (create, update, etc.)
            decision: User decision
            risk_level: Assessed risk level
            preview_data: Preview of proposed changes
        """
        entry = LogEntry(
            timestamp=datetime.utcnow().isoformat(),
            log_type=LogType.APPROVAL_DECISION.value,
            user_id=user_id,
            session_id=session_id,
            data={
                "approval_id": approval_id,
                "tool_name": tool_name,
                "operation": operation,
                "decision": decision,
                "risk_level": risk_level,
                "preview_data": preview_data,
            },
        )

        self._write_log(LogType.APPROVAL_DECISION, entry)

    def log_workflow_transition(
        self,
        user_id: str,
        session_id: str,
        workflow_id: str,
        workflow_name: str,
        from_state: str,
        to_state: str,
        transition_data: Dict[str, Any],
        success: bool,
    ) -> None:
        """
        Log workflow state transition (FR-041)

        Args:
            user_id: ERPNext user ID
            session_id: Coagent session ID
            workflow_id: Workflow execution ID
            workflow_name: Name of workflow
            from_state: Previous state
            to_state: New state
            transition_data: State transition data
            success: Whether transition succeeded
        """
        entry = LogEntry(
            timestamp=datetime.utcnow().isoformat(),
            log_type=LogType.WORKFLOW_TRANSITION.value,
            user_id=user_id,
            session_id=session_id,
            data={
                "workflow_id": workflow_id,
                "workflow_name": workflow_name,
                "from_state": from_state,
                "to_state": to_state,
                "transition_data": transition_data,
                "success": success,
            },
        )

        self._write_log(LogType.WORKFLOW_TRANSITION, entry)

    def log_error(
        self,
        user_id: str,
        session_id: str,
        error_type: str,
        error_message: str,
        stack_trace: Optional[str] = None,
        context: Dict[str, Any] = None,
    ) -> None:
        """Log error events"""
        entry = LogEntry(
            timestamp=datetime.utcnow().isoformat(),
            log_type=LogType.ERROR.value,
            user_id=user_id,
            session_id=session_id,
            data={
                "error_type": error_type,
                "error_message": error_message,
                "stack_trace": stack_trace,
                "context": context or {},
            },
        )

        self._write_log(LogType.ERROR, entry)

    def log_security_event(
        self,
        user_id: str,
        session_id: str,
        event_type: str,
        description: str,
        severity: str,  # "low" | "medium" | "high" | "critical"
        metadata: Dict[str, Any] = None,
    ) -> None:
        """Log security-related events"""
        entry = LogEntry(
            timestamp=datetime.utcnow().isoformat(),
            log_type=LogType.SECURITY.value,
            user_id=user_id,
            session_id=session_id,
            data={
                "event_type": event_type,
                "description": description,
                "severity": severity,
                "metadata": metadata or {},
            },
        )

        self._write_log(LogType.SECURITY, entry)

    def _write_log(self, log_type: LogType, entry: LogEntry) -> None:
        """
        Write log entry to appropriate file, handle rotation

        JSON Lines format: one JSON object per line
        """
        log_file = self.log_files[log_type]

        # Check if rotation needed
        if log_file.exists() and log_file.stat().st_size > self.max_file_size_bytes:
            self._rotate_log_file(log_file)

        # Write log entry as single line JSON
        with open(log_file, "a") as f:
            json.dump(asdict(entry), f, default=str)
            f.write("\n")

    def _rotate_log_file(self, log_file: Path) -> None:
        """
        Rotate log file when size limit exceeded
        Format: {basename}-{timestamp}.jsonl
        """
        timestamp = datetime.utcnow().strftime("%Y%m%d_%H%M%S")
        rotated_name = f"{log_file.stem}-{timestamp}{log_file.suffix}"
        rotated_path = log_file.parent / rotated_name

        # Rename current log file
        log_file.rename(rotated_path)

        # Compress rotated file (optional, can use gzip)
        # TODO: Implement compression if needed

    def cleanup_old_logs(self) -> int:
        """
        Remove log files older than retention period
        Returns count of deleted files
        """
        deleted_count = 0
        retention_cutoff = datetime.utcnow().timestamp() - (
            self.retention_days * 24 * 3600
        )

        for log_file in self.log_dir.glob("*.jsonl"):
            if log_file.stat().st_mtime < retention_cutoff:
                log_file.unlink()
                deleted_count += 1

        return deleted_count

    def query_logs(
        self,
        log_type: LogType,
        user_id: Optional[str] = None,
        session_id: Optional[str] = None,
        start_time: Optional[datetime] = None,
        end_time: Optional[datetime] = None,
        limit: int = 100,
    ) -> List[Dict[str, Any]]:
        """
        Query logs with filters (for admin/reporting)

        Args:
            log_type: Type of logs to query
            user_id: Filter by user
            session_id: Filter by session
            start_time: Filter by start timestamp
            end_time: Filter by end timestamp
            limit: Maximum results to return

        Returns:
            List of matching log entries
        """
        log_file = self.log_files[log_type]

        if not log_file.exists():
            return []

        results = []

        with open(log_file, "r") as f:
            for line in f:
                if len(results) >= limit:
                    break

                try:
                    entry = json.loads(line)

                    # Apply filters
                    if user_id and entry.get("user_id") != user_id:
                        continue

                    if session_id and entry.get("session_id") != session_id:
                        continue

                    entry_time = datetime.fromisoformat(entry["timestamp"])

                    if start_time and entry_time < start_time:
                        continue

                    if end_time and entry_time > end_time:
                        continue

                    results.append(entry)

                except json.JSONDecodeError:
                    # Skip malformed lines
                    continue

        return results

    def get_stats(self) -> Dict[str, Any]:
        """Get audit log statistics"""
        stats = {
            "log_directory": str(self.log_dir),
            "retention_days": self.retention_days,
            "max_file_size_mb": self.max_file_size_bytes / (1024 * 1024),
            "files": {},
        }

        for log_type, log_file in self.log_files.items():
            if log_file.exists():
                size_mb = log_file.stat().st_size / (1024 * 1024)
                stats["files"][log_type.value] = {
                    "path": str(log_file),
                    "size_mb": round(size_mb, 2),
                    "exists": True,
                }
            else:
                stats["files"][log_type.value] = {
                    "path": str(log_file),
                    "exists": False,
                }

        return stats
