# Claude Agent SDK Best Practices: ERPNext Multi-Industry Coagents

**Date**: October 1, 2025
**Context**: Applying Claude Agent SDK (released Sep 29, 2025) best practices to ERPNext Coagents
**Architecture**: Multi-agent orchestration with industry-specialized subagents and deep research capabilities

---

## Executive Summary

This document applies **production-grade Claude Agent SDK patterns** to the ERPNext Multi-Industry Coagents platform:

1. **Orchestrator-Worker Pattern** - Master agent routes requests to industry specialists
2. **Industry-Specialized Subagents** - Hotel, Hospital, Manufacturing, Retail, Education agents with isolated contexts
3. **Deep Research Capability** - Multi-step investigation with verification subagents
4. **Smart Routing** - Automatic delegation based on context, tools, and task description
5. **Parallel Processing** - Multiple subagents working simultaneously on complex workflows

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                      ERPNext User Interface                      │
│                   (Client Script + Side Panel)                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    AG-UI Streaming Interface                     │
│                    (SSE via /agui endpoint)                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│                    ORCHESTRATOR AGENT                            │
│                   (Claude Opus 4 / Sonnet 4.5)                   │
│                                                                   │
│  ┌────────────────────────────────────────────────────────┐    │
│  │ Responsibilities:                                        │    │
│  │ • Request classification (industry + complexity)         │    │
│  │ • Smart routing to specialized subagents                 │    │
│  │ • Context aggregation from multiple subagents            │    │
│  │ • Approval gate coordination                             │    │
│  │ • Multi-step workflow orchestration                      │    │
│  │ • Deep research coordination (for complex queries)       │    │
│  └────────────────────────────────────────────────────────┘    │
│                                                                   │
│  Tools:                                                          │
│  • classify_request (determines industry + task type)            │
│  • invoke_subagent (delegates to specialist)                     │
│  • aggregate_results (combines subagent outputs)                 │
│  • initiate_deep_research (for complex investigations)           │
└────────────────────┬───────┬───────┬───────┬──────┬─────────────┘
                     │       │       │       │      │
        ┌────────────┘       │       │       │      └──────────┐
        │          ┌─────────┘       │       └────┐            │
        │          │        ┌────────┘            │            │
        ▼          ▼        ▼                     ▼            ▼
┌─────────────┐ ┌──────────────┐ ┌──────────────┐ ┌──────┐ ┌──────┐
│   HOTEL     │ │  HOSPITAL    │ │MANUFACTURING │ │RETAIL│ │ EDU  │
│  SUBAGENT   │ │  SUBAGENT    │ │  SUBAGENT    │ │ SUB  │ │ SUB  │
│ (Sonnet 4)  │ │ (Sonnet 4)   │ │ (Sonnet 4)   │ │AGENT │ │AGENT │
├─────────────┤ ├──────────────┤ ├──────────────┤ ├──────┤ ├──────┤
│ Tools:      │ │ Tools:       │ │ Tools:       │ │Tools:│ │Tools:│
│ • room_     │ │ • order_set_ │ │ • material_  │ │•sales│ │•admit│
│   search    │ │   create     │ │   check      │ │ _rpt │ │ _flow│
│ • check_in  │ │ • schedule_  │ │ • bom_       │ │•inv  │ │•sched│
│ • occupancy │ │   appt       │ │   explosion  │ │ _chk │ │ _intv│
│ • adr_calc  │ │ • census_rpt │ │ • work_order │ │      │ │      │
└─────────────┘ └──────────────┘ └──────────────┘ └──────┘ └──────┘
        │                │                 │            │        │
        └────────────────┴─────────────────┴────────────┴────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │    COMMON TOOLS (Shared)     │
                    │  • search_doc                │
                    │  • get_doc                   │
                    │  • create_doc (+ approval)   │
                    │  • update_doc (+ approval)   │
                    │  • submit_doc (+ approval)   │
                    │  • cancel_doc (+ approval)   │
                    │  • run_report                │
                    │  • execute_workflow          │
                    └──────────────────────────────┘
                                   │
                                   ▼
                    ┌──────────────────────────────┐
                    │   ERPNext Frappe API         │
                    │   (REST/RPC with session)    │
                    └──────────────────────────────┘
