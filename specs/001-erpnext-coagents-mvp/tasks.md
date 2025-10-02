# Tasks: ERPNext Coagents SaaS (Multi-Industry Platform)

**Input**: Design documents from `/specs/001-erpnext-coagents-mvp/`
**Prerequisites**: plan.md (required), spec.md, research decisions, data model, tool/workflow contracts

## Path Conventions
- **Monorepo root**: `/Users/mekdesyared/Multi-Industry_ERPNext_Coagents_SaaS`
- **ERPNext apps**: `apps/erpnext_hotel/`, `apps/erpnext_hospital/`, `apps/common/`
- **Services**: `services/agent-gateway/`, `services/workflows/`, `services/generator/`
- **Frontend**: `frontend/coagent/`
- **Tests**: `tests/contract/`, `tests/integration/`, `tests/performance/`

## Phase 3.1: Setup

- [x] T001 Create monorepo directory structure per plan.md
- [x] T002 [P] Initialize agent-gateway TypeScript project with package.json, tsconfig.json, and Claude Agent SDK dependencies
- [x] T003 [P] Initialize workflow service Python project with pyproject.toml, LangGraph 0.2+, and pytest dependencies
- [x] T004 [P] Initialize generator service Python project with Jinja2 templates and API framework
- [x] T005 [P] Initialize frontend React project with CopilotKit 1.0+, AG-UI, and React 18+ dependencies
- [x] T006 [P] Create apps/common/ shared utilities module with __init__.py
- [x] T007 [P] Initialize apps/erpnext_hotel/ ERPNext app structure with hooks.py and app metadata
- [x] T008 [P] Initialize apps/erpnext_hospital/ ERPNext app structure with hooks.py and app metadata
- [x] T009 Create Docker Compose configuration for Redis, services, and development environment
- [x] T010 [P] Configure ESLint + Prettier for agent-gateway TypeScript code
- [x] T011 [P] Configure Black + isort + mypy for Python services (workflows, generator)
- [x] T012 Create repository root .env.example with all required environment variables
- [x] T013 Create logs/ directory structure with rotation configuration

## Phase 3.2: Tests First (TDD) ⚠️ MUST COMPLETE BEFORE 3.3

**CRITICAL: These tests MUST be written and MUST FAIL before ANY implementation**

### Common Tool Contract Tests [P]
- [x] T014 [P] Contract test for search_doc tool in services/agent-gateway/tests/contract/test_common_tools.ts:search_doc
- [x] T015 [P] Contract test for get_doc tool in services/agent-gateway/tests/contract/test_common_tools.ts:get_doc
- [x] T016 [P] Contract test for create_doc tool in services/agent-gateway/tests/contract/test_common_tools.ts:create_doc
- [x] T017 [P] Contract test for update_doc tool in services/agent-gateway/tests/contract/test_common_tools.ts:update_doc
- [x] T018 [P] Contract test for submit_doc tool in services/agent-gateway/tests/contract/test_common_tools.ts:submit_doc
- [x] T019 [P] Contract test for cancel_doc tool in services/agent-gateway/tests/contract/test_common_tools.ts:cancel_doc
- [x] T020 [P] Contract test for run_report tool in services/agent-gateway/tests/contract/test_common_tools.ts:run_report
- [x] T021 [P] Contract test for bulk_update tool in services/agent-gateway/tests/contract/test_common_tools.ts:bulk_update

### Hotel Tool Contract Tests [P]
- [x] T022 [P] Contract test for room_availability tool in services/agent-gateway/tests/contract/test_hotel_tools.ts:room_availability
- [x] T023 [P] Contract test for occupancy_report tool in services/agent-gateway/tests/contract/test_hotel_tools.ts:occupancy_report

### Hospital Tool Contract Tests [P]
- [x] T024 [P] Contract test for create_order_set tool in services/agent-gateway/tests/contract/test_hospital_tools.ts:create_order_set
- [x] T025 [P] Contract test for census_report tool in services/agent-gateway/tests/contract/test_hospital_tools.ts:census_report
- [x] T026 [P] Contract test for ar_by_payer tool in services/agent-gateway/tests/contract/test_hospital_tools.ts:ar_by_payer

