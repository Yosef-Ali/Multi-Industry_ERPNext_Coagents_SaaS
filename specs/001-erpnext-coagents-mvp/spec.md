# Feature Specification: ERPNext Coagents SaaS (Multi-Industry Platform)

**Feature Branch**: `001-erpnext-coagents-mvp`
**Created**: 2025-10-01
**Status**: Draft
**Input**: Multi-industry ERPNext coagent assistance system with safe automation and SaaS app generation. Initial implementations for Hotel and Hospital verticals, with extensible architecture for additional industries.

## Clarifications

### Session 2025-10-01
- Q: FR-010 - How should operations be classified as low-risk vs high-risk for approval prompts? → A: Hybrid approach combining field sensitivity (text/note vs financial/status), document state (draft vs submitted), and operation scope (single vs bulk), with configurable thresholds
- Q: FR-055 - Do performance SLAs include or exclude ERPNext API latency? → A: End-to-end measurement (user request → ERPNext API → response streaming). System owns full latency.
- Q: FR-029 - What artifacts should app generation produce? → A: DocType JSON schemas + agent tool handler stubs (create, read, update functions) registered with coagent SDK
- Q: FR-042 - Where should logs be stored and for how long? → A: File-based logs with automatic rotation. Retention disk-space dependent, recommended minimum 30 days.
- Q: Scale assumptions - What are concurrent user expectations for MVP? → A: Small team scale (5-20 concurrent users per installation, single-server deployment sufficient)

---

## ⚡ Quick Guidelines
- ✅ Focus on WHAT users need and WHY
- ❌ Avoid HOW to implement (no tech stack, APIs, code structure)
- 👥 Written for business stakeholders, not developers

---

## User Scenarios & Testing *(mandatory)*

### Primary User Story

**Hospitality (Hotel) Scenario**: A front desk agent is processing a walk-in guest requesting a room. They open the Reservation form in ERPNext and click a "Copilot" button that appears on the form. A side panel opens where they can chat with an AI assistant. They ask "What rooms are available tonight for 2 guests?" The assistant proposes to search available rooms and shows what it plans to do. The agent clicks "Approve" and sees results stream in real-time showing available room options with pricing.

**Healthcare (Hospital) Scenario**: A doctor is documenting a patient encounter and needs to create a standard order set (labs + medications). Instead of manually creating multiple orders, they ask the copilot "Create sepsis protocol orders". The assistant shows a preview of the orders it will create (CBC, blood cultures, broad-spectrum antibiotics with dosing). The clinician reviews and clicks "Approve", and the system creates all linked documents in ERPNext.

**Manufacturing Scenario**: A production planner opens a Work Order form and asks the copilot "Check material availability for this production run". The assistant searches inventory across warehouses, identifies shortages, and displays results with recommendations. When the planner asks to "Create purchase requisitions for missing materials", the assistant shows a preview of requisitions to be created with quantities and preferred suppliers, awaiting approval.

**Retail Scenario**: A store manager viewing a Sales Order asks the copilot "What's the delivery status and estimated arrival?" The assistant queries linked delivery notes, shipping integrations, and displays tracking information. When the manager says "Send update to customer", the assistant drafts a communication preview for approval before sending.

**Education Scenario**: An admissions officer on a Student Applicant form asks "Schedule interviews for shortlisted candidates this week". The assistant checks interviewer availability, proposes time slots, and shows a preview of calendar events and email notifications to be created, requiring approval before execution.

**Admin SaaS Generation Scenario**: An administrator from any industry wants to add a custom module to their ERPNext instance. They provide a brief description (e.g., "Telemedicine Visit module" for healthcare, "Equipment Maintenance Tracker" for manufacturing, "Member Loyalty Program" for retail). The system analyzes the request and generates a proposed app structure showing new document types, fields, and workflows. The admin reviews the plan, approves it, and the system generates the custom ERPNext app skeleton ready for refinement.

### Acceptance Scenarios

1. **Given** a user is viewing a Reservation form in ERPNext hotel module, **When** they click the Copilot button, **Then** a side panel opens with a chat interface and the assistant greets them with context about the current reservation

2. **Given** a clinician types a request to create clinical orders, **When** the assistant determines this requires data changes, **Then** the assistant displays an approval prompt showing exactly what will be created before executing any actions

3. **Given** a front desk agent requests availability data, **When** the assistant retrieves room information, **Then** results stream into the chat panel incrementally without requiring approval (read-only operation)

4. **Given** an admin submits an app generation request, **When** the system creates an app plan, **Then** the plan shows proposed document types, fields, relationships, and workflow steps in a reviewable format requiring explicit approval before generation begins

5. **Given** a billing user requests a financial report (ADR/RevPAR for hotel or A/R by payer for hospital), **When** the assistant runs the report, **Then** results display in a formatted table with export options

6. **Given** a user's ERPNext role lacks permission for a requested operation, **When** the assistant attempts the action via API, **Then** the system denies the operation and explains the permission requirement to the user

### Edge Cases