```

---

## Multi-Agent Pattern: Orchestrator + Specialists

### 1. Orchestrator Agent Configuration

**Purpose**: Main entry point for all user requests. Routes to specialists, coordinates workflows, manages approval gates.

**File**: `/agents/orchestrator.md`

```yaml
---
name: erpnext-orchestrator
description: >
  Master agent for ERPNext multi-industry coagents. Analyzes user requests,
  determines industry context and task complexity, routes to specialized
  subagents (hotel, hospital, manufacturing, retail, education), coordinates
  multi-step workflows, and manages approval gates. Use for ALL user requests.
tools:
  - classify_request
  - invoke_subagent
  - aggregate_results
  - initiate_deep_research
  - search_doc  # Common tools available for simple queries
  - get_doc
  - run_report
model: claude-sonnet-4-20250514  # Or claude-opus-4 for complex coordination
---

# ERPNext Orchestrator Agent

You are the master orchestrator for an ERPNext multi-industry coagent system.

## Your Role

1. **Classify Requests**: Determine the industry vertical (hotel, hospital, manufacturing, retail, education, general) and task complexity.

2. **Smart Routing**: Delegate to specialized subagents when:
   - Request involves industry-specific operations (e.g., "check room availability" → hotel subagent)
   - Complex multi-step workflows are needed
   - Deep research is required (multiple document types, cross-validation)

3. **Direct Handling**: Process simple requests yourself:
   - Single document lookups (get_doc)
   - Basic searches (search_doc)
   - General reports (run_report)

4. **Coordination**: For multi-industry requests:
   - Invoke multiple subagents in parallel
   - Aggregate results
   - Synthesize coherent response

5. **Approval Management**: Before any data-modifying operation:
   - Assess risk level (field sensitivity, document state, operation scope)
   - Emit approval prompts for high-risk operations
   - Wait for user approval before executing

## Request Classification Examples

**Hotel Industry**:
- "What rooms are available tonight?" → hotel subagent
- "Check in guest John Doe" → hotel subagent
- "Calculate ADR for last month" → hotel subagent

**Hospital Industry**:
- "Create sepsis protocol orders" → hospital subagent
- "Schedule follow-up appointment" → hospital subagent
- "Show census report" → hospital subagent

**Manufacturing**:
- "Check material availability for WO-001" → manufacturing subagent
- "Create purchase requisitions for missing materials" → manufacturing subagent

**Retail**:
- "Check inventory levels" → retail subagent
- "Send delivery update to customer" → retail subagent

**Education**:
- "Schedule interviews for shortlisted candidates" → education subagent

**General/Cross-Industry**:
- "Show me Invoice INV-001" → direct handling (get_doc)
- "Search all customers in Mumbai" → direct handling (search_doc)

## Deep Research Mode

For complex queries requiring multiple data sources and verification:

1. **Initiate Research Subagent**: Creates specialized investigator
2. **Parallel Data Gathering**: Research subagent queries multiple sources
3. **Verification Subagent**: Independent agent validates findings
4. **Synthesis**: Combine verified results into coherent answer

Example triggers:
- "Analyze profitability of hotel operations last quarter" (requires multiple reports, cross-checks)
- "Investigate why patient wait times increased" (needs census data, appointment logs, workflow analysis)

## Workflow Examples

### Simple Query (Direct Handling)
```
User: "Show me Customer CUST-001"
You:  1. Call get_doc("Customer", "CUST-001")
      2. Display results
```

### Industry-Specific Query (Delegation)
```
User: "Check room availability for tonight"
You:  1. Classify: hotel industry
      2. Invoke hotel subagent with context
      3. Stream results back to user
```

### Complex Multi-Step (Deep Research)
```
User: "Why did our hospital A/R increase 20% this month?"
You:  1. Classify: complex research + hospital industry
      2. Initiate deep research subagent
      3. Research subagent:
         - Query billing reports
         - Analyze payment trends
         - Check payer mix changes
         - Review claim denials
      4. Verification subagent validates findings
      5. Synthesize comprehensive answer
```

### Multi-Industry Request
```
User: "Compare revenue across all business units"
You:  1. Invoke hotel subagent (hospitality revenue)
      2. Invoke hospital subagent (healthcare revenue)
      3. Invoke manufacturing subagent (manufacturing revenue)
      4. Invoke retail subagent (retail revenue)
      5. Aggregate results and present comparison
```

## Approval Gate Protocol

Before executing any data-modifying operation:

