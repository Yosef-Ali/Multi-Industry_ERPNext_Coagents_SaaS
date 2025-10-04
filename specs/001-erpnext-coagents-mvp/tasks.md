# Tasks: ERPNext Coagents SaaS (Multi-Industry Platform)

**Input**: Design documents from `/specs/001-erpnext-coagents-mvp/`
**Prerequisites**: plan.md (required), spec.md, research decisions, data model, tool/workflow contracts

---

## 🤖 Context Preservation Guide for AI Coding Agents

> **Purpose**: This section helps new AI coding agents (Claude, GPT-4, etc.) continue development with consistent coding style, patterns, and context awareness.

### 📖 Essential Reading Order
1. **Start here**: Read this `tasks.md` file completely (current file)
2. **Architecture**: Read `specs/001-erpnext-coagents-mvp/plan.md` for system architecture
3. **Context Guide**: Read `MCP_CONTEXT_GUIDE.md` for AI collaboration protocol
4. **Recent Work**: Read `WHATS_NEXT.md` for completed work and next priorities

### 🎯 Development Patterns & Coding Style

**1. Architectural Patterns Used:**
- **Agent Gateway**: TypeScript + Claude Agent SDK + OpenRouter for LLM orchestration
- **Workflows**: Python + LangGraph with TypedDict states (NOT Pydantic BaseModel)
- **Frontend**: React 18 + Next.js 15 + CopilotKit v1.10.5 for embedded AI
- **ERPNext**: Frappe apps with Client Scripts for native integration
- **Testing**: TDD (tests before implementation), contract tests + integration tests

**2. File Organization Conventions:**
```
services/agent-gateway/src/
  ├── tools/{industry}/{tool_name}.ts     # Industry-specific tools
  ├── tools/common/{tool_name}.ts         # Shared cross-industry tools
  ├── tools/orchestration/{feature}.ts    # Orchestrator tools
  └── hooks/{hook_name}.ts                # Claude SDK hooks (approval, risk)

services/workflows/src/
  ├── core/state.py                       # Centralized TypedDict states
  ├── core/registry.py                    # Workflow discovery/loading
  ├── core/executor.py                    # WorkflowExecutor with AG-UI streaming
  ├── {industry}/{workflow}_graph.py      # LangGraph StateGraph per industry
  └── nodes/{node_name}.py                # Reusable workflow nodes

frontend/coagent/
  ├── hooks/use-app-copilot.tsx           # Main CopilotKit integration hook
  ├── app/api/copilot/runtime/route.ts    # CopilotKit backend runtime
  └── components/copilot/                 # Recommendation cards, panels
```

**3. TypeScript Coding Style:**
- Use `interface` for data shapes, `type` for unions/intersections
- Async/await for all I/O operations (no raw Promises)
- Zod for runtime validation at API boundaries
- Explicit error handling with try-catch, never swallow errors
- Example:
```typescript
export interface SearchDocParams {
  doctype: string;
  filters?: Record<string, any>;
  fields?: string[];
}

export async function searchDoc(params: SearchDocParams): Promise<DocSearchResult> {
  const validated = SearchDocParamsSchema.parse(params); // Zod validation
  try {
    const response = await frappeClient.get('/api/resource/...');
    return response.data;
  } catch (error) {
    logger.error('searchDoc failed', { error, params });
    throw new ToolExecutionError('Failed to search documents', error);
  }
}
```

**4. Python Coding Style (LangGraph Workflows):**
- Use `TypedDict` for LangGraph states (NOT Pydantic BaseModel)
- Import shared state definitions from `core/state.py`
- Use `Command(goto="node_name")` for explicit routing
- Use `interrupt()` for human-in-the-loop approval gates
- Type hints on all functions
- Example:
```python
from langgraph.graph import StateGraph, START, END
from langgraph.types import Command, interrupt
from typing import Literal
from ..core.state import HotelWorkflowState  # Import shared state

def check_in_node(state: HotelWorkflowState) -> Command[Literal["folio", "END"]]:
    """Check-in guest and create folio."""
    # ... logic ...
    return Command(goto="folio", update={"current_step": "folio"})

def approval_node(state: HotelWorkflowState) -> Command[Literal["next_step", "END"]]:
    """Wait for human approval."""
    user_response = interrupt({"type": "approval", "message": "Approve?"})
    if user_response.get("approved"):
        return Command(goto="next_step")
    return Command(goto=END)

# Build graph
graph = StateGraph(HotelWorkflowState)
graph.add_node("check_in", check_in_node)
graph.add_node("approval", approval_node)
graph.add_edge(START, "check_in")
graph.add_edge("check_in", "approval")
```

**5. React/Next.js Coding Style:**
- Functional components with TypeScript
- Custom hooks for shared logic (use-app-copilot.tsx pattern)
- Server Components by default, Client Components marked with `"use client"`
- CopilotKit patterns: `useCopilotReadable` for context, `useCopilotAction` for actions
- Example:
```typescript
'use client';

import { useCopilotReadable, useCopilotAction } from '@copilotkit/react-core';

export function useAppCopilot(appType: string) {
  // Expose page context to AI
  useCopilotReadable({
    description: `Current ${appType} app context`,
    value: { page: currentPage, data: pageData }
  });

  // Register AI actions
  useCopilotAction({
    name: 'search_students',
    description: 'Search for students',
    parameters: [{ name: 'query', type: 'string' }],
    handler: async ({ query }) => {
      const results = await fetch(`/api/search?q=${query}`);
      return results.json();
    }
  });
}
```

**6. Testing Patterns:**
- **TDD**: Write tests BEFORE implementation (Phase 3.2 before 3.3)
- **Contract Tests**: Verify tool input/output schemas
- **Integration Tests**: End-to-end scenarios across services
- Test file naming: `test_{feature}.ts` or `test_{feature}.py`
- Use descriptive test names: `test_hotel_o2c_workflow_with_approval_gate`

