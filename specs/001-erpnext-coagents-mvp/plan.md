# Implementation Plan: ERPNext Coagents SaaS (Multi-Industry Platform)

**Branch**: `001-erpnext-coagents-mvp` | **Date**: 2025-10-01 | **Spec**: [spec.md](./spec.md)
**Input**: Feature specification from `/specs/001-erpnext-coagents-mvp/spec.md`

## Summary
Multi-industry ERPNext coagent assistance platform with AI-powered chat interface, Human-in-the-Loop approval workflows, and SaaS app generation. System augments native ERPNext UI via Client Scripts, uses typed tools for safe mutations, LangGraph for deterministic workflows, and CopilotKit for streaming agent UX. Initial verticals: Hospitality (Hotel) and Healthcare (Hospital), with extensible architecture for Manufacturing, Retail, Education, and custom industries.

**Technical Approach**: Native-first augmentation (no ERPNext core modifications), tool-based architecture with server-side validation, deterministic state machines for critical workflows, and file-based audit logging. MVP targets 5-20 concurrent users per installation with single-server deployment.

## Technical Context
**Language/Version**: TypeScript 5.0+ (agent-gateway, frontend), Python 3.11+ (workflows, generator)
**Primary Dependencies**:
- Frappe Framework 15+ (ERPNext backend)
- Anthropic Claude Agent SDK (TypeScript + Python bindings)
- LangGraph 0.2+ (workflow engine - Python)
- CopilotKit 1.0+ with AG-UI (streaming agent UI)
- React 18+ (frontend shell)
- Express 4.18+ with helmet, cors, express-rate-limit (agent-gateway server)
- Server-Sent Events (SSE) for AG-UI streaming endpoint

**Storage**:
- ERPNext MariaDB/PostgreSQL (business data via Frappe ORM)
- File-based structured logs (JSON lines format, rotated daily/size-based)
- Session state in Redis (optional, for multi-instance scalability)

**Testing**:
- pytest (Python tool handlers, workflow graphs)
- Jest + React Testing Library (frontend components)
- Frappe test harness (Client Script injection, DocType integration)
- Contract tests against Frappe REST/RPC mocks

**Target Platform**: Linux server (Ubuntu 22.04+), Docker containers for services, ERPNext bench deployment
**Project Type**: Monorepo with multiple services (web architecture: ERPNext backend + agent-gateway + workflow-service + frontend)
**Performance Goals**:
- First token <400ms (target)
- Read ops <1.8s @ P95 (end-to-end)
- Write ops <2.5s @ P95 (excluding approval wait)
- Support 5-20 concurrent users

**Constraints**:
- No ERPNext core modifications (Client Scripts only)
- All mutations via Frappe REST/RPC (no raw SQL)
- Idempotent operations with retry support
- Session tokens expire per ERPNext policy

**Scale/Scope**:
- 5-20 concurrent users per installation (MVP)
- Multi-industry platform with 2 initial reference implementations (Hotel, Hospital)
- 5+ core tool operations (search, get, create, update, submit/cancel)
- Pluggable workflow architecture with 2 reference workflows (O2C for Hotel, Admissions→Orders→Billing for Hospital)
- Extensible to Manufacturing, Retail, Education, and custom industries
- 1 SaaS generator (PRD/prompt → app skeleton + workflow templates)

## Constitution Check
*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

### I. Native-First Integration
- [x] Feature augments existing ERPNext UI via Client Scripts (no parallel interfaces)
- [x] Client scripts register on appropriate DocTypes (Reservation, Invoice, Patient, Encounter, Appointment, Work Order, Sales Order, Student Applicant)
- [x] Preserves native workflows and UX patterns (side panel, not replacement forms)

### II. Safe-by-Default Mutations
- [x] All mutations flow through typed tool handlers (Claude Agent SDK tool registry)
- [x] Tools call Frappe REST/RPC APIs (no raw SQL) with session token authentication
- [x] Input validation implemented before API calls (Pydantic models for tool inputs)
- [x] Operations are idempotent with retry support (idempotency keys where feasible)

### III. Human-in-the-Loop (HITL) Approval
- [x] High-impact operations identified (create/update on submitted docs, bulk ops, workflow state changes, financial fields)
- [x] Approval prompts designed using renderAndWaitForResponse (CopilotKit HITL pattern)
- [x] Read operations and low-risk writes exempted appropriately (search, get, report, draft doc note field updates)

### IV. Deterministic Workflows (LangGraph)
- [x] Multi-step flows encoded as state machines (O2C for Hotel, Admissions→Orders→Billing for Hospital)
- [x] Single-turn operations use direct agent calls (simple Q&A, single doc lookups)
- [x] Retry policies and audit trail planned (LangGraph state persistence + structured logs)

### V. Modular Vertical Architecture
- [x] Common tools remain industry-agnostic (search_doc, get_doc, create_doc, update_doc, run_report)
- [x] Industry-specific logic isolated to vertical packages (/apps/erpnext_hotel/, /apps/erpnext_hospital/)
- [x] No circular dependencies between common and vertical code (common tools imported by verticals, not vice versa)

### VI. Spec-Driven Development
- [x] Feature has spec.md before planning (completed with clarifications)
- [x] Design artifacts in /specs/001-erpnext-coagents-mvp/ (spec.md, plan.md, research.md, data-model.md, contracts/)
- [x] TDD approach planned (contract tests before implementation, integration tests before end-to-end)

## Project Structure