### Manufacturing Tool Contract Tests [P]
- [x] T027 [P] Contract test for material_availability tool in services/agent-gateway/tests/contract/test_manufacturing_tools.ts:material_availability
- [x] T028 [P] Contract test for bom_explosion tool in services/agent-gateway/tests/contract/test_manufacturing_tools.ts:bom_explosion

### Retail Tool Contract Tests [P]
- [x] T029 [P] Contract test for inventory_check tool in services/agent-gateway/tests/contract/test_retail_tools.ts:inventory_check
- [x] T030 [P] Contract test for sales_analytics tool in services/agent-gateway/tests/contract/test_retail_tools.ts:sales_analytics

### Education Tool Contract Tests [P]
- [x] T031 [P] Contract test for applicant_workflow tool in services/agent-gateway/tests/contract/test_education_tools.ts:applicant_workflow
- [x] T032 [P] Contract test for interview_scheduling tool in services/agent-gateway/tests/contract/test_education_tools.ts:interview_scheduling

### Workflow Contract Tests
- [x] T033 Test hotel O2C workflow state machine in services/workflows/tests/test_graphs.py:test_hotel_o2c_workflow
- [x] T034 Test hospital admissions workflow state machine in services/workflows/tests/test_graphs.py:test_hospital_admissions_workflow
- [x] T035 Test manufacturing production workflow state machine in services/workflows/tests/test_graphs.py:test_manufacturing_production_workflow
- [x] T036 Test retail order fulfillment workflow state machine in services/workflows/tests/test_graphs.py:test_retail_order_fulfillment_workflow
- [x] T037 Test education admissions workflow state machine in services/workflows/tests/test_graphs.py:test_education_admissions_workflow

### Integration Test Scenarios [P]
- [x] T038 [P] Integration test: Hotel front desk availability query in tests/integration/test_hotel_reservation.py:test_front_desk_availability_query
- [x] T039 [P] Integration test: Hotel reservation creation with approval in tests/integration/test_hotel_reservation.py:test_reservation_creation_with_approval
- [x] T040 [P] Integration test: Hospital order set creation with approval in tests/integration/test_hospital_orders.py:test_order_set_creation_with_approval
- [x] T041 [P] Integration test: Manufacturing material check and requisition in tests/integration/test_manufacturing_production.py:test_material_check_and_requisition
- [x] T042 [P] Integration test: Retail inventory validation and fulfillment in tests/integration/test_retail_orders.py:test_inventory_validation_and_fulfillment
- [x] T043 [P] Integration test: Education applicant workflow with interview scheduling in tests/integration/test_education_admissions.py:test_applicant_workflow_with_interview

## Phase 3.3: Core Implementation (ONLY after tests are failing)

### Shared Utilities [P]
- [x] T044 [P] Implement RiskClassifier in apps/common/risk_classifier.py with hybrid classification logic (FR-010)
- [x] T045 [P] Implement SessionManager in apps/common/session_manager.py with ERPNext token management
- [x] T046 [P] Implement AuditLogger in apps/common/audit_logger.py with JSON Lines file-based logging

### Agent Gateway - Frappe API Client
- [x] T047 Implement Frappe REST/RPC client in services/agent-gateway/src/api.ts with session token injection
- [x] T048 Implement client-side rate limiting (10 req/sec) in services/agent-gateway/src/api.ts
- [x] T049 Implement idempotency key generation for write operations in services/agent-gateway/src/api.ts

### Agent Gateway - Common Tools [P]
- [x] T050 [P] Implement search_doc tool handler in services/agent-gateway/src/tools/common/search_doc.ts
- [x] T051 [P] Implement get_doc tool handler in services/agent-gateway/src/tools/common/get_doc.ts
- [x] T052 [P] Implement create_doc tool handler in services/agent-gateway/src/tools/common/create_doc.ts with approval gate
- [x] T053 [P] Implement update_doc tool handler in services/agent-gateway/src/tools/common/update_doc.ts with approval gate
- [x] T054 [P] Implement submit_doc tool handler in services/agent-gateway/src/tools/common/submit_doc.ts with approval gate
- [x] T055 [P] Implement cancel_doc tool handler in services/agent-gateway/src/tools/common/cancel_doc.ts with approval gate
- [x] T056 [P] Implement run_report tool handler in services/agent-gateway/src/tools/common/run_report.ts
- [x] T057 Implement bulk_update tool handler in services/agent-gateway/src/tools/common/bulk_update.ts with batch size limit (50)