**7. Git Commit Patterns:**
- Format: `type(scope): description (T###)`
- Types: `feat`, `fix`, `refactor`, `test`, `docs`, `chore`
- Scopes: `agent-gateway`, `workflows`, `frontend`, `apps`
- Examples:
  - `feat(agent-gateway): implement search_doc tool handler (T050)`
  - `test(workflows): add hotel O2C workflow state machine test (T033)`
  - `docs(tasks): add context preservation guide for AI agents`

### 🔍 Context Discovery Tools

**Before starting any task, gather context:**

```bash
# 1. Find relevant files
grep -r "search_doc" services/agent-gateway/src/tools/

# 2. Check git history for patterns
git log --oneline --grep="T050" --all

# 3. Search for similar implementations
find services/agent-gateway/src/tools -name "*.ts" | head -5

# 4. Check current branch and status
git status
git log --oneline -10
```

**Key files to check for patterns:**
- `services/agent-gateway/src/tools/common/get_doc.ts` - Example tool implementation
- `services/workflows/src/hotel/o2c_graph.py` - Example LangGraph workflow
- `frontend/coagent/hooks/use-app-copilot.tsx` - CopilotKit integration pattern
- `services/workflows/src/core/state.py` - All workflow state definitions

### ✅ Pre-Implementation Checklist

Before implementing any task, ensure:

