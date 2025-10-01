"""
Integration Tests: Education Admissions and Interview Scheduling
"""

import pytest


class TestEducationScenarios:
    """End-to-end education scenarios"""

    @pytest.mark.asyncio
    async def test_applicant_workflow_with_interview(self):
        """
        User Story: Admissions officer schedules interviews for shortlisted candidates
        Expected: System checks availability, proposes schedule, requires approval
        """
        from src.agent import CoagentSession

        session = CoagentSession(
            user_id="admissions_001",
            doctype="Student Applicant",
            doc_name="APP-001",
        )

        response = await session.query(
            "Schedule interviews for shortlisted candidates this week"
        )

        assert response["requires_approval"] is True
        assert response["tool_executed"] == "interview_scheduling"
        assert "scheduled_slots" in response["preview"]
        assert "notifications" in response["preview"]

        # Approve
        result = await session.approve(response["approval_id"])
        assert result["interviews_scheduled"] > 0
        assert result["notifications_sent"] is True