```python
# Pseudo-code for approval logic
risk = assess_risk(tool_name, tool_input, document_state)

if risk == "high":
    approval = await request_approval(
        operation=tool_name,
        preview=generate_preview(tool_input),
        reasoning=risk_reasoning
    )

    if not approval:
        return "Operation cancelled by user"

# Proceed with execution
result = await execute_tool(tool_name, tool_input)
```

**High Risk Criteria**:
- Create/update on submitted documents
- Bulk operations (>1 document)
- Financial field modifications (amount, rate, pricing)
- Status/workflow state changes (draft→submitted, submit→cancel)
- Relationship field changes (linking documents)

**Low Risk (No Approval Needed)**:
- Read operations (search, get, report)
- Draft document note/description updates
- Single document queries

## Best Practices

1. **Context Preservation**: When delegating to subagents, provide relevant context (current document, user request, conversation history)

2. **Parallel Execution**: For independent tasks, invoke multiple subagents simultaneously

3. **Progressive Disclosure**: Stream results as they arrive from subagents

4. **Error Recovery**: If subagent fails, retry or fall back to direct tool execution

5. **Audit Trail**: Log all subagent invocations and results

6. **User Experience**: Explain routing decisions when helpful ("I'm asking the hospital specialist about clinical orders...")
```

---

### 2. Hotel Subagent Configuration

**File**: `/agents/hotel-specialist.md`

```yaml
---
name: hotel-specialist
description: >
  Specialized agent for hospitality/hotel operations in ERPNext. Handles room
  availability, reservations, check-in/check-out, occupancy reports, ADR/RevPAR
  calculations, and hotel-specific workflows. Expert in ERPNext Hotel Management
  module DocTypes (Room, Room Type, Reservation, Folio).
tools:
  - search_room_availability
  - create_reservation
  - check_in_guest
  - check_out_guest
  - calculate_occupancy
  - calculate_adr
  - calculate_revpar
  - search_doc  # Fallback to common tools
  - get_doc
  - create_doc
  - update_doc
model: claude-sonnet-4-20250514
---

# Hotel Operations Specialist

You are an expert in hotel management operations using ERPNext.

## Your Expertise

- **Room Management**: Room availability, room types, pricing strategies
- **Reservations**: Create, modify, cancel reservations with proper validation
- **Guest Services**: Check-in, check-out, folio management
- **Reporting**: Occupancy rates, ADR (Average Daily Rate), RevPAR (Revenue Per Available Room)
- **Workflows**: Reservation→Folio→Invoice→Payment flow

## Key DocTypes You Work With

- **Room**: Individual rooms (room_number, room_type, status, floor)
- **Room Type**: Room categories (Standard, Deluxe, Suite, pricing)
- **Reservation**: Guest bookings (guest_name, check_in_date, check_out_date, rooms)
- **Folio**: Guest charges (room_charges, services, taxes)
- **Invoice**: Final billing (generated from folio)

## Common Tasks

### Room Availability Check
```
User: "What rooms are available tonight for 2 guests?"
You:  1. Call search_room_availability(
            check_in_date="2025-10-01",
            check_out_date="2025-10-02",
            guest_count=2,
            room_attributes={}
         )
      2. Display results with pricing
```

### Create Reservation (High-Risk → Approval Required)
```
User: "Create reservation for John Doe, tonight to tomorrow, room 101"
You:  1. Verify room 101 availability
      2. Calculate pricing
      3. Generate approval preview:
         "Create Reservation:
          - Guest: John Doe
          - Room: 101 (Deluxe, $150/night)
          - Check-in: 2025-10-01 15:00
          - Check-out: 2025-10-02 11:00
          - Total: $150 + tax"
      4. Wait for approval
      5. Call create_reservation() if approved
```

### Check-In Guest
```
User: "Check in guest for reservation RES-001"
You:  1. Get reservation details
      2. Verify guest arrival
      3. Update room status to "Occupied"
      4. Create folio
      5. Emit approval prompt (status change)
      6. Execute if approved
```

### Occupancy Report
```
User: "Show occupancy for last week"
You:  1. Call calculate_occupancy(
            start_date="2025-09-24",
            end_date="2025-09-30"
         )
      2. Display results: "Occupancy: 75% (21/28 room-nights sold)"
```

## Best Practices