### Documentation (this feature)
```
specs/001-erpnext-coagents-mvp/
├── plan.md              # This file (/plan command output)
├── research.md          # Phase 0 output (technical decisions)
├── data-model.md        # Phase 1 output (entities, state machines)
├── quickstart.md        # Phase 1 output (local dev setup)
├── contracts/           # Phase 1 output (tool schemas, API contracts)
│   ├── tools-common.yaml       # Common tool contracts (search, get, create, update, etc.)
│   ├── tools-hotel.yaml        # Hotel-specific tools (room availability, occupancy)
│   ├── tools-hospital.yaml     # Hospital-specific tools (order sets, census)
│   ├── workflows-hotel.yaml    # O2C workflow contract
│   └── workflows-hospital.yaml # Admissions→Orders→Billing workflow contract
└── tasks.md             # Phase 2 output (/tasks command)
```

### Source Code (repository root - monorepo layout)
```
Multi-Industry_ERPNext_Coagents_SaaS/
├── apps/                         # ERPNext app packages
│   ├── common/                   # Shared utilities (not an ERPNext app)
│   │   ├── __init__.py
│   │   ├── risk_classifier.py   # FR-010 hybrid risk classification
│   │   ├── session_manager.py   # Coagent session lifecycle
│   │   └── audit_logger.py      # Structured file-based logging
│   ├── erpnext_hotel/            # Hotel vertical ERPNext app
│   │   ├── hooks.py              # Client Script registration
│   │   ├── erpnext_hotel/
│   │   │   ├── doctype/          # Custom DocTypes (if any)
│   │   │   └── client_scripts/   # Copilot button injection
│   │   └── fixtures/             # Seed data (rooms, rate plans)
│   ├── erpnext_hospital/         # Hospital vertical ERPNext app
│   │   ├── hooks.py
│   │   ├── erpnext_hospital/
│   │   │   ├── doctype/
│   │   │   └── client_scripts/
│   │   └── fixtures/
│   ├── erpnext_manufacturing/    # Manufacturing vertical ERPNext app
│   │   ├── hooks.py
│   │   ├── erpnext_manufacturing/
│   │   │   ├── doctype/
│   │   │   └── client_scripts/
│   │   └── fixtures/
│   ├── erpnext_retail/           # Retail vertical ERPNext app
│   │   ├── hooks.py
│   │   ├── erpnext_retail/
│   │   │   ├── doctype/
│   │   │   └── client_scripts/
│   │   └── fixtures/
│   ├── erpnext_education/        # Education vertical ERPNext app
│   │   ├── hooks.py
│   │   ├── erpnext_education/
│   │   │   ├── doctype/
│   │   │   └── client_scripts/
│   │   └── fixtures/
│   └── custom_generated/         # Dynamically generated custom industry apps
│       ├── README.md             # Documentation for generated apps
│       ├── registry.json         # Tracks all generated apps
│       ├── .templates/           # Jinja2 templates for app generation
│       │   ├── app_template/
│       │   ├── doctype_template.json.jinja2
│       │   ├── client_script_template.js.jinja2
│       │   └── tool_handler_template.ts.jinja2
│       └── {generated_app_name}/ # Each generated app (e.g., telemedicine_visits/)
│
├── services/
│   ├── agent-gateway/            # Claude Agent SDK service (Express + TypeScript)
│   │   ├── src/
│   │   │   ├── server.ts         # Express app with helmet, cors, rate-limit
│   │   │   ├── routes/
│   │   │   │   ├── health.ts     # GET /health endpoint
│   │   │   │   ├── agui.ts       # POST /agui SSE streaming endpoint
│   │   │   │   └── index.ts      # Route aggregation
│   │   │   ├── middleware/
│   │   │   │   ├── auth.ts       # Bearer token validation
│   │   │   │   ├── validation.ts # Zod request validation
│   │   │   │   └── errorHandler.ts # Error sanitization
│   │   │   ├── agent.ts          # Main agent initialization
│   │   │   ├── tools/
│   │   │   │   ├── common/       # search_doc, get_doc, create_doc, etc.
│   │   │   │   ├── registry.ts   # Dynamic tool registration per industry
│   │   │   │   ├── hotel/        # room_availability, occupancy_report
│   │   │   │   ├── hospital/     # create_order_set, census_report
│   │   │   │   ├── manufacturing/ # material_availability, bom_explosion
│   │   │   │   ├── retail/       # inventory_check, sales_analytics
│   │   │   │   ├── education/    # applicant_workflow, interview_scheduling
│   │   │   │   └── custom/       # Dynamically generated tools
│   │   │   ├── session.ts        # Session management + RBAC token injection
│   │   │   ├── streaming.ts      # AG-UI SSE event emitter
│   │   │   └── api.ts            # Frappe REST/RPC client
│   │   ├── tests/
│   │   │   ├── contract/         # Tool contract compliance tests
│   │   │   └── integration/      # End-to-end with Frappe mock
│   │   └── package.json
│   │
│   ├── workflows/                # LangGraph workflow service (pluggable architecture)
│   │   ├── src/
│   │   │   ├── core/
│   │   │   │   ├── registry.py   # Workflow registry (load graphs by industry)
│   │   │   │   ├── executor.py   # Generic workflow execution engine
│   │   │   │   └── state.py      # Base state schemas
│   │   │   ├── graphs/
│   │   │   │   ├── hotel/
│   │   │   │   │   └── o2c.py            # Order-to-Cash workflow
│   │   │   │   ├── hospital/
│   │   │   │   │   └── admissions.py    # Admissions→Orders→Billing
│   │   │   │   ├── manufacturing/
│   │   │   │   │   └── production.py    # Work Order → Material Req → Production
│   │   │   │   ├── retail/
│   │   │   │   │   └── order_fulfillment.py # Order → Pick → Pack → Ship
│   │   │   │   ├── education/
│   │   │   │   │   └── admissions.py    # Application → Review → Interview → Admit
│   │   │   │   └── custom/       # Dynamically loaded workflows from generated apps
│   │   │   │       └── {app_name}/ # Each generated app's workflows (auto-registered)
│   │   │   ├── nodes/            # Reusable workflow nodes (approve, retry, escalate, notify)
│   │   │   └── templates/        # Workflow templates for SaaS generator
│   │   └── tests/
│   │       ├── test_core.py      # Workflow registry and executor tests
│   │       ├── test_graphs.py    # Industry-specific graph tests
│   │       └── fixtures/         # Mock workflow data per industry
│   │
│   └── generator/                # SaaS app generator service
│       ├── src/
│       │   ├── analyzer.py       # PRD/prompt → app plan
│       │   ├── generator.py      # DocType JSON + tool stub generation
│       │   ├── templates/        # Jinja2 templates for artifacts
│       │   └── api.py            # Generator API endpoints
│       └── tests/
│           └── test_generator.py # Generation output validation
│
├── frontend/
│   └── coagent/                  # CopilotKit React application
│       ├── src/
│       │   ├── App.tsx           # CopilotKit provider setup
│       │   ├── components/
│       │   │   ├── CopilotPanel.tsx      # Side panel container
│       │   │   ├── ApprovalDialog.tsx    # HITL approval UI
│       │   │   ├── EventStream.tsx       # AG-UI message feed
│       │   │   └── widgets/              # Domain-specific widgets
│       │   │       ├── AvailabilityGrid.tsx  # Hotel room availability
│       │   │       ├── BedCensus.tsx         # Hospital bed census
│       │   │       └── OrderPreview.tsx      # Order set preview
│       │   ├── hooks/
│       │   │   └── useCopilot.ts # CopilotKit integration hook
│       │   └── utils/
│       │       └── streaming.ts  # AG-UI event parsing
│       └── package.json
│
├── tests/                        # Repository-level integration tests
│   ├── contract/                 # Cross-service contract tests
│   ├── integration/              # End-to-end workflow tests
│   └── performance/              # P95 latency validation
│
├── .specify/                     # Spec-Kit artifacts
│   ├── memory/
│   │   └── constitution.md       # Project constitution v1.0.0
│   └── templates/
│
└── specs/                        # Feature specifications
    └── 001-erpnext-coagents-mvp/
```