- [ ] Read the task description completely (T### number)
- [ ] Check dependencies: Has prerequisite tasks completed? (see Dependencies section)
- [ ] Find similar existing implementations to match style
- [ ] Verify file path exists or create directory structure
- [ ] Check if tests exist (TDD: tests before implementation)
- [ ] Understand the [P] parallel marker (can run with other [P] tasks)
- [ ] Review constitution principles (Native-First, Safe-by-Default, HITL, etc.)

### 🚀 Session Handoff Protocol

**When starting a new session:**

1. **Read context**: Check recent commits via `git log --oneline -20`
2. **Check branch**: Verify you're on correct feature branch
3. **Review WHATS_NEXT.md**: See completed work and priorities
4. **Check tasks.md**: Find next unchecked [ ] task
5. **Verify dependencies**: Ensure prerequisite tasks are done

**When ending a session:**

1. **Commit all changes**: One commit per task (T### in message)
2. **Push to remote**: `git push origin <branch-name>`
3. **Update documentation**: If patterns changed, document them
4. **Mark tasks complete**: Add [x] to completed tasks in this file

### 📚 Documentation Structure

**Key documentation files:**
- `specs/001-erpnext-coagents-mvp/plan.md` - System architecture & design
- `specs/001-erpnext-coagents-mvp/tasks.md` - This file (task breakdown)
- `MCP_CONTEXT_GUIDE.md` - AI collaboration guide (detailed)
- `WHATS_NEXT.md` - Recent work + next priorities
- `README.md` - Project overview
- `DEV_SETUP.md` - Local development setup
- `COPILOTKIT_EMBEDDED_COMPLETE.md` - CopilotKit implementation guide

**When to create new documentation:**
- New architectural patterns introduced
- Complex workflows that need diagrams
- API contracts for tool handlers
- Performance benchmarks achieved

### 🎓 Learning from Existing Code

**To understand tool handler patterns:**
```bash
# Read 2-3 existing tool implementations
cat services/agent-gateway/src/tools/common/get_doc.ts
cat services/agent-gateway/src/tools/common/create_doc.ts
cat services/agent-gateway/src/tools/hotel/room_availability.ts
```

**To understand workflow patterns:**
```bash
# Read completed workflow graphs
cat services/workflows/src/hotel/o2c_graph.py
cat services/workflows/src/hospital/admissions_graph.py
cat services/workflows/src/core/state.py  # STATE DEFINITIONS
```

**To understand CopilotKit integration:**
```bash
# Read frontend integration pattern
cat frontend/coagent/hooks/use-app-copilot.tsx
cat frontend/coagent/app/api/copilot/runtime/route.ts
```

### ⚠️ Common Pitfalls to Avoid

1. **DON'T use Pydantic BaseModel for LangGraph states** → Use TypedDict from `core/state.py`
2. **DON'T skip tests** → TDD required (Phase 3.2 before 3.3)
3. **DON'T hardcode ERPNext URLs** → Use environment variables
4. **DON'T skip approval gates** → High-risk operations need HITL (interrupt())
5. **DON'T commit without T### reference** → Every commit needs task number
6. **DON'T implement without checking dependencies** → Verify prerequisite tasks done

### 🔄 Iterative Development Process

**Standard workflow for each task:**

1. **Understand**: Read task description + check similar implementations
2. **Test First**: Write failing test (if Phase 3.2 task)
3. **Implement**: Write minimal code to pass test
4. **Validate**: Run tests (`npm test` or `pytest`)
5. **Commit**: `git commit -m "feat(scope): description (T###)"`
6. **Mark Done**: Add [x] to task in this file
7. **Next Task**: Check dependencies, pick next [ ] task

### 🌐 Multi-Agent Collaboration

**If multiple AI agents working on this project:**

- **Use [P] markers**: Parallel tasks can be done simultaneously
- **Communicate via commits**: Clear commit messages with T### numbers
- **Document new patterns**: Update this guide if you introduce new conventions
- **Respect dependencies**: Don't start T052 until T047-T051 complete
- **Sync frequently**: Pull before starting, push after completing

---

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
- [x] T077 Implement session management in services/agent-gateway/src/session.ts with CoagentSession lifecycle
- [x] T078 Implement AG-UI SSE event emitter in services/agent-gateway/src/streaming.ts with correlation IDs
- [x] T079 Implement OpenRouter Messages API with streaming, tool use loop, and approval gate integration in services/agent-gateway/src/agent.ts (uses client.messages.create() with tool definitions, handles tool_use blocks, returns tool_result blocks, integrates with AGUIStreamEmitter for real-time updates)

### Agent Gateway - Environment & Resilience (NEW)
- [x] T174 [P] Implement environment validation module in services/agent-gateway/src/config/environment.ts with strict OpenRouter and ERPNext configuration checks
- [x] T175 Implement OpenRouter error handling utilities with retry, cost tracking, and circuit breaker in services/agent-gateway/src/utils/openrouter-error-handler.ts
- [x] T176 Integrate environment validation and masked configuration logging into services/agent-gateway/src/server.ts startup path
- [x] T177 Integrate OpenRouter error handler utilities across orchestration tool invocations in services/agent-gateway/src/tools/orchestration/*.ts
- [x] T178 Expose monitoring endpoints for cost tracker and circuit breaker state in services/agent-gateway/src/routes/monitoring.ts

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

## Phase 3.4: Copilot Fabric (Canvas Builder ➜ SaaS Assistant)

> Canvas Copilot = internal builder workspace for designing new ERPNext automation on an infinite canvas.
> SaaS Copilot = embedded assistant every shipped ERPNext app must expose, powered by the curated LangGraph workflows below.

### Shared Copilot Fabric (NEW)
- [x] T168 Implement execute_workflow_graph bridge tool in services/agent-gateway/src/tools/workflow/executor.ts that connects SDK subagents to LangGraph workflows
- [x] T169 Create workflow graph registry in services/workflows/src/core/registry.py that maps graph names to Python modules
- [x] T170 Implement streaming progress emitter from LangGraph to AGUIStreamEmitter in services/workflows/src/core/stream_adapter.py

### Shared Workflow Core [P]
- [x] T080 [P] Implement base state schemas in services/workflows/src/core/state.py with Pydantic models (UPDATED: use TypedDict for LangGraph compatibility) (Completed: shared TypedDict base + per-vertical SaaS states + helper `create_base_state()`; all graphs refactored to import shared definitions)
- [x] T081 [P] Implement workflow registry in services/workflows/src/core/registry.py that loads graphs by industry/workflow_name (ENHANCED: Added capability metadata, tag-based filtering, industry discovery, state validation with auto-population, comprehensive statistics tracking)
- [x] T082 Implement generic workflow executor in services/workflows/src/core/executor.py with interrupt/resume support and AG-UI frame emission (COMPLETE: WorkflowExecutor with AG-UI streaming, auto thread_id generation, state validation, interrupt detection, execution history, MemorySaver checkpointing, resume capability)

> Unified State Refactor: Graphs now use centralized `core/state.py` TypedDicts ensuring Canvas + SaaS parity (BaseWorkflowState, SaaSWorkflowState, per-vertical states). Next steps: (T081) extend registry to expose industry-filtered + capability metadata; (T082) introduce executor that standardizes interrupt capture, AG-UI frame emission, and future Redis persistence hooks.

### Canvas Copilot Reusable Nodes [P]
- [x] T083 [P] Implement approval node in services/workflows/src/nodes/approve.py with AG-UI ui_prompt emission
- [x] T084 [P] Implement retry node in services/workflows/src/nodes/retry.py with exponential backoff
- [x] T085 [P] Implement escalate node in services/workflows/src/nodes/escalate.py with Frappe Notification creation
- [x] T086 [P] Implement notify node in services/workflows/src/nodes/notify.py for in-app notifications and AG-UI frames

### SaaS Copilot Graphs - Hotel (UPDATED FOR HYBRID)
- [x] T087 REIMPLEMENT hotel O2C workflow graph in services/workflows/src/hotel/o2c_graph.py with LangGraph StateGraph, interrupt() approval gates, Command(goto=...) routing (check_in → folio → charges → check_out → invoice)

### SaaS Copilot Graphs - Hospital (UPDATED FOR HYBRID)
- [x] T088 Implement hospital admissions workflow graph in services/workflows/src/hospital/admissions_graph.py with LangGraph StateGraph, interrupt() for clinical orders (create_patient → schedule → orders → encounter → invoice)

### SaaS Copilot Graphs - Manufacturing
- [x] T089 Implement manufacturing production workflow graph in services/workflows/src/manufacturing/production_graph.py with LangGraph StateGraph, interrupt() for material requests and quality (check_materials → create_work_order → material_request → stock_entry → quality_inspection)

### SaaS Copilot Graphs - Retail
- [x] T090 Implement retail order fulfillment workflow graph in services/workflows/src/retail/fulfillment_graph.py with LangGraph StateGraph, interrupt() for low stock/large orders (check_inventory → sales_order → pick_list → delivery_note → payment)

### SaaS Copilot Graphs - Education
- [x] T091 Implement education admissions workflow graph in services/workflows/src/education/admissions_graph.py with LangGraph StateGraph, interrupt() for interview and admission decisions (review → schedule_interview → assessment → admission_decision → enrollment)

### Workflow HTTP Service (NEW)
- [x] T171 Implement FastAPI HTTP service in services/workflows/src/server.py with /execute, /resume, and /workflows endpoints for LangGraph workflow execution (ENHANCED: Integrated T082 WorkflowExecutor with SSE streaming, non-streaming execution, comprehensive error handling, CORS support)
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
- [x] T094 ✅ Implement CopilotKit provider setup in frontend/coagent/app/page.tsx with CoAgents runtime endpoint
- [x] T095 ✅ Implement useCopilot hook in frontend/coagent/src/hooks/useCopilot.ts with useCoAgent integration for state sharing

### Core Components [P]
- [x] T096 ✅ [P] Implement CopilotPanel component in frontend/coagent/src/components/CopilotPanel.tsx as side panel container
- [x] T097 ✅ [P] Implement EventStream component in frontend/coagent/src/components/EventStream.tsx with useCoAgentStateRender for workflow progress
- [x] T098 ✅ [P] Implement ApprovalDialog component in frontend/coagent/src/components/ApprovalDialog.tsx with renderAndWaitForResponse for LangGraph interrupt()
- [x] T099 ✅ Implement AG-UI event parsing utilities in frontend/coagent/src/utils/streaming.ts

### Domain Widgets [P]
- [ ] T100 [P] Implement AvailabilityGrid widget in frontend/coagent/src/components/widgets/AvailabilityGrid.tsx for hotel room availability

## Phase 4.0: ERPNext Copilot — MCP + CopilotKit Hooks + LangGraph (HITL)

Goal: Implement a domain-specialized ERPNext copilot using Context7 MCP tools, CopilotKit hooks (no new UI), and LangGraph workflows with human-in-the-loop interrupts. Deliver streaming artifacts at each stage (spec, schema plan, code, tests, package) via the existing UI message stream protocol.

### 4.1 Architecture & Contracts
- [ ] T200 Draft ERPNext Copilot Architecture (Concept) with Mermaid diagram and node annotations for `interrupt()` usage
- [ ] T201 Define artifact schemas (SpecDoc, SchemaPlan, CodeDiff, TestPlan, PackageManifest) in `services/workflows/src/core/artifacts.py`
- [ ] T202 Define UI stream contracts for each stage (text, data-* parts) mapping to existing UI message stream chunks

### 4.2 Context7 MCP Integration (Domain Tools)
- [ ] T210 Implement MCP client bootstrap in `services/agent-gateway/src/mcp/context7.ts` (provider registry, auth, retry)
- [ ] T211 Define ERPNext MCP tools: metadata introspection, DocType CRUD, report search, script lint/validate, diff tool
- [ ] T212 Add tool input/output Zod schemas and contract tests (TypeScript) in `services/agent-gateway/tests/contract/mcp_tools.test.ts`
- [ ] T213 Implement safe-guard rails (permission checks, destructive op approvals) in MCP tool wrappers
  
Progress:
- [x] T210 Stubbed Context7 MCP client with typed search and safe fallback.
- [x] T211 Added read-only ERPNext tools: DocType introspection, list DocTypes/fields/link fields/child tables, list/search/run reports, get report info, list print formats/roles/workflows/files/comments/versions, count docs; write ops deferred.
- [x] T212 Added Zod schemas and minimal contract tests.
- [ ] T213 Guard rails to be extended for write ops when added.

### 4.3 CopilotKit Hooks (No New UI)
- [ ] T220 Implement `useErpNextCopilot()` hook wrapper in `frontend/coagent/hooks/use-app-copilot.tsx` to expose: readable context, actions to start/resume/cancel workflows, and receive artifact deltas
- [ ] T221 Add CopilotKit runtime endpoint `frontend/coagent/app/api/copilot/runtime/route.ts` to bridge hooks → agent-gateway (stream UI chunks using `JsonToSseTransformStream`)
- [ ] T222 Register actions (start_workflow, approve_step, reject_step, provide_edit) and wire to runtime endpoint
  
Progress:
- [x] Initial `useErpNextCopilot` hook now streams `/agui` workflow events (via Worker proxy) into the Copilot data stream and sidebar viewer.

### 4.4 LangGraph Workflow (HITL)
- [ ] T230 Define `ErpCopilotState` (TypedDict) in `services/workflows/src/core/state.py` with fields for prompt, stage, artifacts, approvals
- [ ] T231 Implement nodes: interpret_intent → design_spec → schema_plan → generate_code → test_plan → package_artifact
- [ ] T232 Insert `interrupt()` gates after design_spec, schema_plan, generate_code, test_plan, package_artifact
- [ ] T233 Implement WorkflowExecutor streaming adapter to emit UI chunks per stage and artifact piece
- [ ] T234 Add integration tests for happy-path and rejection/regenerate loops

### 4.5 Persistence & Resume
- [ ] T240 Add Redis-backed checkpointing (MemorySaver + TTL) for workflow state and artifacts
- [ ] T241 Implement resume endpoint in `services/workflows/src/server.py` and hook in CopilotKit runtime

### 4.6 Artifact Packaging & Delivery
- [ ] T250 Implement artifact repository (local disk first) with versioned manifests and zip bundling
- [ ] T251 Add diff generation utility and linter/validator integration (ERPNext script validation)
- [ ] T252 Provide deployment instructions and rollback plan in generated package

### 4.7 Observability, Safety, and Auditing
- [ ] T260 Add audit trail: record all interrupts, human decisions, and agent deltas (DB table or file log)
- [ ] T261 Add telemetry for latency, error rates, and step durations
- [ ] T262 Add safety checks to block destructive schema ops without explicit approval

### 4.8 Developer Experience
- [ ] T270 Add `docs/ERPNext_Copilot_ARCH.md` with diagram and contracts
- [ ] T271 Provide `make dev-copilot` scripts and `.env.example` entries for MCP/agent-gateway endpoints
- [ ] T272 Add seed examples and fixtures for sample ERPNext data to exercise the workflow

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
y-4 border-t pt-4">
      {/* Risk Assessment */}
      <div className="flex items-center justify-between">
        <div>
          <h4 className="font-semibold">Ready to Deploy</h4>
          <p className="text-sm text-muted-foreground">
            This will create the {artifact.type} in your ERPNext instance
          </p>
        </div>
        <Badge 
          variant={artifact.riskLevel === 'HIGH' ? 'destructive' : artifact.riskLevel === 'MEDIUM' ? 'default' : 'secondary'}
        >
          {artifact.riskLevel} Risk
        </Badge>
      </div>

      {/* Approval Required Alert */}
      {artifact.requiresApproval && (
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            This artifact requires approval before deployment due to its risk level.
          </AlertDescription>
        </Alert>
      )}

      {/* Success/Error Messages */}
      {status === 'success' && (
        <Alert>
          <CheckCircle className="h-4 w-4" />
          <AlertDescription>
            Successfully deployed to ERPNext! 🎉
          </AlertDescription>
        </Alert>
      )}

      {status === 'error' && (
        <Alert variant="destructive">
          <AlertDescription>{error}</AlertDescription>
        </Alert>
      )}

      {/* Deploy Button */}
      <Button 
        onClick={handleDeploy}
        disabled={status === 'deploying' || status === 'success'}
        className="w-full"
        size="lg"
      >
        <Rocket className="w-4 h-4 mr-2" />
        {status === 'deploying' ? 'Deploying...' : status === 'success' ? 'Deployed ✓' : 'Deploy to ERPNext'}
      </Button>
    </div>
  );
}