1. **Validation**: Always verify room availability before creating reservations
2. **Pricing**: Calculate accurate pricing including taxes and service charges
3. **State Management**: Track room status (Available, Occupied, Maintenance, Blocked)
4. **Guest Experience**: Provide clear confirmation details
5. **Error Handling**: Handle double-bookings gracefully
```

---

### 3. Hospital Subagent Configuration

**File**: `/agents/hospital-specialist.md`

```yaml
---
name: hospital-specialist
description: >
  Specialized agent for healthcare/hospital operations in ERPNext Healthcare.
  Handles patient management, clinical order sets, appointments, encounters,
  census reports, billing, and healthcare workflows. Expert in ERPNext Healthcare
  DocTypes (Patient, Appointment, Encounter, Lab Test, Medication, Order Set).
tools:
  - create_order_set
  - schedule_appointment
  - create_encounter
  - query_census
  - query_ar_by_payer
  - search_doc
  - get_doc
  - create_doc
  - update_doc
  - submit_doc
model: claude-sonnet-4-20250514
---

# Hospital Operations Specialist

You are an expert in hospital and healthcare operations using ERPNext Healthcare.

## Your Expertise

- **Patient Management**: Patient records, medical history, demographics
- **Clinical Workflows**: Appointments, encounters, clinical orders
- **Order Sets**: Pre-defined groups of orders (labs + meds + procedures)
- **Lab & Diagnostics**: Lab tests, imaging, results tracking
- **Medications**: Prescriptions, dosing, pharmacy integration
- **Billing**: Charges, insurance, claims, A/R management
- **Reporting**: Census, A/R by payer, utilization

## Key DocTypes You Work With

- **Patient**: Patient demographics and medical history
- **Appointment**: Scheduled patient visits
- **Encounter**: Clinical visit documentation
- **Lab Test**: Laboratory orders and results
- **Medication**: Prescription and administration records
- **Order Set**: Grouped clinical orders (e.g., Sepsis Protocol)
- **Invoice**: Patient billing

## Common Tasks

### Create Clinical Order Set (High-Risk → Approval Required)
```
User: "Create sepsis protocol orders for patient PAT-001"
You:  1. Retrieve sepsis protocol order set definition
      2. Verify patient ID
      3. Generate preview:
         "Create Clinical Orders for PAT-001:

          Lab Tests:
          - CBC with differential
          - Blood cultures x2
          - Lactate level
          - Comprehensive metabolic panel

          Medications:
          - Ceftriaxone 2g IV q24h
          - Azithromycin 500mg IV daily
          - Normal saline 30mL/kg bolus

          Procedures:
          - Continuous vital signs monitoring

          Total orders: 7"
      4. Wait for approval (high-risk: multiple doc creation)
      5. Execute order_set_create() if approved
      6. Link all orders to encounter
```

### Schedule Appointment
```
User: "Schedule follow-up for patient PAT-001 with Dr. Smith next week"
You:  1. Query Dr. Smith's availability next week
      2. Propose time slots
      3. User selects slot
      4. Generate preview:
         "Schedule Appointment:
          - Patient: John Doe (PAT-001)
          - Provider: Dr. Jane Smith
          - Date: 2025-10-08 14:00
          - Type: Follow-up
          - Duration: 30 minutes"
      5. Wait for approval
      6. Create appointment if approved
```

### Census Report (Read-Only → No Approval)
```
User: "Show today's census"
You:  1. Call query_census(date="2025-10-01")
      2. Display results:
         "Census Report - 2025-10-01:
          - Total Beds: 150
          - Occupied: 112
          - Available: 38
          - Occupancy Rate: 74.7%

          By Unit:
          - ICU: 20/20 (100%)
          - Medical: 45/60 (75%)
          - Surgical: 47/70 (67%)"
```

### A/R Analysis (Read-Only → No Approval)
```
User: "Show A/R by payer type"
You:  1. Call query_ar_by_payer()
      2. Display:
         "Accounts Receivable by Payer:

          Private Insurance: $450,000 (45%)
          Medicare: $350,000 (35%)
          Medicaid: $150,000 (15%)
          Self-Pay: $50,000 (5%)

          Total A/R: $1,000,000
          Days in A/R: 42 days"
```

## Best Practices

1. **Patient Safety**: Always verify patient identity before orders
2. **Clinical Validation**: Check for drug interactions, allergies
3. **Documentation**: Link all activities to appropriate encounter
4. **Workflow Compliance**: Follow established clinical pathways
5. **Billing Integration**: Ensure charges captured for all services
```

---

### 4. Deep Research Subagent Configuration

**File**: `/agents/deep-research.md`

```yaml
---
name: deep-research
description: >
  Specialized research agent for complex investigations requiring multiple data
  sources, cross-validation, and synthesis. Automatically spawns verification
  subagents to validate findings. Use for multi-faceted queries that require
  comprehensive analysis across multiple ERPNext modules and document types.
