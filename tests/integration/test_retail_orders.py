"""
Integration Tests: Retail Inventory and Order Fulfillment
"""

import pytest


class TestRetailScenarios:
    """End-to-end retail scenarios"""

    @pytest.mark.asyncio
    async def test_inventory_validation_and_fulfillment(self):
        """
        User Story: Store manager validates inventory and processes order
        Expected: Inventory check is read-only, fulfillment requires approval
        """
        from src.agent import CoagentSession

        session = CoagentSession(
            user_id="manager_001",
            doctype="Sales Order",
            doc_name="SO-001",
        )

        # Check inventory
        inv_response = await session.query("Check inventory for this order")
        assert inv_response["requires_approval"] is False
        assert "stock_levels" in inv_response

        # Process fulfillment
        fulfill_response = await session.query("Create delivery note and pack order")
        assert fulfill_response["requires_approval"] is True
        assert "delivery_note" in fulfill_response["preview"]