**Structure Decision**: Web application architecture (monorepo) with ERPNext backend + agent-gateway + workflow-service + frontend. ERPNext apps deployed via Frappe bench; services containerized (Docker); frontend served via NGINX reverse proxy to agent-gateway WebSocket endpoint.

## Phase 0: Outline & Research

### Research Tasks

1. **ERPNext/Frappe API Capabilities** (NEEDS CLARIFICATION items from spec)
   - Research: Frappe REST/RPC bulk operation endpoints
     - Question: Does `/api/method/frappe.client.set_value` support batch updates?
     - Question: Is there a `/api/resource/{doctype}` bulk PATCH endpoint?
     - Decision: Determine max batch size for FR-019
   - Research: ERPNext API rate limiting
     - Question: Does Frappe enforce per-user or per-session rate limits?
     - Question: Are there documented throttling headers (X-RateLimit-*)?
     - Decision: Resolve FR-060 rate limit handling requirement
   - Research: Client Script lifecycle and injection points
     - Question: Can Client Scripts mount React components in side panels?
     - Question: How to pass doctype/name context to iframe/panel route?
     - Decision: Validate FR-002 Copilot button injection feasibility

2. **Claude Agent SDK Tool Patterns**
   - Research: Streaming tool execution with AG-UI
     - Best practice: How to emit partial results during long-running tool calls?
     - Pattern: Integrating `renderAndWaitForResponse` in tool execution flow
   - Research: Session management and RBAC token injection
     - Pattern: Storing ERPNext session token in agent context
     - Pattern: Refreshing expired tokens during long conversations
   - Decision: Agent initialization and tool registry structure

3. **LangGraph Workflow Patterns**
   - Research: Human-in-the-loop interrupt/resume patterns
     - Example: Approval step that pauses graph execution
     - Pattern: Storing graph state during user review
   - Research: Retry policies and error handling
     - Pattern: Exponential backoff for transient Frappe API failures
     - Pattern: Escalation to human after N retries
   - Research: Workflow registry and dynamic loading
     - Pattern: Loading graphs by industry + workflow name
     - Pattern: Sharing reusable nodes across industries
   - Decision: Workflow state persistence (Redis vs file-based)

4. **CopilotKit + AG-UI Integration**
   - Research: Embedding CopilotKit in iframe vs native ERPNext route
     - Trade-off: Iframe isolation vs native Frappe authentication
     - Decision: Hosting model (standalone vs Frappe custom page)
   - Research: Approval dialog UX patterns
     - Example: Multi-step approval with back/forward navigation
     - Pattern: Showing structured diff for document updates
   - Decision: Widget library for domain-specific visualizations

