"""
Integration Tests: Hospital Order Sets
"""

import pytest


class TestHospitalOrderScenarios:
    """End-to-end hospital order creation scenarios"""

    @pytest.mark.asyncio
    async def test_order_set_creation_with_approval(self):
        """
        User Story: Clinician creates sepsis protocol orders
        Expected: System shows preview of all orders, requires approval
        """
        from src.agent import CoagentSession

        session = CoagentSession(
            user_id="doctor_001",
            doctype="Patient",
            doc_name="PAT-001",
        )

        response = await session.query("Create sepsis protocol orders")

        assert response["requires_approval"] is True
        assert response["tool_executed"] == "create_order_set"
        assert len(response["preview"]["orders"]) >= 3  # CBC, cultures, antibiotics
        assert any("CBC" in order["name"] for order in response["preview"]["orders"])

        # Approve
        result = await session.approve(response["approval_id"])
        assert result["orders_created"] >= 3