### Agent Gateway - Tool Registry
- [x] T058 Implement dynamic tool registry in services/agent-gateway/src/tools/registry.ts that loads tools based on enabled verticals
- [x] T059 Integrate RiskClassifier with tool handlers for dynamic risk assessment

### Agent Gateway - Hotel Tools [P]
- [x] T060 [P] Implement room_availability tool in services/agent-gateway/src/tools/hotel/room_availability.ts
- [x] T061 [P] Implement occupancy_report tool in services/agent-gateway/src/tools/hotel/occupancy_report.ts

### Agent Gateway - Hospital Tools [P]
- [x] T062 [P] Implement create_order_set tool in services/agent-gateway/src/tools/hospital/create_order_set.ts
- [x] T063 [P] Implement census_report tool in services/agent-gateway/src/tools/hospital/census_report.ts
- [x] T064 [P] Implement ar_by_payer tool in services/agent-gateway/src/tools/hospital/ar_by_payer.ts

### Agent Gateway - Manufacturing Tools [P]
- [ ] T065 [P] Implement material_availability tool in services/agent-gateway/src/tools/manufacturing/material_availability.ts
- [ ] T066 [P] Implement bom_explosion tool in services/agent-gateway/src/tools/manufacturing/bom_explosion.ts

### Agent Gateway - Retail Tools [P]
- [ ] T067 [P] Implement inventory_check tool in services/agent-gateway/src/tools/retail/inventory_check.ts
- [ ] T068 [P] Implement sales_analytics tool in services/agent-gateway/src/tools/retail/sales_analytics.ts

### Agent Gateway - Education Tools [P]
- [ ] T069 [P] Implement applicant_workflow tool in services/agent-gateway/src/tools/education/applicant_workflow.ts
- [ ] T070 [P] Implement interview_scheduling tool in services/agent-gateway/src/tools/education/interview_scheduling.ts

### Agent Gateway - Express Server Setup
- [x] T071 Implement Express server in services/agent-gateway/src/server.ts with helmet, cors, express-rate-limit middleware
- [x] T072 Implement GET /health endpoint in services/agent-gateway/src/routes/health.ts
- [x] T073 Implement POST /agui SSE streaming endpoint in services/agent-gateway/src/routes/agui.ts
- [x] T074 Implement bearer token authentication middleware in services/agent-gateway/src/middleware/auth.ts
- [x] T075 Implement Zod request validation middleware in services/agent-gateway/src/middleware/validation.ts
- [x] T076 Implement error sanitization handler in services/agent-gateway/src/middleware/errorHandler.ts

### Agent Gateway - Session & Streaming
- [x] T077 Implement session management in services/agent-gateway/src/session.ts with CoagentSession lifecycle
- [x] T078 Implement AG-UI SSE event emitter in services/agent-gateway/src/streaming.ts with correlation IDs
- [x] T079 Implement Anthropic Messages API with streaming, tool use loop, and approval gate integration in services/agent-gateway/src/agent.ts (uses client.messages.stream() with tool definitions, handles tool_use blocks, returns tool_result blocks, integrates with AGUIStreamEmitter for real-time updates)

## Phase 3.3B: Claude Agent SDK Migration (NEW)

### Orchestrator Implementation
- [x] T150 Create orchestrator agent configuration in /agents/orchestrator.md with YAML frontmatter, system prompt, and tool definitions
- [x] T151 Implement classify_request tool in services/agent-gateway/src/tools/orchestration/classify.ts that determines industry and complexity
- [x] T152 Implement invoke_subagent tool in services/agent-gateway/src/tools/orchestration/invoke.ts that delegates to specialized subagents
- [x] T153 Implement aggregate_results tool in services/agent-gateway/src/tools/orchestration/aggregate.ts that combines subagent outputs
- [x] T154 Implement initiate_deep_research tool in services/agent-gateway/src/tools/orchestration/deep-research.ts for complex investigations