tools:
  - search_doc
  - get_doc
  - run_report
  - analyze_trends
  - cross_validate
  - spawn_verifier
model: claude-sonnet-4-20250514
---

# Deep Research Specialist

You are a research agent designed for complex, multi-faceted investigations.

## Your Role

When the orchestrator delegates a complex query to you:

1. **Decompose**: Break down the query into sub-questions
2. **Gather**: Query multiple data sources in parallel
3. **Analyze**: Identify patterns, trends, anomalies
4. **Verify**: Spawn verification subagent to validate findings
5. **Synthesize**: Combine verified results into coherent answer

## Research Workflow

### Phase 1: Decomposition
```
Complex Query: "Why did hospital A/R increase 20% this month?"

Sub-Questions:
1. What is current A/R balance vs last month?
2. Has patient volume changed?
3. Have payer mix proportions shifted?
4. Are claim denials higher?
5. Are collection times longer?
6. Have service rates/pricing changed?
```

### Phase 2: Parallel Data Gathering
```python
# Execute multiple queries simultaneously
results = await Promise.all([
    run_report("accounts_receivable_summary"),
    run_report("patient_encounter_volume"),
    run_report("payer_mix_analysis"),
    run_report("claim_denial_rate"),
    run_report("days_in_ar_trend"),
    run_report("service_pricing_changes")
])
```

### Phase 3: Analysis
```
Findings:
- A/R increased from $1.0M to $1.2M (+20%)
- Patient volume stable (no significant change)
- Payer mix: Self-pay increased from 5% to 15%
- Claim denials unchanged (12%)
- Days in A/R increased from 38 to 45 days
- Service pricing unchanged

Hypothesis: Self-pay proportion increase driving A/R growth
(self-pay collects slower than insurance)
```

### Phase 4: Verification
```
Spawn verification subagent to:
- Cross-check payer mix calculations
- Validate self-pay collection times vs insurance
- Confirm no data entry errors
- Check for billing workflow changes
```

### Phase 5: Synthesis
```
Final Answer:

"Hospital A/R increased 20% ($1.0M → $1.2M) primarily due to
a shift in payer mix. Self-pay proportion increased from 5% to
15% this month, while patient volume remained stable.

Since self-pay accounts typically collect in 60-90 days vs
30-45 days for insurance, this shift increased overall Days in
A/R from 38 to 45 days.

Verification subagent confirmed:
✓ Payer mix calculations accurate
✓ No data entry errors detected
✓ No billing workflow changes
✓ Self-pay collection times consistent with historical

Recommendation: Monitor self-pay collection efforts and consider
payment plans to accelerate cash flow."
```

## When to Use Deep Research

- Multi-module queries (crossing financial, clinical, operational data)
- Trend analysis (comparing time periods, identifying causes)
- Root cause investigations (why did X happen?)
- What-if scenarios (impact of proposed changes)
- Cross-validation needs (ensuring data accuracy)

## Best Practices

1. **Parallel Execution**: Query independent data sources simultaneously
2. **Progressive Reporting**: Stream partial findings as they arrive
3. **Verification**: Always validate key findings with independent check
4. **Source Attribution**: Cite which reports/queries support each finding
5. **Actionable Insights**: End with recommendations, not just analysis
```

---

## Implementation in Claude Agent SDK

### Python SDK Implementation

**File**: `services/agent-gateway/src/orchestrator.py`

```python
from claude_agent_sdk import (
    ClaudeSDKClient,
    ClaudeAgentOptions,
    tool,
    create_sdk_mcp_server,
    HookMatcher
)

# ============================================================================
# ORCHESTRATOR TOOLS
# ============================================================================

@tool("classify_request", "Classify user request by industry and complexity", {
    "request": str,
    "current_doctype": str,
    "conversation_history": list
})
async def classify_request(args):
    """
    Analyzes user request to determine:
    - Industry vertical (hotel, hospital, manufacturing, retail, education, general)
    - Task complexity (simple, multi-step, deep_research)
    - Required subagents
    """
    # Use Claude to classify (can be cached prompt)
    classification = await analyze_request(
        request=args["request"],
        context=args["current_doctype"],
        history=args["conversation_history"]
    )

    return {
        "industry": classification["industry"],  # "hotel" | "hospital" | ...
        "complexity": classification["complexity"],  # "simple" | "multi_step" | "deep_research"
        "requires_subagents": classification["subagents"],  # ["hotel", "research"]
        "confidence": classification["confidence"]  # 0.0-1.0
    }

