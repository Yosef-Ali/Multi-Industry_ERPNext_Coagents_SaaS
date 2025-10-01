"""
Integration Tests: Manufacturing Material Check and Production
"""

import pytest


class TestManufacturingScenarios:
    """End-to-end manufacturing scenarios"""

    @pytest.mark.asyncio
    async def test_material_check_and_requisition(self):
        """
        User Story: Production planner checks materials and creates purchase requisitions
        Expected: Material check runs without approval, requisition creation requires approval
        """
        from src.agent import CoagentSession

        session = CoagentSession(
            user_id="planner_001",
            doctype="Work Order",
            doc_name="WO-001",
        )

        # Check materials (read-only)
        check_response = await session.query(
            "Check material availability for this production run"
        )
        assert check_response["requires_approval"] is False
        assert "shortages" in check_response

        # Create requisitions (write operation)
        req_response = await session.query(
            "Create purchase requisitions for missing materials"
        )
        assert req_response["requires_approval"] is True
        assert len(req_response["preview"]["requisitions"]) > 0
