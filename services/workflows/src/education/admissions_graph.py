"""
Education Admissions Workflow Graph

Implements: Application Review → Interview Scheduling → Assessment → Admission Decision → Enrollment
Following LangGraph best practices with interrupt() for approval gates

CRITICAL: Admission decisions require approval

Implementation of T091
"""

from typing import TypedDict, Literal
from langgraph.graph import StateGraph, START, END
from langgraph.types import interrupt, Command
from langgraph.checkpoint.memory import InMemorySaver


# State definition using TypedDict (LangGraph best practice)
class EducationAdmissionsState(TypedDict):
    """State for Education Admissions workflow"""
    # Input parameters
    applicant_name: str
    applicant_email: str
    program_name: str
    application_date: str
    academic_score: float  # e.g., GPA or test score

    # Created entities
    application_id: str | None
    interview_id: str | None
    assessment_id: str | None
    admission_decision_id: str | None
    student_enrollment_id: str | None

    # Application tracking
    application_status: str
    interview_score: float | None
    assessment_score: float | None
    final_score: float | None
    admission_recommended: bool

    # Workflow tracking
    current_step: str
    steps_completed: list[str]
    errors: list[dict]

    # Approval tracking
    pending_approval: bool
    approval_decision: str | None


# Node 1: Review Application (no approval)
async def review_application(state: EducationAdmissionsState) -> EducationAdmissionsState:
    """
    Review application and create application record

    Initial screening of application materials
    """
    # Create application via Frappe API
    # In production: application = await create_doc("Student Applicant", {...})
    application_id = f"APP-{state['applicant_name'].replace(' ', '-')[:10].upper()}-001"

    # Perform initial screening
    meets_minimum = state["academic_score"] >= 2.5  # Minimum GPA

    print(f"📋 Reviewing application: {application_id}")
    print(f"   - Applicant: {state['applicant_name']}")
    print(f"   - Program: {state['program_name']}")
    print(f"   - Academic Score: {state['academic_score']:.2f}")
    print(f"   - Meets minimum: {meets_minimum}")

    return {
        **state,
        "application_id": application_id,
        "application_status": "under_review",
        "steps_completed": state["steps_completed"] + ["review_application"],
        "current_step": "schedule_interview"
    }


# Node 2: Schedule Interview (REQUIRES APPROVAL for scheduling)
async def schedule_interview(state: EducationAdmissionsState) -> Command[Literal["conduct_assessment", "workflow_rejected"]]:
    """
    Schedule interview - REQUIRES APPROVAL

    Interview scheduling requires approval to coordinate resources
    """
    # Calculate recommended interview date
    # In production: would check interviewer availability
    interview_date = "2025-10-15"
    interviewer = get_assigned_interviewer(state["program_name"])

    decision = interrupt({
        "operation": "schedule_interview",
        "operation_type": "education_interview",
        "details": {
            "application_id": state["application_id"],
            "applicant_name": state["applicant_name"],
            "applicant_email": state["applicant_email"],
            "program_name": state["program_name"],
            "academic_score": state["academic_score"],
            "interview_date": interview_date,
            "interviewer": interviewer
        },
        "preview": f"""Interview Scheduling:

        Application: {state['application_id']}
        Applicant: {state['applicant_name']}
        Email: {state['applicant_email']}

        Program: {state['program_name']}
        Academic Score: {state['academic_score']:.2f}/4.0

        Proposed Interview:
          - Date: {interview_date}
          - Interviewer: {interviewer}
          - Duration: 30 minutes
          - Format: In-person/Virtual

        Application Strength: {'Strong' if state['academic_score'] >= 3.5 else 'Good' if state['academic_score'] >= 3.0 else 'Fair'}
        """,
        "action": "Please approve interview scheduling",
        "risk_level": "medium"
    })

    if decision == "approve":
        # Schedule interview via Frappe API
        # In production: interview = await create_doc("Interview", {...})
        interview_id = f"INT-{state['application_id']}"

        print(f"📅 Scheduling interview: {interview_id}")
        print(f"   - Date: {interview_date}")
        print(f"   - Interviewer: {interviewer}")

        return Command(
            goto="conduct_assessment",
            update={
                "interview_id": interview_id,
                "steps_completed": state["steps_completed"] + ["schedule_interview"],
                "current_step": "conduct_assessment",
                "approval_decision": "approved",
                "pending_approval": False
            }
        )
    else:
        print(f"❌ Interview scheduling rejected")

        return Command(
            goto="workflow_rejected",
            update={
                "errors": state["errors"] + [{
                    "step": "schedule_interview",
                    "reason": "Interview scheduling rejected"
                }],
                "application_status": "rejected",
                "approval_decision": "rejected",
                "pending_approval": False
            }
        )