### Industry Subagents Configuration
- [x] T155 Create hotel-specialist.md subagent configuration in /agents/ with hotel-specific tools and system prompt
- [x] T156 Create hospital-specialist.md subagent configuration in /agents/ with healthcare-specific tools and system prompt
- [x] T157 Create manufacturing-specialist.md subagent configuration in /agents/ with manufacturing-specific tools and system prompt
- [x] T158 Create retail-specialist.md subagent configuration in /agents/ with retail-specific tools and system prompt
- [x] T159 Create education-specialist.md subagent configuration in /agents/ with education-specific tools and system prompt

### Deep Research Capability
- [x] T160 Create deep-research.md subagent configuration in /agents/ for complex multi-source investigations
- [x] T161 Implement subagent configuration loader in services/agent-gateway/src/tools/orchestration/subagent-loader.ts with YAML frontmatter parser and validation
- [x] T162 Implement MCP server selector in services/agent-gateway/src/tools/orchestration/subagent-loader.ts (getMCPServersForSubagent function)

### Subagent Infrastructure (Remaining)
- [x] T163 Implement subagent invocation with context preservation in services/agent-gateway/src/orchestrator.ts
- [x] T164 Create orchestration tools index and export all tools from services/agent-gateway/src/tools/orchestration/index.ts

### Approval Hooks Migration
- [x] T165 Migrate approval gates to PreToolUse hooks using claude-agent-sdk HookMatcher in services/agent-gateway/src/hooks/approval.ts
- [x] T166 Implement risk assessment hook in services/agent-gateway/src/hooks/risk_assessment.ts using RiskClassifier
- [x] T167 Integrate approval hooks with AGUIStreamEmitter for real-time approval prompts in services/agent-gateway/src/hooks/stream_integration.ts

## Phase 3.4: Workflow Service (UPDATED FOR HYBRID ARCHITECTURE)

### Hybrid Workflow Bridge (NEW)
- [x] T168 Implement execute_workflow_graph bridge tool in services/agent-gateway/src/tools/workflow/executor.ts that connects SDK subagents to LangGraph workflows
- [x] T169 Create workflow graph registry in services/workflows/src/core/registry.py that maps graph names to Python modules
- [x] T170 Implement streaming progress emitter from LangGraph to AGUIStreamEmitter in services/workflows/src/core/stream_adapter.py

### Workflow Core [P]
- [ ] T080 [P] Implement base state schemas in services/workflows/src/core/state.py with Pydantic models (UPDATED: use TypedDict for LangGraph compatibility)
- [ ] T081 [P] Implement workflow registry in services/workflows/src/core/registry.py that loads graphs by industry/workflow_name
- [ ] T082 Implement generic workflow executor in services/workflows/src/core/executor.py with interrupt/resume support and AG-UI frame emission

### Workflow Reusable Nodes [P]
- [ ] T083 [P] Implement approval node in services/workflows/src/nodes/approve.py with AG-UI ui_prompt emission
- [ ] T084 [P] Implement retry node in services/workflows/src/nodes/retry.py with exponential backoff
- [ ] T085 [P] Implement escalate node in services/workflows/src/nodes/escalate.py with Frappe Notification creation
- [ ] T086 [P] Implement notify node in services/workflows/src/nodes/notify.py for in-app notifications and AG-UI frames

### Workflow Graphs - Hotel (UPDATED FOR HYBRID)
- [x] T087 REIMPLEMENT hotel O2C workflow graph in services/workflows/src/hotel/o2c_graph.py with LangGraph StateGraph, interrupt() approval gates, Command(goto=...) routing (check_in → folio → charges → check_out → invoice)

### Workflow Graphs - Hospital (UPDATED FOR HYBRID)
- [x] T088 Implement hospital admissions workflow graph in services/workflows/src/hospital/admissions_graph.py with LangGraph StateGraph, interrupt() for clinical orders (create_patient → schedule → orders → encounter → invoice)