5. **Escalation Notification Mechanism** (FR-023 deferred)
   - Research: Frappe notification system capabilities
     - Option: Frappe Email Queue for async email notifications
     - Option: In-app notifications via Frappe Notification DocType
     - Option: Webhook to external alerting service (PagerDuty, Slack)
   - Decision: Implement in-app notifications for MVP; defer email/webhook to post-MVP

### Research Output: research.md

**Decisions**:
1. **Bulk Operations (FR-019)**: Use `/api/method/frappe.client.set_value` with custom server script for batch updates. Max batch size: 50 documents per call (Frappe default transaction limit). Throttling: 1 second delay between batches.

2. **Rate Limiting (FR-060)**: Frappe does not enforce API rate limits by default. Implement client-side throttling in agent-gateway (max 10 req/sec per session) to prevent ERPNext overload.

3. **Client Script Injection**: Client Scripts can add buttons and open Frappe custom pages. Use `frappe.set_route()` to navigate to `/app/copilot/{doctype}/{name}` route served by CopilotKit frontend.

4. **Streaming Tool Results**: Claude Agent SDK supports server-sent events. AG-UI consumes SSE stream and updates UI incrementally. Use `yield` in Python tool handlers to emit partial results.

5. **HITL Approval Pattern**: CopilotKit `renderAndWaitForResponse` pauses agent execution. LangGraph workflows use `interrupt_before` nodes for approval steps. Session state persisted in Redis with 1-hour TTL.

6. **Escalation Notifications (FR-023)**: Use Frappe Notification DocType for in-app alerts. Create notification when workflow escalates to human review. Email notifications deferred to post-MVP.

**Alternatives Considered**:
- **Bulk Operations**: Considered raw SQL batch updates; rejected due to Constitution Principle II (Safe-by-Default Mutations).
- **Client Script Injection**: Considered native ERPNext Desk modifications; rejected due to Constitution Principle I (Native-First Integration).
- **Workflow State**: Considered PostgreSQL for state persistence; chose Redis for faster session access and built-in TTL.

## Phase 1: Design & Contracts

### Data Model (data-model.md)

#### Core Entities

**CoagentSession**
```
Fields:
- id: UUID (primary key)
- user: ERPNext User ID (foreign key)
- doctype: String (Reservation, Patient, etc.)
- document_name: String (RES-2025-001, PAT-00042)
- conversation_history: JSON Array (messages + tool calls)
- pending_approval: JSON Object | null (current approval request)
- workflow_state: JSON Object | null (LangGraph state if in workflow)
- created_at: DateTime
- last_activity: DateTime
- expires_at: DateTime (ERPNext session expiry)

Relationships:
- belongs_to ERPNext User (via Frappe RBAC)
- may have one pending ApprovalRequest
- may have one WorkflowInstance

State Transitions:
- Created → Active (first message sent)
- Active → AwaitingApproval (tool proposes mutation)
- AwaitingApproval → Active (user approves/rejects)
- Active → Expired (ERPNext session timeout)

Validation:
- expires_at must be ≤ ERPNext session expiry
- Only one active session per user+doctype+document_name
```

**ApprovalRequest**
```
Fields:
- id: UUID
- session_id: UUID (foreign key to CoagentSession)
- operation_type: Enum (create, update, submit, cancel, bulk_update)
- risk_level: Enum (low, medium, high) # FR-010 classification
- target_doctype: String
- target_documents: JSON Array (list of doc names)
- proposed_changes: JSON Object (field → value map)
- preview_data: JSON Object (formatted for UI display)
- status: Enum (pending, approved, rejected)
- approved_by: ERPNext User ID | null
- decided_at: DateTime | null
- created_at: DateTime

Relationships:
- belongs_to CoagentSession
- audited in ToolExecutionLog on decision

Risk Classification Logic (FR-010):
- High: (financial/status/relationship fields) OR (submitted/cancelled docs) OR (bulk >10 docs)
- Medium: (draft docs with non-note fields) OR (bulk 2-10 docs)
- Low: (draft docs, note/description fields only) AND (single doc)
```

**ToolExecutionLog**
```
Fields:
- id: UUID
- session_id: UUID
- user_id: ERPNext User ID
- tool_name: String (search_doc, create_doc, etc.)
- tool_inputs: JSON Object
- execution_start: DateTime
- execution_end: DateTime
- latency_ms: Integer
- result_summary: JSON Object (affected doc IDs, row counts)
- success: Boolean
- error_message: String | null
- approval_id: UUID | null (if required approval)

Storage: File-based JSON Lines
Rotation: Daily or 100MB per file
Retention: 30 days minimum

Indexes (if moved to DB later):
- session_id, user_id, tool_name, execution_start
```

**WorkflowInstance**
```
Fields:
- id: UUID
- session_id: UUID
- industry: String (hotel, hospital, manufacturing, retail, education, custom)
- workflow_name: String (o2c, admissions, production, order_fulfillment, etc.)
- current_state: String (LangGraph node name)
- state_data: JSON Object (LangGraph state snapshot)
- execution_history: JSON Array (state transitions)
- retry_count: JSON Object (node → attempts)
- escalation_status: Enum (none, pending_review, resolved)
- created_at: DateTime
- updated_at: DateTime
- completed_at: DateTime | null

State Persistence: Redis key `workflow:{workflow_id}`
TTL: 24 hours (extended on activity)

Workflow Registry (pluggable):
- hotel/o2c: check_availability → create_reservation → confirm_payment → send_confirmation
- hospital/admissions: register_patient → create_admission → create_orders → schedule_billing
- manufacturing/production: check_materials → create_work_order → issue_materials → complete_production
- retail/order_fulfillment: validate_inventory → create_pick_list → pack_order → ship_order
- education/admissions: receive_application → review_application → schedule_interview → make_decision
- custom/*: Loaded dynamically from generated apps
```