# Node 3: Conduct Assessment (no approval - automated/completed externally)
async def conduct_assessment(state: EducationAdmissionsState) -> EducationAdmissionsState:
    """
    Conduct assessment and record scores

    This represents interview completion and scoring
    """
    # Mock interview and assessment scores
    # In production, these would come from actual interview feedback
    interview_score = calculate_interview_score(state["applicant_name"])
    assessment_score = calculate_assessment_score(state["academic_score"], interview_score)

    # Create assessment record via Frappe API
    # In production: assessment = await create_doc("Assessment", {...})
    assessment_id = f"ASM-{state['application_id']}"

    print(f"📊 Recording assessment: {assessment_id}")
    print(f"   - Interview score: {interview_score:.1f}/10")
    print(f"   - Assessment score: {assessment_score:.1f}/100")

    return {
        **state,
        "assessment_id": assessment_id,
        "interview_score": interview_score,
        "assessment_score": assessment_score,
        "steps_completed": state["steps_completed"] + ["conduct_assessment"],
        "current_step": "make_admission_decision"
    }


# Node 4: Make Admission Decision (REQUIRES APPROVAL - CRITICAL)
async def make_admission_decision(state: EducationAdmissionsState) -> Command[Literal["enroll_student", "workflow_rejected"]]:
    """
    Make admission decision - REQUIRES APPROVAL

    CRITICAL: Admission decisions affect student futures and program quality
    """
    # Calculate final score
    academic_score_weighted = state["academic_score"] * 25  # 25% weight (0-100 scale)
    interview_score_weighted = state["interview_score"] * 3  # 30% weight
    assessment_score_weighted = state["assessment_score"] * 0.45  # 45% weight

    final_score = academic_score_weighted + interview_score_weighted + assessment_score_weighted

    # Recommendation based on score
    admission_recommended = final_score >= 70.0
    recommendation_level = get_recommendation_level(final_score)

    decision = interrupt({
        "operation": "make_admission_decision",
        "operation_type": "education_admission",
        "details": {
            "application_id": state["application_id"],
            "applicant_name": state["applicant_name"],
            "program_name": state["program_name"],
            "academic_score": state["academic_score"],
            "interview_score": state["interview_score"],
            "assessment_score": state["assessment_score"],
            "final_score": final_score,
            "recommendation": recommendation_level,
            "recommended_action": "ADMIT" if admission_recommended else "REJECT"
        },
        "preview": f"""Admission Decision Review:

        Application: {state['application_id']}
        Applicant: {state['applicant_name']}
        Program: {state['program_name']}

        Score Breakdown:
          - Academic (GPA):       {state['academic_score']:.2f}/4.0  → {academic_score_weighted:.1f}/25
          - Interview:            {state['interview_score']:.1f}/10   → {interview_score_weighted:.1f}/30
          - Assessment:           {state['assessment_score']:.1f}/100 → {assessment_score_weighted:.1f}/45
          ───────────────────────────────────────────────
          Final Score:            {final_score:.1f}/100

        Recommendation: {recommendation_level}
        Suggested Action: {'✅ ADMIT' if admission_recommended else '❌ REJECT'}

        {'Strong candidate - recommended for admission' if final_score >= 85 else
         'Good candidate - meets admission criteria' if final_score >= 70 else
         'Borderline candidate - review required' if final_score >= 60 else
         'Does not meet admission standards'}
        """,
        "action": "⚠️ CRITICAL: Admission decision requires approval",
        "risk_level": "high",
        "requires_director_approval": True
    })

    if decision == "approve":
        # Create admission decision via Frappe API
        # In production: decision_doc = await create_doc("Admission Decision", {...})
        admission_decision_id = f"ADM-{state['application_id']}"

        print(f"✅ Admission decision approved: {admission_decision_id}")
        print(f"   - Final Score: {final_score:.1f}/100")
        print(f"   - Status: ADMITTED")

        return Command(
            goto="enroll_student",
            update={
                "admission_decision_id": admission_decision_id,
                "final_score": final_score,
                "admission_recommended": True,
                "application_status": "admitted",
                "steps_completed": state["steps_completed"] + ["admission_decision"],
                "current_step": "enroll_student",
                "approval_decision": "approved",
                "pending_approval": False
            }
        )
    else:
        print(f"❌ Admission rejected")

        return Command(
            goto="workflow_rejected",
            update={
                "errors": state["errors"] + [{
                    "step": "admission_decision",
                    "reason": "Admission decision rejected",
                    "admission_critical": True
                }],
                "final_score": final_score,
                "admission_recommended": False,
                "application_status": "rejected",
                "approval_decision": "rejected",
                "pending_approval": False
            }
        )