### Workflow Graphs - Manufacturing
- [x] T089 Implement manufacturing production workflow graph in services/workflows/src/manufacturing/production_graph.py with LangGraph StateGraph, interrupt() for material requests and quality (check_materials → create_work_order → material_request → stock_entry → quality_inspection)

### Workflow Graphs - Retail
- [x] T090 Implement retail order fulfillment workflow graph in services/workflows/src/retail/fulfillment_graph.py with LangGraph StateGraph, interrupt() for low stock/large orders (check_inventory → sales_order → pick_list → delivery_note → payment)

### Workflow Graphs - Education
- [x] T091 Implement education admissions workflow graph in services/workflows/src/education/admissions_graph.py with LangGraph StateGraph, interrupt() for interview and admission decisions (review → schedule_interview → assessment → admission_decision → enrollment)

### Workflow HTTP Service (NEW)
- [x] T171 Implement FastAPI HTTP service in services/workflows/src/server.py with /execute, /resume, and /workflows endpoints for LangGraph workflow execution
- [x] T172 Create Python requirements.txt with langgraph, fastapi, uvicorn dependencies
- [x] T173 Create test_registry.py script to validate workflow loading and state validation

### Workflow State Persistence
- [ ] T092 Implement Redis-based workflow state persistence with 24-hour TTL and activity-based extension

## Phase 3.5: Generator Service

### Generator Core
- [ ] T087 Implement PRD analyzer in services/generator/src/analyzer.py that detects industry and extracts entities
- [ ] T088 Implement DocType JSON generator in services/generator/src/generator.py using templates
- [ ] T089 Implement tool handler stub generator in services/generator/src/generator.py with automatic SDK registration
- [ ] T090 Implement workflow template generator in services/generator/src/generator.py for new industry verticals
- [ ] T091 Create Jinja2 templates in services/generator/src/templates/ for DocType, tool, and workflow generation
- [ ] T092 Implement generator API endpoints in services/generator/src/api.py with approval flow support
- [ ] T093 Implement AppGenerationPlan entity management with status tracking (draft → pending_approval → generating → completed)

## Phase 3.6: Frontend UI

### CopilotKit Setup
- [ ] T094 Implement CopilotKit provider setup in frontend/coagent/src/App.tsx with agent-gateway WebSocket connection
- [ ] T095 Implement useCopilot hook in frontend/coagent/src/hooks/useCopilot.ts for agent interaction

### Core Components [P]
- [ ] T096 [P] Implement CopilotPanel component in frontend/coagent/src/components/CopilotPanel.tsx as side panel container
- [ ] T097 [P] Implement EventStream component in frontend/coagent/src/components/EventStream.tsx for AG-UI message feed
- [ ] T098 [P] Implement ApprovalDialog component in frontend/coagent/src/components/ApprovalDialog.tsx with renderAndWaitForResponse integration
- [ ] T099 Implement AG-UI event parsing utilities in frontend/coagent/src/utils/streaming.ts

### Domain Widgets [P]
- [ ] T100 [P] Implement AvailabilityGrid widget in frontend/coagent/src/components/widgets/AvailabilityGrid.tsx for hotel room availability
- [ ] T101 [P] Implement BedCensus widget in frontend/coagent/src/components/widgets/BedCensus.tsx for hospital census display
- [ ] T102 [P] Implement OrderPreview widget in frontend/coagent/src/components/widgets/OrderPreview.tsx for hospital order sets
- [ ] T103 [P] Implement BOMTree widget in frontend/coagent/src/components/widgets/BOMTree.tsx for manufacturing BOM explosion
- [ ] T104 [P] Implement InventoryHeatmap widget in frontend/coagent/src/components/widgets/InventoryHeatmap.tsx for retail inventory levels
- [ ] T105 [P] Implement InterviewCalendar widget in frontend/coagent/src/components/widgets/InterviewCalendar.tsx for education scheduling

## Phase 3.7: ERPNext Integration

### Client Scripts - Hotel [P]
- [ ] T106 [P] Create Client Script for Reservation DocType in apps/erpnext_hotel/erpnext_hotel/client_scripts/reservation.js that adds Copilot button
- [ ] T107 [P] Create Client Script for Invoice DocType (hotel) in apps/erpnext_hotel/erpnext_hotel/client_scripts/invoice.js that adds Copilot button