**AppGenerationPlan**
```
Fields:
- id: UUID
- requested_by: ERPNext User ID
- title: String
- description: Text (PRD/prompt)
- proposed_app_name: String
- proposed_doctypes: JSON Array [{name, fields, relationships}]
- proposed_tools: JSON Array [{name, operations}]
- status: Enum (draft, pending_approval, approved, generating, completed, failed)
- approved_by: ERPNext User ID | null
- approved_at: DateTime | null
- generation_progress: JSON Object {step, status, error}
- generated_artifacts: JSON Array (file paths)
- created_at: DateTime

Generation Steps:
1. Analyze PRD → generate plan
2. Wait for admin approval
3. Generate DocType JSONs
4. Generate tool handler stubs
5. Register tools with agent SDK
6. Report completion
```

**IndustryModuleConfiguration**
```
Fields:
- id: UUID
- installation_id: String (ERPNext site name)
- enabled_verticals: JSON Array (["hotel", "hospital", "manufacturing"])
- copilot_enabled_doctypes: JSON Object {vertical → [doctypes]}
- feature_flags: JSON Object {feature_name → boolean}
- risk_classification_overrides: JSON Object | null
- created_at: DateTime
- updated_at: DateTime

Storage: ERPNext Custom DocType or config file
Default Config:
- enabled_verticals: ["hotel", "hospital"]
- copilot_enabled_doctypes: {
    "hotel": ["Reservation", "Invoice"],
    "hospital": ["Patient", "Encounter", "Appointment"]
  }
```

### API Contracts (contracts/)

#### contracts/tools-common.yaml
```yaml
tools:
  search_doc:
    description: Search ERPNext documents by type with filters
    input:
      doctype: string (required)
      filters: object (field → value pairs)
      fields: array<string> (columns to return)
      limit: integer (default 20, max 100)
    output:
      documents: array<object>
      total_count: integer
    frappe_api: GET /api/resource/{doctype}?filters={json}&fields={json}&limit_page_length={limit}
    approval_required: false
    risk_level: N/A

  get_doc:
    description: Retrieve full document by type and ID
    input:
      doctype: string (required)
      name: string (required, document ID)
    output:
      document: object (full doc with all fields)
    frappe_api: GET /api/resource/{doctype}/{name}
    approval_required: false
    risk_level: N/A

  create_doc:
    description: Create new ERPNext document
    input:
      doctype: string (required)
      data: object (field → value pairs)
    output:
      name: string (created doc ID)
      document: object (created doc)
    frappe_api: POST /api/resource/{doctype} with data payload
    approval_required: true
    risk_level: dynamic (FR-010 classification based on doctype + fields)

  update_doc:
    description: Update existing document fields
    input:
      doctype: string (required)
      name: string (required)
      updates: object (field → new value pairs)
    output:
      document: object (updated doc)
    frappe_api: PUT /api/resource/{doctype}/{name} with updates payload
    approval_required: true
    risk_level: dynamic (FR-010 classification)

  submit_doc:
    description: Submit document (move to submitted state)
    input:
      doctype: string (required)
      name: string (required)
    output:
      document: object (submitted doc)
    frappe_api: POST /api/method/frappe.client.submit with doctype+name
    approval_required: true
    risk_level: high (always)

  cancel_doc:
    description: Cancel submitted document
    input:
      doctype: string (required)
      name: string (required)
      reason: string (optional)
    output:
      document: object (cancelled doc)
    frappe_api: POST /api/method/frappe.client.cancel with doctype+name
    approval_required: true
    risk_level: high (always)

  run_report:
    description: Execute ERPNext report with filters
    input:
      report_name: string (required)
      filters: object (report-specific filters)
      limit: integer (default 100, max 1000)
    output:
      columns: array<object> (column definitions)
      data: array<array> (result rows)
    frappe_api: POST /api/method/frappe.desk.query_report.run with report_name+filters
    approval_required: false
    risk_level: N/A

  bulk_update:
    description: Update multiple documents in batch
    input:
      doctype: string (required)
      updates: array<{name, fields}> (max 50 items per FR-019)
    output:
      success_count: integer
      failed: array<{name, error}>
    frappe_api: Custom server script /api/method/coagent.bulk_update
    approval_required: true
    risk_level: high (always for bulk >1)
```

#### contracts/tools-hotel.yaml
```yaml
tools:
  room_availability:
    description: Check room availability by date range and criteria
    input:
      check_in: date (required, YYYY-MM-DD)
      check_out: date (required)
      guest_count: integer (default 1)
      room_type: string (optional)
    output:
      available_rooms: array<{room_name, room_type, rate, capacity}>
      total_available: integer
    implementation: search_doc(doctype="Room Item", filters=...) + availability logic
    approval_required: false

  occupancy_report:
    description: Hotel occupancy and revenue metrics
    input:
      date_range: {from, to} (dates)
      group_by: enum (day, week, month)
    output:
      occupancy_rate: float (percentage)
      adr: float (Average Daily Rate)
      revpar: float (Revenue Per Available Room)
      data: array<{date, occupancy, revenue}>
    implementation: run_report(report_name="Hotel Occupancy Report", filters=...)
    approval_required: false
```

