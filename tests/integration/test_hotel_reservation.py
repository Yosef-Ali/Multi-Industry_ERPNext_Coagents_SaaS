"""
Integration Tests: Hotel Reservation Scenarios
"""

import pytest
from typing import Dict, Any


class TestHotelFrontDeskScenarios:
    """End-to-end hotel front desk scenarios"""

    @pytest.mark.asyncio
    async def test_front_desk_availability_query(self):
        """
        User Story: Front desk agent queries room availability
        Expected: Results stream without approval (read-only)
        """
        # This will fail until full implementation
        from src.agent import CoagentSession

        session = CoagentSession(
            user_id="test_user",
            doctype="Reservation",
            doc_name=None,
        )

        response = await session.query(
            "What rooms are available tonight for 2 guests?"
        )

        assert response["tool_executed"] == "room_availability"
        assert response["requires_approval"] is False
        assert len(response["available_rooms"]) > 0

    @pytest.mark.asyncio
    async def test_reservation_creation_with_approval(self):
        """
        User Story: Front desk creates reservation after availability check
        Expected: System shows approval prompt before creating reservation
        """
        from src.agent import CoagentSession

        session = CoagentSession(
            user_id="test_user",
            doctype="Reservation",
            doc_name=None,
        )

        response = await session.query(
            "Create a reservation for Room 101, check-in tomorrow, 3 nights"
        )

        # Should propose action and wait for approval
        assert response["requires_approval"] is True
        assert response["preview"]["doctype"] == "Reservation"
        assert response["preview"]["data"]["room_number"] == "101"

        # Simulate approval
        result = await session.approve(response["approval_id"])

        assert result["status"] == "success"
        assert "reservation_id" in result