### Client Scripts - Hospital [P]
- [ ] T108 [P] Create Client Script for Patient DocType in apps/erpnext_hospital/erpnext_hospital/client_scripts/patient.js that adds Copilot button
- [ ] T109 [P] Create Client Script for Encounter DocType in apps/erpnext_hospital/erpnext_hospital/client_scripts/encounter.js that adds Copilot button
- [ ] T110 [P] Create Client Script for Appointment DocType in apps/erpnext_hospital/erpnext_hospital/client_scripts/appointment.js that adds Copilot button

### Hooks Registration
- [ ] T111 Update apps/erpnext_hotel/hooks.py to register Client Scripts with Frappe
- [ ] T112 Update apps/erpnext_hospital/hooks.py to register Client Scripts with Frappe

### Custom Server Scripts
- [ ] T113 Create Frappe custom server script /api/method/coagent.bulk_update for batch document updates (max 50)

### Fixtures [P]
- [ ] T114 [P] Create hotel seed data fixtures in apps/erpnext_hotel/fixtures/ (sample rooms, rate plans)
- [ ] T115 [P] Create hospital seed data fixtures in apps/erpnext_hospital/fixtures/ (sample wards, protocols)

## Phase 3.8: Configuration & Deployment

### Configuration Management
- [ ] T116 Create IndustryModuleConfiguration management in apps/common/ with enabled verticals tracking
- [ ] T117 Implement configuration API endpoints for enabling/disabling verticals and copilot-enabled DocTypes
- [ ] T118 Create default configuration JSON for hotel and hospital verticals

### Docker & Deployment
- [ ] T119 Create Dockerfile for agent-gateway service with Node.js 18+ base image
- [ ] T120 Create Dockerfile for workflow service with Python 3.11+ base image
- [ ] T121 Create Dockerfile for generator service with Python 3.11+ base image
- [ ] T122 Create Dockerfile for frontend with NGINX serving static React build
- [ ] T123 Update docker-compose.yml with all services, Redis, and health checks
- [ ] T124 Create deployment documentation in specs/001-erpnext-coagents-mvp/deployment.md

## Phase 3.9: Polish

### Unit Tests [P]
- [ ] T125 [P] Unit tests for RiskClassifier in apps/common/tests/test_risk_classifier.py covering all risk levels
- [ ] T126 [P] Unit tests for SessionManager in apps/common/tests/test_session_manager.py covering token lifecycle
- [ ] T127 [P] Unit tests for AuditLogger in apps/common/tests/test_audit_logger.py covering log rotation
- [ ] T128 [P] Unit tests for workflow registry in services/workflows/tests/test_core.py:test_workflow_registry
- [ ] T129 [P] Unit tests for workflow executor in services/workflows/tests/test_core.py:test_workflow_executor
- [ ] T130 [P] Unit tests for generator analyzer in services/generator/tests/test_generator.py:test_analyzer
- [ ] T131 [P] Unit tests for approval dialog in frontend/coagent/src/components/__tests__/ApprovalDialog.test.tsx

### Performance Testing
- [ ] T132 Performance test: Verify first token streaming <400ms target in tests/performance/test_streaming_latency.py
- [ ] T133 Performance test: Verify read operations <1.8s @ P95 in tests/performance/test_read_operations.py
- [ ] T134 Performance test: Verify write operations <2.5s @ P95 (excluding approval wait) in tests/performance/test_write_operations.py
- [ ] T135 Load test: Verify system handles 5-20 concurrent users in tests/performance/test_concurrent_users.py

### Documentation [P]
- [ ] T136 [P] Create API documentation for all tool handlers in specs/001-erpnext-coagents-mvp/api-reference.md
- [ ] T137 [P] Create workflow documentation in specs/001-erpnext-coagents-mvp/workflows.md with state diagrams
- [ ] T138 [P] Update quickstart.md with complete local development instructions and troubleshooting
- [ ] T139 [P] Create contributing guide in CONTRIBUTING.md with development workflow and testing requirements