async function showApprovalDialog(artifact: Artifact): Promise<boolean> {
  return new Promise((resolve) => {
    // Open modal with artifact preview
    // User clicks approve/reject
    // Return result
  });
}
```

**Best Practices**:
- Clear risk indicators
- Approval gate for high-risk
- Success/error feedback
- Idempotent deployments

**MCP Context**: Query Context7 for:
- shadcn/ui Alert component
- Modal dialog patterns
- Async confirmation dialogs

---

#### T211: Streaming Animation System
**File**: `frontend/coagent/components/developer/streaming-text.tsx`

**Objective**: Smooth text streaming effect like Claude demo

**Implementation**:
```typescript
'use client';

import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

export function StreamingText({ text, speed = 20 }: { text: string; speed?: number }) {
  const [displayedText, setDisplayedText] = useState('');
  const [currentIndex, setCurrentIndex] = useState(0);

  useEffect(() => {
    if (currentIndex < text.length) {
      const timeout = setTimeout(() => {
        setDisplayedText(prev => prev + text[currentIndex]);
        setCurrentIndex(prev => prev + 1);
      }, speed);
      return () => clearTimeout(timeout);
    }
  }, [currentIndex, text, speed]);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="font-mono"
    >
      {displayedText}
      {currentIndex < text.length && (
        <motion.span
          animate={{ opacity: [0, 1, 0] }}
          transition={{ duration: 0.8, repeat: Infinity }}
          className="inline-block w-2 h-4 bg-current ml-1"
        />
      )}
    </motion.div>
  );
}