#### contracts/tools-hospital.yaml
```yaml
tools:
  create_order_set:
    description: Create group of clinical orders (labs + medications)
    input:
      patient: string (Patient ID)
      encounter: string (Encounter ID)
      protocol_name: string (e.g., "Sepsis Protocol")
      orders: array<{type, item, quantity, instructions}>
    output:
      created_orders: array<{order_id, type, item}>
    implementation: Multiple create_doc(doctype="Lab Test Request" | "Medication Order", ...)
    approval_required: true
    risk_level: high (clinical orders)

  census_report:
    description: Daily hospital census by ward/department
    input:
      date: date (default today)
      department: string (optional filter)
    output:
      census_data: array<{ward, occupied_beds, total_beds, occupancy_rate}>
      total_patients: integer
    implementation: run_report(report_name="Hospital Census", filters=...)
    approval_required: false

  ar_by_payer:
    description: Accounts receivable by insurance payer
    input:
      as_of_date: date (default today)
      payer: string (optional filter)
    output:
      ar_data: array<{payer, outstanding_amount, aging_buckets}>
      total_ar: float
    implementation: run_report(report_name="AR by Payer", filters=...)
    approval_required: false
```

#### contracts/tools-manufacturing.yaml
```yaml
tools:
  material_availability:
    description: Check material availability across warehouses for production
    input:
      items: array<{item_code, required_qty}>
      warehouses: array<string> (optional, default all)
    output:
      availability: array<{item_code, available_qty, shortage_qty, warehouses}>
    implementation: search_doc(doctype="Bin", filters=...) + aggregation
    approval_required: false

  bom_explosion:
    description: Explode BOM to show all sub-components and quantities
    input:
      item_code: string (finished good)
      quantity: float (production quantity)
    output:
      components: array<{item_code, qty_per_unit, total_qty, level}>
    implementation: run_report(report_name="BOM Explosion", filters=...)
    approval_required: false
```

#### contracts/tools-retail.yaml
```yaml
tools:
  inventory_check:
    description: Check inventory levels across store locations
    input:
      item_code: string (optional)
      warehouse: string (optional)
      threshold: float (optional, alert if below)
    output:
      inventory: array<{item_code, warehouse, actual_qty, reorder_level, status}>
    implementation: search_doc(doctype="Bin", filters=...) + threshold logic
    approval_required: false

  sales_analytics:
    description: Sales performance metrics by period and location
    input:
      date_range: {from, to}
      warehouse: string (optional)
      item_group: string (optional)
    output:
      metrics: {total_sales, units_sold, top_items, trend}
    implementation: run_report(report_name="Sales Analytics", filters=...)
    approval_required: false
```

#### contracts/tools-education.yaml
```yaml
tools:
  applicant_workflow:
    description: Move applicant through admission stages
    input:
      applicant_id: string
      action: enum (shortlist, schedule_interview, reject, admit)
      notes: string (optional)
    output:
      updated_applicant: object
      next_steps: array<string>
    implementation: update_doc + workflow state change
    approval_required: true
    risk_level: medium

  interview_scheduling:
    description: Schedule interviews for applicants
    input:
      applicants: array<string> (applicant IDs)
      interviewer: string
      date_range: {from, to}
      duration_minutes: integer
    output:
      scheduled: array<{applicant, interviewer, datetime}>
      conflicts: array<{applicant, reason}>
    implementation: search_doc(doctype="Event", ...) + create_doc for slots
    approval_required: true
    risk_level: low
```

#### contracts/workflows-hotel.yaml
```yaml
workflow: hotel_o2c
description: Order-to-Cash workflow for hotel reservations
nodes:
  check_availability:
    tool: room_availability
    inputs: {check_in, check_out, guest_count}
    transitions:
      - if rooms_available > 0 → create_reservation
      - if rooms_available == 0 → end (no_availability)

  create_reservation:
    tool: create_doc
    inputs: {doctype: "Reservation", data: {guest, room, dates, rate}}
    approval: true (HITL gate)
    transitions:
      - if approved → confirm_payment
      - if rejected → end (user_cancelled)

  confirm_payment:
    tool: submit_doc
    inputs: {doctype: "Reservation", name: reservation_id}
    approval: true
    retry_policy: {max_attempts: 3, backoff: exponential}
    transitions:
      - if success → send_confirmation
      - if failure after retries → escalate_to_manager

  send_confirmation:
    tool: create_doc
    inputs: {doctype: "Communication", communication_type: "Email", ...}
    approval: false (low risk)
    transitions: → end (completed)

  escalate_to_manager:
    type: human_intervention
    notification: in-app (FR-023)
    transitions: → end (escalated)

state_schema:
  guest: object
  check_in: date
  check_out: date
  available_rooms: array
  reservation_id: string | null
  payment_confirmed: boolean
  confirmation_sent: boolean
```

#### contracts/workflows-hospital.yaml
```yaml
workflow: hospital_admissions
description: Admissions → Orders → Billing workflow
industry: hospital
nodes:
  register_patient:
    tool: create_doc
    inputs: {doctype: "Patient", data: {name, dob, contact}}
    approval: true
    transitions: → create_admission

  create_admission:
    tool: create_doc
    inputs: {doctype: "Patient Admission", patient: patient_id, ward: ward_id}
    approval: true
    transitions: → create_orders

  create_orders:
    tool: create_order_set
    inputs: {patient, encounter, protocol_name, orders}
    approval: true (high risk)
    retry_policy: {max_attempts: 2}
    transitions:
      - if success → schedule_billing
      - if failure → escalate_to_clinician

  schedule_billing:
    tool: create_doc
    inputs: {doctype: "Sales Invoice", patient, items: order_items}
    approval: true
    transitions: → end (completed)

  escalate_to_clinician:
    type: human_intervention
    notification: in-app
    transitions: → end (escalated)

state_schema:
  patient_data: object
  patient_id: string | null
  admission_id: string | null
  orders: array
  invoice_id: string | null
```