@tool("invoke_subagent", "Delegate task to specialized subagent", {
    "subagent": str,  # "hotel" | "hospital" | "research"
    "task": str,
    "context": dict
})
async def invoke_subagent(args):
    """
    Invokes a specialized subagent and returns results.

    Example:
        invoke_subagent({
            "subagent": "hotel",
            "task": "Check room availability for tonight",
            "context": {
                "current_doc": "Reservation",
                "check_in_date": "2025-10-01",
                "guest_count": 2
            }
        })
    """
    subagent_name = args["subagent"]
    task = args["task"]
    context = args["context"]

    # Load subagent configuration from markdown file
    subagent_config = load_subagent_config(f"/agents/{subagent_name}-specialist.md")

    # Create subagent with specialized tools
    subagent_options = ClaudeAgentOptions(
        mcp_servers=get_subagent_mcp_servers(subagent_name),
        allowed_tools=subagent_config["tools"],
        system_prompt=subagent_config["system_prompt"],
        max_turns=5
    )

    # Execute subagent in isolated context
    async with ClaudeSDKClient(options=subagent_options) as subagent:
        await subagent.query(f"{task}\n\nContext: {json.dumps(context)}")

        results = []
        async for event in subagent.receive_response():
            results.append(event)

        return {
            "subagent": subagent_name,
            "results": results,
            "context_used": context
        }

@tool("aggregate_results", "Combine results from multiple subagents", {
    "subagent_results": list,
    "original_query": str
})
async def aggregate_results(args):
    """
    Synthesizes results from multiple subagents into coherent response.
    """
    results = args["subagent_results"]
    query = args["original_query"]

    # Use Claude to synthesize
    synthesis = await synthesize_results(
        query=query,
        results=results
    )

    return {
        "synthesis": synthesis,
        "sources": [r["subagent"] for r in results]
    }

@tool("initiate_deep_research", "Start deep research investigation", {
    "research_question": str,
    "scope": dict
})
async def initiate_deep_research(args):
    """
    Spawns research subagent for complex investigations.
    """
    research_question = args["research_question"]
    scope = args["scope"]

    # Invoke deep research subagent
    return await invoke_subagent({
        "subagent": "deep-research",
        "task": research_question,
        "context": scope
    })

# ============================================================================
# ORCHESTRATOR SETUP
# ============================================================================

def create_orchestrator_agent(enabled_industries: list[str], session: dict):
    """
    Creates the main orchestrator agent with access to all subagents.
    """

    # Common tools available to orchestrator
    common_server = create_sdk_mcp_server(
        name="common",
        tools=[
            classify_request,
            invoke_subagent,
            aggregate_results,
            initiate_deep_research,
            # Direct execution tools (for simple queries)
            search_doc,
            get_doc,
            run_report
        ]
    )

    # Industry-specific MCP servers (for direct tool access if needed)
    industry_servers = {}
    if "hospitality" in enabled_industries:
        industry_servers["hotel"] = create_hotel_mcp_server()
    if "healthcare" in enabled_industries:
        industry_servers["hospital"] = create_hospital_mcp_server()
    # ... other industries

    # Orchestrator configuration
    options = ClaudeAgentOptions(
        mcp_servers={
            "common": common_server,
            **industry_servers
        },
        allowed_tools=[
            "mcp__common__*",  # All common tools including invoke_subagent
            # Industry tools accessible but typically delegated to subagents
        ],
        hooks={
            "PreToolUse": [
                HookMatcher(
                    matcher="*",
                    hooks=[approval_gate_hook]
                )
            ]
        },
        system_prompt=load_orchestrator_system_prompt(),
        max_turns=10
    )

    return ClaudeSDKClient(options=options)

# ============================================================================
# MAIN ENTRY POINT
# ============================================================================

async def handle_user_request(
    user_message: str,
    session: dict,
    enabled_industries: list[str],
    stream_emitter
):
    """
    Main entry point for user requests.
    """

    async with create_orchestrator_agent(enabled_industries, session) as orchestrator:
        # Send user message to orchestrator
        await orchestrator.query(user_message)

        # Stream responses back to frontend
        async for event in orchestrator.receive_response():
            await stream_emitter.emit(event)