export function ArtifactFadeIn({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, ease: 'easeOut' }}
    >
      {children}
    </motion.div>
  );
}
```

**Best Practices**:
- Framer Motion for animations
- Configurable speed
- Cursor blink effect
- Smooth fade-ins

**MCP Context**: Query Context7 for:
- Framer Motion API
- CSS animation performance
- React animation patterns

---

#### T212: Keyboard Shortcuts
**File**: `frontend/coagent/hooks/use-keyboard-shortcuts.ts`

**Objective**: Power user keyboard navigation

**Implementation**:
```typescript
import { useEffect } from 'react';
import { useArtifactStore } from '@/lib/store/artifact-store';

export function useKeyboardShortcuts() {
  const { selectedVariant, selectVariant, artifacts } = useArtifactStore();

  useEffect(() => {
    const handleKeyPress = (e: KeyboardEvent) => {
      // Variant switching: Cmd/Ctrl + 1/2/3
      if ((e.metaKey || e.ctrlKey) && ['1', '2', '3'].includes(e.key)) {
        e.preventDefault();
        selectVariant(Number(e.key) as 1 | 2 | 3);
      }

      // Deploy: Cmd/Ctrl + Enter
      if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
        e.preventDefault();
        // Trigger deploy
      }

      // Copy code: Cmd/Ctrl + C (when focused on preview)
      if ((e.metaKey || e.ctrlKey) && e.key === 'c' && e.target instanceof HTMLElement) {
        if (e.target.closest('.code-preview')) {
          e.preventDefault();
          // Copy code
        }
      }
    };

    document.addEventListener('keydown', handleKeyPress);
    return () => document.removeEventListener('keydown', handleKeyPress);
  }, [selectedVariant, selectVariant, artifacts]);
}
```

**Best Practices**:
- Cmd/Ctrl cross-platform
- Don't override browser shortcuts
- Visual indicators for shortcuts
- Help dialog with shortcuts

**MCP Context**: Query Context7 for:
- React keyboard event handling
- Cross-platform key detection
- Accessibility best practices

---

### 🎯 Phase 7.6: Context7 MCP Integration (45 min)

#### T213: Context7 MCP Client
**File**: `frontend/coagent/lib/mcp/context7-client.ts`

**Objective**: Fetch real-time framework documentation

**Implementation**:
```typescript
export class Context7Client {
  private baseUrl = 'https://api.context7.com/v1';
  
  async fetchDocs(queries: string[]): Promise<Map<string, string>> {
    const results = new Map<string, string>();
    
    await Promise.all(
      queries.map(async (query) => {
        const response = await fetch(`${this.baseUrl}/search`, {
          method: 'POST',
          headers: {
            'Authorization': `Bearer ${process.env.CONTEXT7_API_KEY}`,
            'Content-Type': 'application/json'
          },
          body: JSON.stringify({
            query,
            sources: [
              'erpnext-docs',
              'frappe-docs',
              'copilotkit-docs',
              'langgraph-docs',
              'claude-sdk-docs'
            ],
            maxResults: 3
          })
        });
        
        const data = await response.json();
        results.set(query, data.content);
      })
    );
    
    return results;
  }

  async getERPNextBestPractices(industry: string): Promise<string> {
    return this.fetchDocs([`erpnext-${industry}-best-practices`])
      .then(r => r.get(`erpnext-${industry}-best-practices`) || '');
  }

  async getCopilotKitExamples(feature: string): Promise<string> {
    return this.fetchDocs([`copilotkit-${feature}-examples`])
      .then(r => r.get(`copilotkit-${feature}-examples`) || '');
  }
}

export const context7 = new Context7Client();
```

**Best Practices**:
- Cache results (1 hour TTL)
- Parallel requests
- Fallback to static docs
- Rate limiting

**MCP Context**: Query Context7 for:
- Context7 API documentation
- MCP protocol specification
- Caching strategies

---

#### T214: Claude Agent SDK Integration
**File**: `frontend/coagent/lib/agent/claude-agent.ts`

**Objective**: Use Claude Agent SDK with advanced features

**Implementation**:
```typescript
import Anthropic from '@anthropic-ai/sdk';
import { context7 } from '../mcp/context7-client';