# Node 5: Enroll Student (no approval - administrative)
async def enroll_student(state: EducationAdmissionsState) -> EducationAdmissionsState:
    """
    Enroll student in program

    Creates student record and enrollment
    """
    # Create student enrollment via Frappe API
    # In production: enrollment = await create_doc("Student", {...})
    student_enrollment_id = f"STU-{state['applicant_name'].replace(' ', '-')[:10].upper()}"

    print(f"🎓 Enrolling student: {student_enrollment_id}")
    print(f"   - Program: {state['program_name']}")
    print(f"   - Status: Enrolled")

    return {
        **state,
        "student_enrollment_id": student_enrollment_id,
        "application_status": "enrolled",
        "steps_completed": state["steps_completed"] + ["enroll_student"],
        "current_step": "workflow_completed"
    }


# Terminal Node: Workflow Completed
async def workflow_completed(state: EducationAdmissionsState) -> EducationAdmissionsState:
    """
    Workflow completed successfully

    Student admitted and enrolled
    """
    print(f"✅ Education Admissions workflow completed successfully")
    print(f"   - Application: {state['application_id']}")
    print(f"   - Admission Decision: {state['admission_decision_id']}")
    print(f"   - Student Enrollment: {state['student_enrollment_id']}")
    print(f"   - Final Score: {state['final_score']:.1f}/100")

    return {
        **state,
        "current_step": "completed"
    }


# Terminal Node: Workflow Rejected
async def workflow_rejected(state: EducationAdmissionsState) -> EducationAdmissionsState:
    """
    Workflow rejected

    Application rejected at interview or admission stage
    """
    print(f"❌ Education Admissions workflow rejected")
    print(f"   - Application: {state['application_id']}")
    print(f"   - Status: {state['application_status']}")
    print(f"   - Errors: {state['errors']}")

    return {
        **state,
        "current_step": "rejected"
    }


# Helper function: Get assigned interviewer
def get_assigned_interviewer(program_name: str) -> str:
    """
    Get interviewer assignment based on program

    In production, would check interviewer availability and expertise
    """
    interviewers = {
        "Computer Science": "Dr. Sarah Johnson",
        "Business Administration": "Prof. Michael Chen",
        "Engineering": "Dr. Robert Smith",
        "Nursing": "Dr. Emily Davis"
    }

    return interviewers.get(program_name, "Academic Advisor")


# Helper function: Calculate interview score
def calculate_interview_score(applicant_name: str) -> float:
    """
    Mock interview score calculation

    In production, would come from actual interview feedback
    """
    # Mock scoring based on name hash for consistent testing
    import hashlib
    score_hash = int(hashlib.md5(applicant_name.encode()).hexdigest(), 16)
    return 6.0 + (score_hash % 40) / 10.0  # Range: 6.0-9.9


# Helper function: Calculate assessment score
def calculate_assessment_score(academic_score: float, interview_score: float) -> float:
    """
    Calculate overall assessment score

    In production, would incorporate multiple assessment components
    """
    # Weighted combination with some randomness
    base_score = (academic_score / 4.0) * 50 + (interview_score / 10.0) * 50
    return min(100.0, base_score)