- What happens when a user approves an action but the ERPNext API call fails (network timeout, validation error)? System should show clear error message and allow retry without re-approval
- How does the system handle concurrent modifications (user approves room reservation but room becomes booked by another user before execution)? System should detect conflict and notify user
- What happens when a multi-step workflow is interrupted mid-execution (browser closed, session expired)? System should maintain state and allow resumption or rollback
- How does the assistant handle ambiguous requests (user asks "create order" without specifying what kind)? System should ask clarifying questions before proposing actions
- What happens when app generation is approved but encounters errors during skeleton creation? System should report partial progress and allow continuation or rollback

---

## Requirements *(mandatory)*

### Functional Requirements

**Core Coagent Interface**
- **FR-001**: System MUST provide a conversational chat interface accessible from within ERPNext forms
- **FR-002**: System MUST display an entry-point button on selected document types (Reservation, Invoice, Patient, Encounter, Appointment, Work Order, Sales Order, Student Applicant)
- **FR-003**: System MUST maintain conversation context about the current document being viewed
- **FR-004**: System MUST stream responses incrementally as they are generated (not batch display)
- **FR-005**: System MUST display assistant messages, tool execution status, and partial results in a unified event stream

**Human-in-the-Loop Approval**
- **FR-006**: System MUST require explicit user approval before executing any data-modifying operations (create, update, submit, cancel, bulk operations)
- **FR-007**: System MUST show preview of proposed changes in approval prompts (which documents, what fields, what values)
- **FR-008**: System MUST allow users to approve or reject proposed actions
- **FR-009**: System MUST allow read-only operations (search, get, report) to execute without approval prompts
- **FR-010**: System MUST classify operation risk using hybrid criteria: field sensitivity (text/note fields = lower risk; financial/status/relationship fields = higher risk), document state (draft = lower risk; submitted/cancelled = higher risk), and operation scope (single document = lower risk; bulk operations = higher risk). Risk thresholds MUST be configurable per deployment.

**Tool Execution & Data Access**
- **FR-011**: System MUST provide ability to search documents by type with filters and field selection
- **FR-012**: System MUST provide ability to retrieve full document details by type and ID
- **FR-013**: System MUST provide ability to run existing ERPNext reports with filter parameters
- **FR-014**: System MUST provide ability to create new documents of any type
- **FR-015**: System MUST provide ability to update existing documents (partial field updates)
- **FR-016**: System MUST provide ability to submit documents (move to submitted state)
- **FR-017**: System MUST provide ability to cancel documents (move to cancelled state)
- **FR-018**: System MUST provide ability to execute workflow actions on documents
- **FR-019**: System MUST provide ability to perform bulk operations across multiple documents (maximum batch size and throttling rules to be determined during technical planning)

**Multi-Step Workflows**
- **FR-020**: System MUST support multi-step business processes that span multiple tool executions (e.g., create patient → create appointment → send confirmation)
- **FR-021**: System MUST provide ability to retry failed steps in multi-step processes
- **FR-022**: System MUST allow workflows to branch based on data conditions (e.g., if insurance approved then process claim, else escalate)
- **FR-023**: System MUST provide escalation points in workflows where human review is required before proceeding (notification mechanism to be determined during technical planning)
- **FR-024**: System MUST maintain audit trail of workflow execution showing each state transition with timestamp

**SaaS App Generation**
- **FR-025**: System MUST accept app generation requests containing a title and natural language description
- **FR-026**: System MUST analyze the request and propose an app structure including document types, fields, and relationships
- **FR-027**: System MUST display the proposed app plan for admin review before generation
- **FR-028**: System MUST require explicit admin approval before generating app artifacts
- **FR-029**: System MUST generate ERPNext app skeleton including DocType JSON schema files (fields, permissions, relationships) and agent tool handler stub functions (create, read, update, delete operations) for each document type
- **FR-030**: System MUST automatically register generated tool handlers with the coagent SDK so they are immediately available for agent use after generation
- **FR-031**: System MUST report generation progress and any errors encountered during app creation

**Security & Permissions**
- **FR-032**: System MUST authenticate coagent sessions using the logged-in ERPNext user's credentials
- **FR-033**: System MUST enforce all standard ERPNext role-based permissions on tool operations
- **FR-034**: System MUST enforce document-level permissions (user can only access documents their role allows)
- **FR-035**: System MUST validate all tool inputs before execution to prevent injection attacks
- **FR-036**: System MUST NOT store user credentials in any agent state or logs
- **FR-037**: System MUST use session tokens that expire according to ERPNext session policy

**Audit & Logging**
- **FR-038**: System MUST log every tool execution with user ID, timestamp, tool name, and input parameters
- **FR-039**: System MUST log tool execution results including affected document IDs and operation success/failure
- **FR-040**: System MUST log approval decisions (approved/rejected, timestamp, user)
- **FR-041**: System MUST log workflow state transitions for multi-step processes
- **FR-042**: System MUST store logs in structured file format with automatic rotation based on file size or time intervals. Minimum recommended retention period is 30 days, with actual retention determined by available disk space and configurable rotation policy.