#### contracts/workflows-manufacturing.yaml
```yaml
workflow: manufacturing_production
description: Production planning and execution workflow
industry: manufacturing
nodes:
  check_materials:
    tool: material_availability
    inputs: {items: bom_items, warehouses: production_warehouses}
    approval: false
    transitions:
      - if all_available → create_work_order
      - if shortage → create_purchase_requisitions

  create_purchase_requisitions:
    tool: bulk_update
    inputs: {doctype: "Material Request", updates: shortage_items}
    approval: true
    transitions: → wait_for_materials (human intervention)

  create_work_order:
    tool: create_doc
    inputs: {doctype: "Work Order", item, qty, bom}
    approval: true
    transitions: → issue_materials

  issue_materials:
    tool: create_doc
    inputs: {doctype: "Stock Entry", purpose: "Material Issue", items}
    approval: true
    retry_policy: {max_attempts: 3}
    transitions: → complete_production

  complete_production:
    tool: submit_doc
    inputs: {doctype: "Work Order", name: work_order_id}
    approval: true
    transitions: → end (completed)

state_schema:
  bom_items: array
  material_status: object
  work_order_id: string | null
  issued_materials: array
```

#### contracts/workflows-retail.yaml
```yaml
workflow: retail_order_fulfillment
description: Order to shipment workflow
industry: retail
nodes:
  validate_inventory:
    tool: inventory_check
    inputs: {items: order_items}
    approval: false
    transitions:
      - if available → create_pick_list
      - if insufficient → partial_fulfillment_decision

  create_pick_list:
    tool: create_doc
    inputs: {doctype: "Pick List", sales_order: order_id, items}
    approval: false (auto-generated)
    transitions: → pack_order

  pack_order:
    tool: submit_doc
    inputs: {doctype: "Pick List", name: pick_list_id}
    approval: false
    transitions: → ship_order

  ship_order:
    tool: create_doc
    inputs: {doctype: "Delivery Note", sales_order, items, carrier}
    approval: true
    transitions: → end (completed)

  partial_fulfillment_decision:
    type: human_intervention
    notification: in-app
    transitions:
      - if approved_partial → create_pick_list
      - if wait_for_stock → end (pending)

state_schema:
  order_id: string
  order_items: array
  inventory_status: object
  pick_list_id: string | null
  delivery_note_id: string | null
```

#### contracts/workflows-education.yaml
```yaml
workflow: education_admissions
description: Student application to admission workflow
industry: education
nodes:
  receive_application:
    tool: create_doc
    inputs: {doctype: "Student Applicant", data: applicant_data}
    approval: false (submitted by applicant)
    transitions: → review_application

  review_application:
    tool: applicant_workflow
    inputs: {applicant_id, action: "shortlist" or "reject", notes}
    approval: true
    transitions:
      - if shortlisted → schedule_interview
      - if rejected → end (rejected)

  schedule_interview:
    tool: interview_scheduling
    inputs: {applicants: [applicant_id], interviewer, date_range, duration}
    approval: true
    retry_policy: {max_attempts: 2}
    transitions: → conduct_interview

  conduct_interview:
    type: human_intervention (external process)
    notification: in-app
    transitions: → make_decision

  make_decision:
    tool: applicant_workflow
    inputs: {applicant_id, action: "admit" or "reject", notes}
    approval: true
    transitions: → end (completed)

state_schema:
  applicant_id: string
  applicant_data: object
  interview_scheduled: boolean
  interview_datetime: datetime | null
  final_decision: enum | null
```

### Contract Tests Generation

Generate test files for each tool contract:

**tests/contract/test_common_tools.py**
```python
def test_search_doc_contract():
    # Assert request schema matches contract
    # Assert Frappe API called with correct params
    # Assert response schema matches contract

def test_create_doc_requires_approval():
    # Assert approval gate triggered for mutations
```

**tests/contract/test_hotel_tools.py**
```python
def test_room_availability_output_schema():
    # Assert available_rooms array has required fields
```

### Integration Test Scenarios

From user stories in spec.md:

**tests/integration/test_hotel_reservation.py**
```python
def test_front_desk_availability_query():
    # Given: User on Reservation form
    # When: Asks "What rooms available tonight for 2 guests?"
    # Then: Copilot streams room results without approval

def test_reservation_creation_with_approval():
    # Given: User requests "Create reservation for room 101"
    # When: Copilot proposes create_doc
    # Then: Approval dialog shown with preview
    # When: User approves
    # Then: Reservation created in ERPNext
```

**tests/integration/test_hospital_orders.py**
```python
def test_order_set_creation_with_approval():
    # Given: Clinician on Encounter form
    # When: Requests "Create sepsis protocol orders"
    # Then: Copilot shows preview of orders (CBC, cultures, antibiotics)
    # When: Clinician approves
    # Then: Multiple Order docs created and linked to Encounter
```

### Quickstart Documentation (quickstart.md)