# Helper function: Get recommendation level
def get_recommendation_level(final_score: float) -> str:
    """Get recommendation level based on final score"""
    if final_score >= 85:
        return "STRONGLY RECOMMEND"
    elif final_score >= 75:
        return "RECOMMEND"
    elif final_score >= 65:
        return "CONDITIONALLY RECOMMEND"
    elif final_score >= 55:
        return "BORDERLINE - COMMITTEE REVIEW"
    else:
        return "NOT RECOMMENDED"


# Graph Builder Function
def create_graph() -> StateGraph:
    """
    Create Education Admissions workflow graph

    Returns compiled StateGraph ready for execution
    This function is called by the workflow registry
    """
    # Initialize StateGraph with state schema
    builder = StateGraph(EducationAdmissionsState)

    # Add nodes
    builder.add_node("review_application", review_application)
    builder.add_node("schedule_interview", schedule_interview)
    builder.add_node("conduct_assessment", conduct_assessment)
    builder.add_node("make_admission_decision", make_admission_decision)
    builder.add_node("enroll_student", enroll_student)
    builder.add_node("workflow_completed", workflow_completed)
    builder.add_node("workflow_rejected", workflow_rejected)

    # Define edges (workflow flow)
    builder.add_edge(START, "review_application")
    builder.add_edge("review_application", "schedule_interview")
    # schedule_interview uses Command(goto=...) - no edge needed
    builder.add_edge("conduct_assessment", "make_admission_decision")
    # make_admission_decision uses Command(goto=...) - no edge needed
    builder.add_edge("enroll_student", "workflow_completed")
    builder.add_edge("workflow_completed", END)
    builder.add_edge("workflow_rejected", END)

    # Set up checkpointer for interrupt/resume support
    checkpointer = InMemorySaver()

    # Compile the graph
    return builder.compile(checkpointer=checkpointer)


# Convenience function for testing
async def test_workflow():
    """Test the Education Admissions workflow"""
    import uuid

    graph = create_graph()

    initial_state: EducationAdmissionsState = {
        "applicant_name": "Alice Rodriguez",
        "applicant_email": "alice.rodriguez@email.com",
        "program_name": "Computer Science",
        "application_date": "2025-09-15",
        "academic_score": 3.7,  # Strong GPA
        "application_id": None,
        "interview_id": None,
        "assessment_id": None,
        "admission_decision_id": None,
        "student_enrollment_id": None,
        "application_status": "new",
        "interview_score": None,
        "assessment_score": None,
        "final_score": None,
        "admission_recommended": False,
        "current_step": "start",
        "steps_completed": [],
        "errors": [],
        "pending_approval": False,
        "approval_decision": None
    }

    config = {"configurable": {"thread_id": str(uuid.uuid4())}}

    print("\n" + "="*60)
    print("EDUCATION ADMISSIONS WORKFLOW TEST")
    print("="*60 + "\n")

    # Run until first interrupt (interview scheduling)
    result = await graph.ainvoke(initial_state, config)

    print(f"\n⏸️  Workflow paused for interview scheduling approval")
    print(f"   Interrupt: {result.get('__interrupt__')}")

    # Simulate approval
    print(f"\n👤 Admissions coordinator approves interview")
    result = await graph.ainvoke(Command(resume="approve"), config)

    # Continue until admission decision
    print(f"\n⏸️  Workflow paused for admission decision")
    print(f"   Interrupt: {result.get('__interrupt__')}")

    # Simulate approval
    print(f"\n🎓 Admissions director approves admission")
    final_result = await graph.ainvoke(Command(resume="approve"), config)

    print(f"\n" + "="*60)
    print("FINAL STATE:")
    print("="*60)
    print(f"Steps completed: {final_result['steps_completed']}")
    print(f"Application: {final_result['application_id']}")
    print(f"Interview: {final_result['interview_id']}")
    print(f"Assessment: {final_result['assessment_id']}")
    print(f"Admission Decision: {final_result['admission_decision_id']}")
    print(f"Student Enrollment: {final_result['student_enrollment_id']}")
    print(f"Final Score: {final_result['final_score']:.1f}/100")
    print(f"Status: {final_result['application_status']}")
    print(f"Current step: {final_result['current_step']}")

    return final_result


# Export for workflow registry
__all__ = ["create_graph", "EducationAdmissionsState", "test_workflow"]


if __name__ == "__main__":
    # Run test if executed directly
    import asyncio
    asyncio.run(test_workflow())