**Industry-Specific Features**
- **FR-043**: System MUST support industry-specific tools and workflows through modular vertical packages
- **FR-044**: Hospitality (Hotel) vertical MUST support querying room availability by date range, guest count, and room attributes
- **FR-045**: Hospitality vertical MUST provide access to occupancy reports, ADR (Average Daily Rate), and RevPAR (Revenue Per Available Room) metrics
- **FR-046**: Healthcare (Hospital) vertical MUST support creating clinical order sets (groups of related orders)
- **FR-047**: Healthcare vertical MUST provide access to daily census reports and accounts receivable by payer reports
- **FR-048**: Manufacturing vertical MUST support material availability checks across warehouses and BOM explosion
- **FR-049**: Retail vertical MUST support inventory level queries across store locations and sales analytics
- **FR-050**: Education vertical MUST support student applicant workflow automation and scheduling
- **FR-051**: System MUST allow adding new industry verticals without modifying core platform code
- **FR-052**: System MUST isolate industry-specific functionality into separate modules that can be deployed independently
- **FR-053**: Each industry vertical MUST be activatable/deactivatable via configuration without affecting other verticals

**Performance & Responsiveness**
- **FR-054**: System MUST begin streaming the first response token within 400ms of tool execution start (target, not hard requirement)
- **FR-055**: Read operations (search, get, report) MUST complete within 1.8 seconds at 95th percentile, measured end-to-end from user request through ERPNext API call to final response streaming completion
- **FR-056**: Write operations (excluding user approval wait time) MUST complete within 2.5 seconds at 95th percentile, measured end-to-end including ERPNext API execution time
- **FR-061**: System MUST support 5-20 concurrent users per installation in MVP deployment, with single-server architecture sufficient to meet performance targets

**Reliability & Error Handling**
- **FR-057**: System MUST make write operations idempotent where feasible (repeated execution produces same result)
- **FR-058**: System MUST provide clear error messages when operations fail, including ERPNext validation errors
- **FR-059**: System MUST allow users to retry failed operations without re-typing requests
- **FR-060**: System MUST handle ERPNext API rate limits gracefully with automatic backoff if rate limits exist (to be confirmed during ERPNext API research in planning phase)

### Key Entities *(include if feature involves data)*

**Coagent Session**: Represents a user's active conversation with the assistant. Contains conversation history, current document context, pending approvals, and workflow state. Each session maps 1:1 to an ERPNext user session.

**Tool Execution Log**: Audit record of a single tool invocation. Contains user who initiated, timestamp, tool name, input parameters, result summary, affected ERPNext document IDs, execution latency, and success/failure status.

**Approval Request**: A proposed action awaiting user confirmation. Contains description of proposed changes, list of documents/fields to be modified, approval status (pending/approved/rejected), user who approved/rejected, and timestamp.

**Workflow Instance**: A running multi-step business process. Contains workflow definition, current state, execution history (state transitions), retry count per step, escalation status, and completion status.

**App Generation Plan**: Proposed structure for a generated ERPNext app. Contains app name, description, list of proposed document types with fields and relationships, list of tool handlers to generate, and approval status.

**Industry Module Configuration**: Defines which features are enabled for a given ERPNext installation. Contains enabled industry verticals (Hospitality, Healthcare, Manufacturing, Retail, Education, etc.), enabled document types for copilot button injection per vertical, and feature flags for experimental capabilities. Each installation can activate multiple verticals simultaneously.

---

## Review & Acceptance Checklist
*GATE: Automated checks run during main() execution*

### Content Quality
- [x] No implementation details (languages, frameworks, APIs)
- [x] Focused on user value and business needs
- [x] Written for non-technical stakeholders
- [x] All mandatory sections completed

### Requirement Completeness
- [x] No [NEEDS CLARIFICATION] markers remain (5 critical items clarified; 3 deferred to planning)
- [x] Requirements are testable and unambiguous
- [x] Success criteria are measurable
- [x] Scope is clearly bounded
- [x] Dependencies and assumptions identified

**Resolved in Session 2025-10-01**:
1. ✅ **FR-010**: Risk classification uses hybrid approach (field + state + scope)
2. ✅ **FR-029**: App generation produces DocType JSONs + tool handler stubs
3. ✅ **FR-030**: Tool handlers auto-registered with coagent SDK
4. ✅ **FR-042**: File-based logs with rotation, 30-day minimum retention
5. ✅ **FR-055**: Performance SLAs measured end-to-end (includes ERPNext API)
6. ✅ **Scale**: MVP targets 5-20 concurrent users, single-server deployment

**Deferred to Planning Phase** (lower impact, technical decisions):
1. **FR-019**: Maximum batch size for bulk operations and throttling strategy
2. **FR-023**: Escalation notification mechanism (email, in-app, webhook)
3. **FR-060**: ERPNext API rate limit handling strategy

---

## Execution Status
*Updated by main() during processing*

- [x] User description parsed
- [x] Key concepts extracted
- [x] Ambiguities marked
- [x] User scenarios defined
- [x] Requirements generated
- [x] Entities identified
- [x] Review checklist passed (critical clarifications resolved)

---