export class ClaudeAgent {
  private client: Anthropic;
  
  constructor() {
    this.client = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
    });
  }

  async generateWithContext(
    prompt: string,
    contextQueries: string[]
  ): Promise<string> {
    // Fetch relevant documentation
    const docs = await context7.fetchDocs(contextQueries);
    const contextStr = Array.from(docs.entries())
      .map(([k, v]) => `## ${k}\n${v}`)
      .join('\n\n');

    // Use Claude with tool use
    const message = await this.client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      system: `You are an ERPNext expert developer. Use this documentation context:\n\n${contextStr}`,
      messages: [
        {
          role: 'user',
          content: prompt
        }
      ],
      tools: [
        {
          name: 'create_doctype',
          description: 'Create an ERPNext DocType JSON definition',
          input_schema: {
            type: 'object',
            properties: {
              name: { type: 'string' },
              fields: { type: 'array' },
              permissions: { type: 'array' }
            },
            required: ['name', 'fields']
          }
        }
      ]
    });

    return this.extractContent(message);
  }

  async refineCode(
    currentCode: string,
    instruction: string
  ): Promise<{ code: string; diff: string }> {
    const message = await this.client.messages.create({
      model: 'claude-sonnet-4-5-20250929',
      max_tokens: 4096,
      system: 'You are an ERPNext expert. Refine the code based on user feedback.',
      messages: [
        {
          role: 'user',
          content: `Current code:\n\`\`\`json\n${currentCode}\n\`\`\`\n\nChange request: ${instruction}\n\nProvide the updated code.`
        }
      ]
    });

    const updatedCode = this.extractContent(message);
    const diff = this.generateDiff(currentCode, updatedCode);

    return { code: updatedCode, diff };
  }

  private extractContent(message: any): string {
    // Extract text or tool use result
    return message.content[0].text || '';
  }

  private generateDiff(oldCode: string, newCode: string): string {
    // Simple line-by-line diff
    const oldLines = oldCode.split('\n');
    const newLines = newCode.split('\n');
    // ... diff algorithm
    return '';
  }
}

export const claudeAgent = new ClaudeAgent();
```

**Best Practices**:
- Use latest Claude SDK features
- Context-aware prompting
- Tool use for structured output
- Streaming support

**MCP Context**: Query Context7 for:
- Anthropic Claude SDK latest features
- Tool use best practices
- Prompt engineering patterns

---

### 🎯 Phase 7.7: Testing & Documentation (30 min)

#### T215: E2E Test Suite
**File**: `frontend/coagent/__tests__/e2e/developer-flow.test.ts`

**Objective**: Test complete v0-style generation flow

**Implementation**:
```typescript
import { test, expect } from '@playwright/test';

test.describe('v0-Style Developer Flow', () => {
  test('should generate 3 variants from prompt', async ({ page }) => {
    await page.goto('/developer');
    
    // Enter prompt
    await page.fill('[data-testid="chat-input"]', 'Create a hotel reservation system');
    await page.click('[data-testid="send-button"]');
    
    // Wait for generation
    await page.waitForSelector('[data-testid="variant-1"]');
    await page.waitForSelector('[data-testid="variant-2"]');
    await page.waitForSelector('[data-testid="variant-3"]');
    
    // Check all variants exist
    expect(await page.locator('[data-testid="variant-1"]').isVisible()).toBe(true);
    expect(await page.locator('[data-testid="variant-2"]').isVisible()).toBe(true);
    expect(await page.locator('[data-testid="variant-3"]').isVisible()).toBe(true);
  });

  test('should refine selected variant', async ({ page }) => {
    await page.goto('/developer');
    
    // Generate variants (abbreviated)
    // ...
    
    // Select variant 2
    await page.click('[data-testid="variant-2-tab"]');
    
    // Refine
    await page.fill('[data-testid="refinement-input"]', 'Add payment tracking');
    await page.click('[data-testid="refine-button"]');
    
    // Wait for update
    await page.waitForSelector('[data-testid="refinement-complete"]');
    
    // Check code updated
    const code = await page.textContent('[data-testid="code-preview"]');
    expect(code).toContain('payment');
  });

  test('should deploy with approval gate', async ({ page }) => {
    // ... setup
    
    await page.click('[data-testid="deploy-button"]');
    
    // Approval dialog should appear for high-risk
    await page.waitForSelector('[data-testid="approval-dialog"]');
    await page.click('[data-testid="approve-button"]');
    
    // Wait for success
    await page.waitForSelector('[data-testid="deploy-success"]');
  });
});
```

**Best Practices**:
- Playwright for E2E
- Test data builders
- Visual regression tests
- Accessibility tests

**MCP Context**: Query Context7 for:
- Playwright best practices
- React Testing Library
- E2E testing patterns

---

#### T216: Component Storybook
**File**: `frontend/coagent/.storybook/main.ts`

**Objective**: Storybook for component development

**Implementation**:
```typescript
import type { StorybookConfig } from '@storybook/nextjs';

const config: StorybookConfig = {
  stories: ['../components/**/*.stories.tsx'],
  addons: [
    '@storybook/addon-links',
    '@storybook/addon-essentials',
    '@storybook/addon-interactions',
    '@storybook/addon-a11y',
  ],
  framework: {
    name: '@storybook/nextjs',
    options: {},
  },
  docs: {
    autodocs: 'tag',
  },
};

export default config;
```

**Example Story**:
```typescript
// components/preview/doctype-preview.stories.tsx
import type { Meta, StoryObj } from '@storybook/react';
import { DocTypePreview } from './doctype-preview';

const meta: Meta<typeof DocTypePreview> = {
  title: 'Preview/DocTypePreview',
  component: DocTypePreview,
  tags: ['autodocs'],
};

export default meta;
type Story = StoryObj<typeof DocTypePreview>;

