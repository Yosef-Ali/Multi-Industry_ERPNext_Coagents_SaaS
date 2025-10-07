"""
Minimal Python Coagent SDK shim used by integration tests.

Implements a lightweight in-memory session with async `query` and
`approve` methods that return deterministic shapes expected by tests
under `tests/integration/`.

NOTE: This is a temporary stub. Replace with real gateway-backed
implementation once the Python SDK is ready.
"""

from __future__ import annotations

import asyncio
import re
import uuid
from dataclasses import dataclass, field
from typing import Any, Dict, Optional


@dataclass
class _Pending:
    kind: str
    payload: Dict[str, Any] = field(default_factory=dict)


class CoagentSession:
    """
    Minimal session object for tests.

    Parameters
    - user_id: str
    - doctype: Optional[str]
    - doc_name: Optional[str]
    """

    def __init__(self, user_id: str, doctype: Optional[str], doc_name: Optional[str]):
        self.user_id = user_id
        self.doctype = doctype
        self.doc_name = doc_name
        self.session_id = str(uuid.uuid4())
        self._pending: Dict[str, _Pending] = {}

    # ----------------------
    # Public async interface
    # ----------------------
    async def query(self, prompt: str) -> Dict[str, Any]:
        """Return a deterministic response based on the prompt.

        This is a stub that recognizes keywords used by the tests and
        fabricates plausible payloads.
        """
        # Simulate minimal async behavior
        await asyncio.sleep(0)

        p = prompt.lower()

        # Hotel: availability (read-only)
        if "available" in p and "room" in p:
            return {
                "tool_executed": "room_availability",
                "requires_approval": False,
                "available_rooms": [
                    {"room_number": "101", "type": "Deluxe", "rate": 120},
                    {"room_number": "102", "type": "Standard", "rate": 95},
                ],
            }

        # Hotel: create reservation (requires approval)
        if ("reservation" in p and "room" in p) or "create a reservation" in p:
            room_match = re.search(r"room\s*(\d+)", p, re.IGNORECASE)
            room_number = room_match.group(1) if room_match else "101"
            approval_id = str(uuid.uuid4())
            self._pending[approval_id] = _Pending(
                kind="hotel_reservation",
                payload={"room_number": room_number},
            )
            return {
                "requires_approval": True,
                "approval_id": approval_id,
                "preview": {
                    "doctype": "Reservation",
                    "data": {
                        "room_number": room_number,
                    },
                },
            }

        # Retail: inventory check (read-only)
        if "check inventory" in p:
            return {
                "requires_approval": False,
                "stock_levels": {
                    "ITEM-001": {"available": 12, "reserved": 2},
                    "ITEM-002": {"available": 5, "reserved": 0},
                },
            }

        # Retail: fulfillment (requires approval)
        if "delivery note" in p or "pack order" in p:
            approval_id = str(uuid.uuid4())
            self._pending[approval_id] = _Pending(
                kind="retail_fulfillment",
                payload={"doc_name": self.doc_name or "SO-001"},
            )
            return {
                "requires_approval": True,
                "approval_id": approval_id,
                "preview": {
                    "delivery_note": {
                        "sales_order": self.doc_name or "SO-001",
                        "status": "Draft",
                    }
                },
            }

        # Hospital: order set creation (requires approval)
        if "sepsis" in p or "order set" in p or "orders" in p:
            approval_id = str(uuid.uuid4())
            orders = [
                {"name": "CBC"},
                {"name": "Blood cultures"},
                {"name": "Broad-spectrum antibiotics"},
            ]
            self._pending[approval_id] = _Pending(
                kind="hospital_order_set",
                payload={"orders": orders},
            )
            return {
                "requires_approval": True,
                "approval_id": approval_id,
                "tool_executed": "create_order_set",
                "preview": {"orders": orders},
            }

        # Education: interview scheduling (requires approval)
        if "interview" in p or "interviews" in p:
            approval_id = str(uuid.uuid4())
            scheduled = [
                {"applicant": "APP-001", "slot": "Mon 10:00"},
                {"applicant": "APP-002", "slot": "Tue 11:00"},
            ]
            self._pending[approval_id] = _Pending(
                kind="education_interviews",
                payload={"scheduled": scheduled},
            )
            return {
                "requires_approval": True,
                "approval_id": approval_id,
                "tool_executed": "interview_scheduling",
                "preview": {
                    "scheduled_slots": scheduled,
                    "notifications": [
                        {"to": "APP-001", "channel": "email"},
                        {"to": "APP-002", "channel": "email"},
                    ],
                },
            }

        # Manufacturing: material check (read-only)
        if "check material" in p or ("materials" in p and "check" in p):
            return {
                "requires_approval": False,
                "shortages": [
                    {"item": "RM-001", "required": 10, "available": 6},
                ],
            }

        # Manufacturing: create requisitions (requires approval)
        if "requisition" in p or "purchase requisitions" in p:
            approval_id = str(uuid.uuid4())
            reqs = [
                {"item": "RM-001", "qty": 4},
                {"item": "RM-002", "qty": 2},
            ]
            self._pending[approval_id] = _Pending(
                kind="mfg_requisitions",
                payload={"requisitions": reqs},
            )
            return {
                "requires_approval": True,
                "approval_id": approval_id,
                "preview": {"requisitions": reqs},
            }

        # Default fallback: no-op informative response
        return {
            "requires_approval": False,
            "message": "No matching operation recognized in test shim.",
        }

    async def approve(self, approval_id: str) -> Dict[str, Any]:
        """Approve a pending operation created by `query`.

        Returns shape aligned to the originating pending action.
        """
        await asyncio.sleep(0)

        pending = self._pending.pop(approval_id, None)
        if not pending:
            return {"status": "error", "error": "invalid_approval_id"}

        if pending.kind == "hotel_reservation":
            return {"status": "success", "reservation_id": "RES-0001"}

        if pending.kind == "retail_fulfillment":
            return {"status": "success", "delivery_note": "DN-0001"}

        if pending.kind == "hospital_order_set":
            orders = pending.payload.get("orders", [])
            return {"status": "success", "orders_created": max(3, len(orders))}

        if pending.kind == "education_interviews":
            scheduled = pending.payload.get("scheduled", [])
            return {
                "status": "success",
                "interviews_scheduled": max(1, len(scheduled)),
                "notifications_sent": True,
            }

        if pending.kind == "mfg_requisitions":
            reqs = pending.payload.get("requisitions", [])
            return {"status": "success", "requisitions_created": max(1, len(reqs))}

        return {"status": "error", "error": "unknown_pending_kind"}