```markdown
# ERPNext Coagents SaaS - Local Development Quickstart

## Prerequisites
- Python 3.11+
- Node.js 18+
- Docker + Docker Compose
- ERPNext development environment (Frappe bench)

## Setup Steps

### 1. Clone Repository
\`\`\`bash
git clone <repo-url>
cd Multi-Industry_ERPNext_Coagents_SaaS
git checkout 001-erpnext-coagents-mvp
\`\`\`

### 2. Install ERPNext Apps
\`\`\`bash
cd apps/erpnext_hotel
bench get-app .
bench install-app erpnext_hotel

cd ../erpnext_hospital
bench get-app .
bench install-app erpnext_hospital
\`\`\`

### 3. Start Services
\`\`\`bash
# Redis for session state
docker-compose up -d redis

# Agent Gateway
cd services/agent-gateway
npm install
npm run dev

# Workflow Service
cd ../workflows
pip install -r requirements.txt
python -m uvicorn src.api:app --reload

# Frontend
cd ../../frontend/coagent
npm install
npm run dev
\`\`\`

### 4. Configure ERPNext
- Navigate to Settings → Industry Modules
- Enable "Hotel" and "Hospital" verticals
- Set Copilot-enabled DocTypes

### 5. Test Copilot Button
- Open Reservation form in ERPNext
- Click "Copilot" button (top-right)
- Side panel opens with chat interface

## Running Tests
\`\`\`bash
# Contract tests
cd services/agent-gateway
npm test -- --testPathPattern=contract

# Integration tests
cd tests/integration
pytest test_hotel_reservation.py -v

# Workflow tests
cd services/workflows
pytest src/tests/test_graphs.py -v
\`\`\`

## Environment Variables
\`\`\`
ERPNEXT_API_URL=http://localhost:8000
ERPNEXT_API_KEY=<your-api-key>
ANTHROPIC_API_KEY=<your-claude-key>
REDIS_URL=redis://localhost:6379
LOG_DIR=./logs
LOG_RETENTION_DAYS=30
\`\`\`

## Troubleshooting
- **Copilot button not appearing**: Check Client Script is active in DocType
- **401 Unauthorized**: Verify ERPNext session token is valid
- **Approval dialog not showing**: Check CopilotKit WebSocket connection
\`\`\`

### Update Agent Context File

Run agent context update script:
```bash
.specify/scripts/bash/update-agent-context.sh claude
```

Output: `CLAUDE.md` in repository root with:
- Tech stack summary (Frappe, Claude Agent SDK, LangGraph, CopilotKit)
- Recent changes (Phase 1 design completed)
- Key file paths (apps/, services/, frontend/, specs/)

## Phase 2: Task Planning Approach
*This section describes what the /tasks command will do - DO NOT execute during /plan*

**Task Generation Strategy**:
- Load contracts from `/specs/001-erpnext-coagents-mvp/contracts/`
- Each tool contract → contract test task [P] (tools can be tested in parallel)
- Each workflow node → workflow test task (sequential due to state dependencies)
- Common tools before industry-specific tools (dependency ordering)
- Client Scripts after tool handlers are ready (integration dependency)
- Frontend components after agent-gateway API is stable

**Ordering Strategy**:
- Phase 3.1: Setup (project structure, dependencies)
- Phase 3.2: Contract tests (TDD - tests before implementation)
- Phase 3.3: Common tools (search, get, create, update)
- Phase 3.4: Industry tools (hotel, hospital)
- Phase 3.5: Workflow graphs (hotel_o2c, hospital_admissions)
- Phase 3.6: Frontend UI (CopilotKit, approval dialogs)
- Phase 3.7: Client Scripts (ERPNext injection)
- Phase 3.8: Generator service (SaaS app generation)
- Phase 3.9: Integration tests (end-to-end scenarios)
- Phase 3.10: Performance validation (P95 targets)

**Estimated Output**: 60-70 numbered tasks in tasks.md

**Parallel Execution Opportunities**:
- All contract tests [P] (different files)
- Common tool implementations [P] (different tool files)
- Hotel vs Hospital tool implementations [P] (different vertical packages)
- Frontend component development [P] (different React components)

**IMPORTANT**: This phase is executed by the /tasks command, NOT by /plan

## Phase 3+: Future Implementation
*These phases are beyond the scope of the /plan command*

**Phase 3**: Task execution (/tasks command creates tasks.md)
**Phase 4**: Implementation (execute tasks.md following constitutional principles)
**Phase 5**: Validation (run tests, execute quickstart.md, performance validation against FR-054, FR-055, FR-056)

## Complexity Tracking
*Fill ONLY if Constitution Check has violations that must be justified*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|-----------|------------|-------------------------------------|
| None | N/A | N/A |

All constitutional principles satisfied. No complexity deviations.

## Progress Tracking
*This checklist is updated during execution flow*

**Phase Status**:
- [x] Phase 0: Research complete (Frappe API, Claude Agent SDK, LangGraph, CopilotKit patterns)
- [x] Phase 1: Design complete (data model, contracts, quickstart)
- [x] Phase 2: Task planning approach described
- [ ] Phase 3: Tasks generated (/tasks command)
- [ ] Phase 4: Implementation complete
- [ ] Phase 5: Validation passed

**Gate Status**:
- [x] Initial Constitution Check: PASS (all 6 principles satisfied)
- [x] Post-Design Constitution Check: PASS (no violations introduced)
- [x] All NEEDS CLARIFICATION resolved (5 clarified, 3 deferred to research)
- [x] Complexity deviations documented (none)

---
*Based on Constitution v1.0.0 - See `.specify/memory/constitution.md`*