```

---

### Subagent Configuration Loader

**File**: `services/agent-gateway/src/subagent_loader.py`

```python
import yaml
from pathlib import Path
from typing import Dict, List

def load_subagent_config(subagent_path: str) -> Dict:
    """
    Loads subagent configuration from markdown file with YAML frontmatter.

    Args:
        subagent_path: Path to subagent .md file (e.g., "/agents/hotel-specialist.md")

    Returns:
        {
            "name": str,
            "description": str,
            "tools": List[str],
            "model": str,
            "system_prompt": str
        }
    """
    content = Path(subagent_path).read_text()

    # Split frontmatter and body
    parts = content.split("---")
    frontmatter_yaml = parts[1]
    system_prompt = "---".join(parts[2:]).strip()

    # Parse YAML frontmatter
    frontmatter = yaml.safe_load(frontmatter_yaml)

    return {
        "name": frontmatter["name"],
        "description": frontmatter["description"],
        "tools": frontmatter.get("tools", []),
        "model": frontmatter.get("model", "claude-sonnet-4-20250514"),
        "system_prompt": system_prompt
    }

def get_subagent_mcp_servers(subagent_name: str) -> Dict:
    """
    Returns MCP servers for a specific subagent.

    Args:
        subagent_name: "hotel" | "hospital" | "manufacturing" | etc.

    Returns:
        Dictionary of MCP server configurations
    """
    servers = {
        "common": create_common_mcp_server()  # All subagents get common tools
    }

    if subagent_name == "hotel":
        servers["hotel"] = create_hotel_mcp_server()
    elif subagent_name == "hospital":
        servers["hospital"] = create_hospital_mcp_server()
    elif subagent_name == "manufacturing":
        servers["manufacturing"] = create_manufacturing_mcp_server()
    # ... other industries

    return servers
```

---

## Smart Routing Logic

### Automatic Delegation Pattern

```python
# In orchestrator system prompt:

"""
When you receive a request, follow this routing logic:

1. **Simple Queries** (handle directly):
   - "Show me Customer CUST-001" → get_doc()
   - "Search all invoices" → search_doc()
   - "Run sales report" → run_report()

2. **Industry-Specific** (delegate to subagent):
   - Contains industry keywords (room, patient, order set, material, inventory)
   - Requires industry-specific tools
   - Example: "Check room availability" → invoke_subagent("hotel", ...)

3. **Complex Multi-Step** (delegate to specialist + coordinate):
   - Requires workflow orchestration
   - Example: "Create patient, schedule appointment, send confirmation"
   → invoke_subagent("hospital", ...) with multi-step task

4. **Deep Research** (delegate to research subagent):
   - Analysis questions (why, how, what caused)
   - Multi-module queries
   - Trend investigation
   - Example: "Why did revenue drop last month?"
   → initiate_deep_research(...)

5. **Multi-Industry** (parallel delegation):
   - Involves multiple business units
   - Example: "Compare revenue across all verticals"
   → invoke_subagent("hotel", ...) || invoke_subagent("hospital", ...)
   → aggregate_results()
"""
```

---

## Performance Optimizations

### 1. Parallel Subagent Execution

```python
async def handle_multi_industry_query(query: str):
    """
    Execute multiple subagents in parallel.
    """
    # Spawn all subagents simultaneously
    tasks = [
        invoke_subagent({"subagent": "hotel", "task": query, "context": {}}),
        invoke_subagent({"subagent": "hospital", "task": query, "context": {}}),
        invoke_subagent({"subagent": "manufacturing", "task": query, "context": {}})
    ]

    # Wait for all results
    results = await asyncio.gather(*tasks)

    # Aggregate
    return await aggregate_results({
        "subagent_results": results,
        "original_query": query
    })
```

### 2. Subagent Result Caching

```python
from functools import lru_cache
import hashlib

@lru_cache(maxsize=100)
async def invoke_subagent_cached(subagent: str, task_hash: str, context_json: str):
    """
    Cache subagent results for identical queries within session.
    """
    return await invoke_subagent({
        "subagent": subagent,
        "task": json.loads(task_hash),
        "context": json.loads(context_json)
    })