### Code Quality
- [ ] T140 Run ESLint and fix all warnings in agent-gateway TypeScript code
- [ ] T141 Run Black, isort, and mypy and fix all issues in Python services
- [ ] T142 Verify all tests pass: npm test (agent-gateway), pytest (workflows, generator, tests/)
- [ ] T143 Remove duplication and refactor shared logic between industry verticals
- [ ] T144 Execute quickstart.md manual testing scenarios and verify all steps work

## Dependencies

**Setup Dependencies**:
- T001 blocks all other tasks (must create structure first)
- T002-T013 can run in parallel [P] (independent initialization)

**Test Dependencies**:
- T014-T043 (all tests) must complete before T044-T093 (implementation)
- Within tests, T014-T032 can run in parallel [P] (different tool test files)
- T033-T037 must run sequentially (workflow state machine tests)
- T038-T043 can run in parallel [P] (different integration test files)

**Implementation Dependencies**:
- T044-T046 (shared utilities) before T047-T073 (agent tools use shared code)
- T047-T049 (API client) before T050-T070 (tools use API client)
- T050-T057 (common tools) before T060-T070 (industry tools may compose common tools)
- T058-T059 (registry + risk) before T073 (agent init uses registry)
- T074-T076 (workflow core) before T077-T085 (graphs use core)
- T077-T080 (reusable nodes) before T081-T085 (graphs use nodes)
- T071-T073 (agent-gateway session/streaming) before T094-T099 (frontend connects to gateway)
- T081-T085 (workflow graphs) before T033-T037 tests can pass
- T087-T093 (generator) independent, can run in parallel with workflows

**Integration Dependencies**:
- T106-T115 (Client Scripts + fixtures) after T071-T073 (agent must be running)
- T116-T118 (configuration) after T058 (registry must exist)
- T119-T124 (Docker/deployment) after all implementation complete

**Polish Dependencies**:
- T125-T131 (unit tests) can run in parallel [P] (different modules)
- T132-T135 (performance tests) after all implementation complete
- T136-T139 (documentation) can run in parallel [P] (different docs)
- T140-T144 (code quality) after all implementation complete

## Parallel Execution Examples

### Parallel Test Creation (Phase 3.2)
```bash
# Launch T014-T021 common tool contract tests together:
Task: "Contract test for search_doc tool in services/agent-gateway/tests/contract/test_common_tools.ts:search_doc"
Task: "Contract test for get_doc tool in services/agent-gateway/tests/contract/test_common_tools.ts:get_doc"
Task: "Contract test for create_doc tool in services/agent-gateway/tests/contract/test_common_tools.ts:create_doc"
Task: "Contract test for update_doc tool in services/agent-gateway/tests/contract/test_common_tools.ts:update_doc"
Task: "Contract test for submit_doc tool in services/agent-gateway/tests/contract/test_common_tools.ts:submit_doc"
Task: "Contract test for cancel_doc tool in services/agent-gateway/tests/contract/test_common_tools.ts:cancel_doc"
Task: "Contract test for run_report tool in services/agent-gateway/tests/contract/test_common_tools.ts:run_report"
Task: "Contract test for bulk_update tool in services/agent-gateway/tests/contract/test_common_tools.ts:bulk_update"
```

### Parallel Common Tool Implementation (Phase 3.3)
```bash
# Launch T050-T056 common read/write tools together:
Task: "Implement search_doc tool handler in services/agent-gateway/src/tools/common/search_doc.ts"
Task: "Implement get_doc tool handler in services/agent-gateway/src/tools/common/get_doc.ts"
Task: "Implement create_doc tool handler in services/agent-gateway/src/tools/common/create_doc.ts with approval gate"
Task: "Implement update_doc tool handler in services/agent-gateway/src/tools/common/update_doc.ts with approval gate"
Task: "Implement submit_doc tool handler in services/agent-gateway/src/tools/common/submit_doc.ts with approval gate"
Task: "Implement cancel_doc tool handler in services/agent-gateway/src/tools/common/cancel_doc.ts with approval gate"
Task: "Implement run_report tool handler in services/agent-gateway/src/tools/common/run_report.ts"
```