export const HotelReservation: Story = {
  args: {
    artifact: {
      id: '1',
      type: 'doctype',
      name: 'Hotel Reservation',
      code: JSON.stringify({
        name: 'Hotel Reservation',
        fields: [
          { fieldname: 'guest_name', label: 'Guest Name', fieldtype: 'Data', reqd: 1 },
          { fieldname: 'room_number', label: 'Room', fieldtype: 'Link', options: 'Room', reqd: 1 },
        ]
      }),
      // ...
    }
  }
};
```

**Best Practices**:
- Stories for all components
- Interaction tests
- Accessibility addon
- Visual regression

**MCP Context**: Query Context7 for:
- Storybook 8.x configuration
- Next.js Storybook integration
- Story writing patterns

---

## 📊 Phase 7 Completion Checklist

### Architecture ✅
- [ ] T200: Split-pane layout with resizable panels
- [ ] T201: Artifact type system (TypeScript types)
- [ ] T202: Zustand state management with Immer

### Generation Engine ✅
- [ ] T203: CopilotKit runtime with Claude Agent SDK
- [ ] T204: 3-variant generation system

### Preview System ✅
- [ ] T205: Interactive DocType preview
- [ ] T206: Workflow Mermaid diagrams
- [ ] T207: Syntax-highlighted code

### Refinement ✅
- [ ] T208: Variant selector tabs
- [ ] T209: Natural language refinement input

### Deployment ✅
- [ ] T210: Deployment panel with approval gate
- [ ] T211: Streaming text animations
- [ ] T212: Keyboard shortcuts

### Context7 Integration ✅
- [ ] T213: Context7 MCP client for docs
- [ ] T214: Claude Agent SDK with context

### Testing ✅
- [ ] T215: E2E tests with Playwright
- [ ] T216: Storybook component library

---

## 🎯 Success Criteria

### Visual Quality (Claude Sonnet 4.5 Demo Level)
- ✅ Split-pane interface with smooth resizing
- ✅ Streaming text animation
- ✅ Smooth transitions and fade-ins
- ✅ Professional color scheme (Tailwind + shadcn)
- ✅ Responsive design (desktop + mobile)

### v0.dev Feature Parity
- ✅ Generate 3 different approaches
- ✅ Live preview of ERPNext components
- ✅ Iterative refinement with natural language
- ✅ One-click deployment
- ✅ Code syntax highlighting with copy/download

### Performance
- ✅ First variant: < 3 seconds
- ✅ All 3 variants: < 8 seconds
- ✅ Refinement: < 2 seconds
- ✅ Preview render: < 100ms
- ✅ Smooth 60fps animations

### Developer Experience
- ✅ Clear code structure following best practices
- ✅ TypeScript strict mode enabled
- ✅ Comprehensive JSDoc comments
- ✅ Storybook for component development
- ✅ E2E tests for critical flows

---

## 🔧 Framework Best Practices Applied

### Next.js 15 App Router
- ✅ Server Components for static content
- ✅ Client Components for interactivity
- ✅ Parallel routes for split-pane
- ✅ Route groups for organization
- ✅ API routes with edge runtime

### React 19 Features
- ✅ useOptimistic for instant feedback
- ✅ useFormStatus for loading states
- ✅ Suspense boundaries
- ✅ Error boundaries
- ✅ Server Actions for mutations

### CopilotKit v1.10.5+
- ✅ CopilotRuntime with actions
- ✅ CopilotSidebar for chat
- ✅ useCopilotAction hooks
- ✅ Streaming responses
- ✅ Tool use integration

### Tailwind CSS + shadcn/ui
- ✅ Consistent design tokens
- ✅ Dark mode support
- ✅ Accessible components
- ✅ Responsive utilities
- ✅ Custom animations

### Claude Agent SDK
- ✅ Tool use for structured output
- ✅ Streaming responses
- ✅ Context injection
- ✅ Multi-turn conversations
- ✅ Error handling

### Context7 MCP
- ✅ Real-time documentation fetching
- ✅ Framework-specific examples
- ✅ Best practices injection
- ✅ Caching for performance
- ✅ Fallback to static docs

---

## 📚 Documentation Requirements

### Component Documentation
Each component must have:
- JSDoc with description
- Props interface with descriptions
- Usage examples
- Accessibility notes
- Storybook story

### API Documentation
Each API route must have:
- OpenAPI/Swagger spec
- Request/response examples
- Error codes
- Rate limiting info
- Authentication requirements

### User Guide
Create `DEVELOPER_GUIDE.md` with:
- Getting started tutorial
- Feature walkthrough
- Keyboard shortcuts reference
- Best practices
- Troubleshooting

---

## 🚀 Deployment

After Phase 7 completion:

```bash
# Build
cd frontend/coagent
pnpm run build

# Deploy to Cloudflare Pages
pnpm dlx wrangler pages deploy out --project-name=erpnext-coagent-ui

# Verify
curl https://erpnext-coagent-ui.pages.dev
```

**Expected Result**: v0.dev-style interface with 3-variant generation, live previews, and deployment capabilities.

---

## 💡 Context7 MCP Queries for Development

Use these queries when building:

```typescript
// Component patterns
context7.fetchDocs(['copilotkit-sidebar-customization']);
context7.fetchDocs(['shadcn-ui-tabs-advanced-usage']);
context7.fetchDocs(['framer-motion-layout-animations']);

// ERPNext specifics
context7.fetchDocs(['erpnext-doctype-json-schema']);
context7.fetchDocs(['frappe-workflow-state-machine']);
context7.fetchDocs(['erpnext-permissions-system']);