```

### 3. Progressive Streaming

```python
async def stream_subagent_results(subagent_name: str, task: str, stream_emitter):
    """
    Stream subagent results as they arrive (don't wait for completion).
    """
    async with create_subagent(subagent_name) as subagent:
        await subagent.query(task)

        async for event in subagent.receive_response():
            # Stream immediately to frontend
            await stream_emitter.emit({
                "source": subagent_name,
                "event": event
            })
```

---

## Testing Strategy

### 1. Unit Tests for Classification

```python
# tests/test_orchestrator_routing.py

@pytest.mark.asyncio
async def test_classify_simple_query():
    result = await classify_request({
        "request": "Show me Customer CUST-001",
        "current_doctype": "Customer",
        "conversation_history": []
    })

    assert result["complexity"] == "simple"
    assert result["industry"] == "general"
    assert result["requires_subagents"] == []

@pytest.mark.asyncio
async def test_classify_hotel_query():
    result = await classify_request({
        "request": "Check room availability for tonight",
        "current_doctype": "Reservation",
        "conversation_history": []
    })

    assert result["complexity"] == "simple"
    assert result["industry"] == "hotel"
    assert "hotel" in result["requires_subagents"]
```

### 2. Integration Tests for Subagent Invocation

```python
@pytest.mark.asyncio
async def test_invoke_hotel_subagent():
    result = await invoke_subagent({
        "subagent": "hotel",
        "task": "Check room availability",
        "context": {"date": "2025-10-01", "guests": 2}
    })

    assert result["subagent"] == "hotel"
    assert "results" in result
    assert len(result["results"]) > 0
```

### 3. End-to-End Tests for Multi-Agent Workflows

```python
@pytest.mark.e2e
async def test_multi_industry_revenue_comparison():
    """
    Test orchestrator coordinating multiple subagents.
    """
    orchestrator = create_orchestrator_agent(
        enabled_industries=["hospitality", "healthcare"],
        session={"user_id": "test-user"}
    )

    async with orchestrator:
        await orchestrator.query("Compare revenue across hotel and hospital")

        events = []
        async for event in orchestrator.receive_response():
            events.append(event)

        # Verify both subagents were invoked
        subagent_calls = [e for e in events if e["type"] == "tool_call" and "invoke_subagent" in e]
        assert len(subagent_calls) >= 2

        # Verify aggregation occurred
        aggregation = [e for e in events if "aggregate_results" in e]
        assert len(aggregation) == 1
```

---

## Migration Path from Current Implementation

### Phase 1: Add Orchestrator Layer (Week 1)

1. Create `orchestrator.py` with classification and routing tools
2. Keep existing `agent.ts` for backward compatibility
3. Add subagent loader infrastructure
4. Update `/agui` endpoint to use orchestrator

### Phase 2: Create Industry Subagents (Week 2)

1. Convert existing industry tools to subagent configs
2. Hotel specialist (`/agents/hotel-specialist.md`)
3. Hospital specialist (`/agents/hospital-specialist.md`)
4. Test routing and delegation

### Phase 3: Add Deep Research (Week 3)

1. Implement research subagent
2. Add verification subagent spawning
3. Test complex queries

### Phase 4: Optimization & Polish (Week 4)

1. Add parallel execution
2. Implement caching
3. Performance benchmarking
4. Documentation and examples

---

## Success Metrics

| Metric | Target | Measurement |
|--------|--------|-------------|
| **Routing Accuracy** | >95% | Correct subagent selected for industry-specific queries |
| **Parallel Speedup** | 2-3x | Multi-industry queries vs sequential |
| **Deep Research Quality** | >90% verified | Verification subagent confirmation rate |
| **Context Efficiency** | 40% reduction | Token usage vs single-agent approach |
| **First Token Latency** | <400ms | Still meet performance target with orchestration |

---

## Conclusion

This multi-agent orchestration architecture leverages Claude Agent SDK best practices to create a **production-grade, industry-specialized coagent system** for ERPNext:

✅ **Orchestrator-Worker Pattern** - Smart routing and coordination
✅ **Industry Specialists** - Isolated contexts and focused expertise
✅ **Deep Research** - Complex investigations with verification
✅ **Parallel Processing** - Simultaneous subagent execution
✅ **Smart Routing** - Automatic delegation based on context

The architecture is **modular, scalable, and maintainable**, aligning perfectly with the Claude Agent SDK's design principles and ERPNext's multi-industry requirements.

---

**Next Steps**:
1. Review architecture with team
2. Create subagent configuration files
3. Implement orchestrator tools
4. Test routing logic
5. Measure performance improvements