### Parallel Industry Tools (Phase 3.3)
```bash
# Launch T060-T070 industry-specific tools together (different verticals):
Task: "Implement room_availability tool in services/agent-gateway/src/tools/hotel/room_availability.ts"
Task: "Implement occupancy_report tool in services/agent-gateway/src/tools/hotel/occupancy_report.ts"
Task: "Implement create_order_set tool in services/agent-gateway/src/tools/hospital/create_order_set.ts"
Task: "Implement census_report tool in services/agent-gateway/src/tools/hospital/census_report.ts"
Task: "Implement ar_by_payer tool in services/agent-gateway/src/tools/hospital/ar_by_payer.ts"
Task: "Implement material_availability tool in services/agent-gateway/src/tools/manufacturing/material_availability.ts"
Task: "Implement bom_explosion tool in services/agent-gateway/src/tools/manufacturing/bom_explosion.ts"
Task: "Implement inventory_check tool in services/agent-gateway/src/tools/retail/inventory_check.ts"
Task: "Implement sales_analytics tool in services/agent-gateway/src/tools/retail/sales_analytics.ts"
Task: "Implement applicant_workflow tool in services/agent-gateway/src/tools/education/applicant_workflow.ts"
Task: "Implement interview_scheduling tool in services/agent-gateway/src/tools/education/interview_scheduling.ts"
```

### Parallel Frontend Components (Phase 3.6)
```bash
# Launch T100-T105 domain widgets together:
Task: "Implement AvailabilityGrid widget in frontend/coagent/src/components/widgets/AvailabilityGrid.tsx for hotel room availability"
Task: "Implement BedCensus widget in frontend/coagent/src/components/widgets/BedCensus.tsx for hospital census display"
Task: "Implement OrderPreview widget in frontend/coagent/src/components/widgets/OrderPreview.tsx for hospital order sets"
Task: "Implement BOMTree widget in frontend/coagent/src/components/widgets/BOMTree.tsx for manufacturing BOM explosion"
Task: "Implement InventoryHeatmap widget in frontend/coagent/src/components/widgets/InventoryHeatmap.tsx for retail inventory levels"
Task: "Implement InterviewCalendar widget in frontend/coagent/src/components/widgets/InterviewCalendar.tsx for education scheduling"
```

## Notes

### TDD Discipline
- **Phase 3.2 (Tests) MUST complete before Phase 3.3 (Implementation)**
- All tests must fail initially (verifying test correctness)
- Implementation proceeds only when corresponding tests exist
- Tests pass only when implementation is correct

### Parallel Execution Strategy
- **[P]** marker indicates different files with no dependencies
- Within a phase, [P] tasks can launch simultaneously
- Example: All 8 common tool contract tests (T014-T021) are independent
- Example: All 5 industry workflows (T081-T085) modify different files

### File Path Specificity
- Each task includes exact file path for implementation
- Tool tests: `services/agent-gateway/tests/contract/test_{industry}_tools.ts`
- Tool implementations: `services/agent-gateway/src/tools/{industry}/{tool_name}.ts`
- Workflows: `services/workflows/src/graphs/{industry}/{workflow_name}.py`

### Commit Strategy
- Commit after each completed task (144 commits minimum)
- Commit message format: `feat(area): task description (T###)`
- Example: `feat(agent-gateway): implement search_doc tool handler (T050)`

### Constitution Compliance
- All tasks align with 6 constitutional principles
- Native-First: Client Scripts in T106-T112
- Safe-by-Default: Approval gates in T052-T055
- HITL: ApprovalDialog in T098
- Deterministic: LangGraph in T074-T085
- Modular: Industry separation in T060-T070
- Spec-Driven: Tests before implementation (T014-T043 before T044-T093)

### Performance Validation
- T132-T135 validate FR-054, FR-055, FR-056 requirements
- First token <400ms, read <1.8s, write <2.5s @ P95
- Load test confirms 5-20 concurrent user target

### MVP Scope
- 144 tasks total
- 2 reference industry implementations (Hotel, Hospital)
- 3 additional industry stubs (Manufacturing, Retail, Education)
- 5 workflow graphs (one per industry)
- Pluggable architecture for future industries