// Best practices
context7.fetchDocs(['next-js-15-app-router-patterns']);
context7.fetchDocs(['react-19-concurrent-features']);
context7.fetchDocs(['zustand-typescript-patterns']);
```

---

## 🎯 Time Breakdown (4-6 hours)

| Phase | Tasks | Est. Time |
|-------|-------|-----------|
| 7.1: Architecture | T200-T202 | 45 min |
| 7.2: Generation Engine | T203-T204 | 90 min |
| 7.3: Preview System | T205-T207 | 75 min |
| 7.4: Refinement | T208-T209 | 60 min |
| 7.5: Deployment | T210-T212 | 60 min |
| 7.6: Context7 | T213-T214 | 45 min |
| 7.7: Testing | T215-T216 | 30 min |
| **Total** | **17 tasks** | **405 min (6.75 hrs)** |

**Buffer**: Add 25% for debugging, testing, polish = **~8 hours total**

---

**Ready to implement Phase 7!** 🚀

Use Context7 MCP for all framework documentation needs. Follow the patterns above for professional, production-ready code.


---

## ⭐ Phase 7: v0-Style Developer Frontend (NEW - HIGH PRIORITY)

**Goal**: Transform frontend into v0.dev/Claude Sonnet 4.5 demo quality interface

**Status**: 📋 Ready to implement  
**Time Estimate**: 4-6 hours focused development  
**Tasks**: T200-T216 (17 tasks)

### 🎯 What We're Building

A professional ERPNext app generator with:
- ✅ **3-variant generation** (minimal, standard, advanced)
- ✅ **Split-pane interface** (chat 40% + preview 60%)
- ✅ **Live ERPNext previews** (DocTypes, workflows, code)
- ✅ **Iterative refinement** (natural language edits)
- ✅ **One-click deployment** (with approval gates)
- ✅ **Claude Sonnet 4.5 quality** (animations, polish)

### 📚 Complete Documentation

**See**: `PHASE_7_V0_STYLE_FRONTEND.md` for:
- Detailed task breakdown (T200-T216)
- Complete code examples
- Architecture diagrams
- Testing strategy
- Context7 MCP integration guide
- Performance optimization tips
- Deployment instructions

### 🚀 Quick Start

```bash
cd frontend/coagent

# Install dependencies
pnpm install

# Start development
pnpm run dev

# Open Storybook
pnpm run storybook
```

### 📦 Key Technologies

- **Next.js 15** App Router
- **CopilotKit 1.10.5+** for AI integration
- **Claude Agent SDK** with tool use
- **Context7 MCP** for framework docs
- **shadcn/ui + Tailwind** for design
- **Framer Motion** for animations
- **Zustand + Immer** for state
- **Playwright** for E2E testing

### ✅ Success Criteria

- [ ] Visual quality matches Claude Sonnet 4.5 demo
- [ ] Generate 3 variants in < 8 seconds
- [ ] Live preview renders in < 100ms
- [ ] Refinement completes in < 2 seconds
- [ ] Smooth 60fps animations
- [ ] All E2E tests passing
- [ ] Deployed to Cloudflare Pages

### 🔗 Related Files

- `PHASE_7_V0_STYLE_FRONTEND.md` - Full implementation guide
- `DEPLOYMENT_INDEX.md` - Deployment reference
- `CLOUDFLARE_QUICK_REF.md` - Monitoring guide

---

**Priority**: Implement Phase 7 BEFORE Phase 3.4+ tasks

**Why**: This is the user-facing experience. Core backend is working (Agent Gateway deployed). Now we need the professional frontend to match.

**Next Action**: Follow `PHASE_7_V0_STYLE_FRONTEND.md` step-by-step.

---

## 🎨 Phase 8: Production-Ready Developer UI (22 Tasks)

**Goal**: Build Vercel AI Chatbot-quality UI with CopilotKit + Claude Agent SDK  
**Status**: 📋 PLANNED (Not Started)  
**Estimated**: 15-20 hours  
**File**: `PHASE_8_PRODUCTION_UI.md`

### Overview

Upgrade from Phase 7 prototype to a **production-grade chat interface** with:
- Multi-session chat management
- Real-time streaming with Claude SDK
- Enhanced code previews
- Local persistence (IndexedDB)
- Authentication (Next Auth)
- Dark/light mode
- Mobile responsive
- E2E tested

### Task Groups

**Phase 8.1: Core Chat Experience** (T217-T221) - 5 tasks, 9.5 hours
- Modern chat layout with sidebar
- Streaming message component
- Rich input with attachments
- Virtual scrolling
- CopilotKit integration layer

**Phase 8.2: Session Management** (T222-T225) - 4 tasks, 7.5 hours
- Chat history sidebar
- Zustand session store
- IndexedDB persistence layer
- Import/export sessions

**Phase 8.3: Artifact System** (T226-T229) - 4 tasks, 8.5 hours
- Enhanced artifact types
- Advanced code preview
- Actions panel (copy/download/deploy)
- Interactive previews

**Phase 8.4: Claude Agent SDK** (T230-T232) - 3 tasks, 6.5 hours
- Agent configuration
- Tool definitions
- Streaming handler

**Phase 8.5: UI Polish** (T233-T235) - 3 tasks, 5 hours
- Theme system
- Framer Motion animations
- Empty states + onboarding

**Phase 8.6: Auth & Security** (T236-T237) - 2 tasks, 3.5 hours
- Auth.js integration
- User settings panel

**Phase 8.7: Testing** (T238) - 1 task, 2 hours
- E2E test suite

### Key Technologies

```json
{
  "@anthropic-ai/sdk": "^0.28.0",
  "idb": "^8.0.0",
  "diff-match-patch": "^1.0.5",
  "next-auth": "^5.0.0-beta.24",
  "react-markdown": "^9.0.1",
  "react-window": "^1.8.10"
}
```

### Success Criteria

- [ ] Performance: FCP < 1.5s
- [ ] Mobile: Works on 375px+
- [ ] Accessibility: WCAG 2.1 AA
- [ ] Streaming: Real-time display
- [ ] Persistence: Survives refresh
- [ ] Tests: 80%+ coverage

### Implementation Order

1. **Week 1**: Core chat experience (T217-T221)
2. **Week 2**: Sessions + artifacts (T222-T229)
3. **Week 3**: Claude SDK + polish (T230-T238)

**See**: `PHASE_8_PRODUCTION_UI.md` for complete task breakdown

---
