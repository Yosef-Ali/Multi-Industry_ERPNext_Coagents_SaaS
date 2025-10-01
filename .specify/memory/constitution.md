<!--
SYNC IMPACT REPORT
===================
Version Change: Initial → 1.0.0
Constitution created from scratch for Multi-Industry ERPNext Coagents SaaS project.

Core Principles Established:
- Native-First Integration (ERPNext Client Scripts)
- Safe-by-Default Mutations (typed tools + server validation)
- Human-in-the-Loop (HITL) Approval Pattern
- Deterministic Workflows (LangGraph)
- Modular Vertical Architecture
- Spec-Driven Development

Templates Status:
✅ plan-template.md - Aligned with constitution gates
✅ spec-template.md - Scope constraints match principles
✅ tasks-template.md - TDD and modular task structure compatible

Follow-up Actions:
- Constitution established and ready for Phase 0 research
- Agent context files to be generated during Phase 1 design
- No outstanding placeholders or deferred items
-->

# Multi-Industry ERPNext Coagents SaaS Constitution

## Core Principles

### I. Native-First Integration
All coagent features MUST augment ERPNext's existing UI through **Client Scripts** (buttons, panels, form extensions). We preserve native workflows, standard pages, and established UX patterns rather than creating parallel interfaces. Custom client scripts register on specific DocTypes (e.g., Reservation, Invoice, Patient, Encounter) to inject coagent entry points seamlessly.

**Rationale**: Minimizes user retraining, ensures compatibility with ERPNext upgrades, and respects the battle-tested UX of existing deployments.

### II. Safe-by-Default Mutations
Every data mutation MUST flow through:
1. **Typed tool handlers** - Structured input validation and parameter schemas
2. **Frappe REST/RPC APIs** - Server-side permission checks and business rule enforcement
3. **No raw SQL or direct DB access** - Prevents privilege escalation and data corruption

Agent tools are declarative wrappers around vetted API endpoints. All mutations are idempotent and support automatic retries on transient failures.

**Rationale**: Server-side validation guarantees RBAC enforcement; idempotency prevents duplicate operations during retries; typed tools enable static analysis and testing.

### III. Human-in-the-Loop (HITL) Approval Pattern
High-impact operations require explicit user approval via UI prompts before execution:
- **App generation** (SaaS generator flow) - Propose app plan → user reviews → approved generation
- **Bulk updates** (mass data mutations) - Show preview → user confirms → execute batch
- **Workflow changes** (modifying automation rules) - Display diff → user accepts → apply

Implementation uses CopilotKit's **renderAndWaitForResponse** pattern to pause agent execution until user interaction completes. Non-blocking for read operations and low-risk writes.

**Rationale**: Builds user trust, prevents runaway automation, creates audit trail for critical decisions, enables learning from user corrections.

### IV. Deterministic Workflows (LangGraph)
Core business flows MUST be encoded as **LangGraph state machines** with:
- **Explicit states** - Each step has clear preconditions and postconditions
- **Branch conditions** - Decision logic is testable and observable
- **Retry policies** - Transient failures handled deterministically
- **Audit trail** - Each state transition logged with timestamp and context

Use LangGraph for multi-step processes like: SaaS app generation pipeline, bulk reservation imports, invoice reconciliation workflows. Single-turn Q&A or simple CRUD can use direct agent calls.

**Rationale**: Observability for debugging, reproducibility for testing, explicit error boundaries, compliance-ready audit logs.

### V. Modular Vertical Architecture
System organized as:
- **Common tool surface** - Shared agent SDK with universal tools (doc CRUD, search, user context)
- **Industry app packages** - Isolated ERPNext apps per vertical (Hotel Management, Hospital Management)
- **Per-industry extensions** - Custom DocTypes, workflows, and tool specializations in vertical packages

Each industry package is self-contained with its own migrations, fixtures, and client scripts. Common tools never import industry-specific logic; industry tools can compose common tools.

**Rationale**: Independent deployment of verticals, simplified testing (test common core once), clear ownership boundaries, scales to N industries without core changes.

### VI. Spec-Driven Development
Feature work follows strict lifecycle:
1. **/specify** - Capture user requirements, clarify ambiguities, generate spec.md
2. **/plan** - Research unknowns, design data models and contracts, output Phase 0-1 artifacts
3. **/tasks** - Generate ordered, testable task list from design docs
4. **Implementation** - Execute tasks following TDD (tests first, then implementation)

All design artifacts live in `/specs/[feature-branch]/`. No code changes without corresponding spec/plan. Constitution gates enforced at planning phase.

**Rationale**: Prevents scope creep, ensures testability, creates design documentation automatically, enables asynchronous review cycles.

## Architecture Constraints

### Technology Stack (NON-NEGOTIABLE)
- **Backend Framework**: Frappe Framework (Python) - required for ERPNext compatibility
- **Agent Runtime**: Anthropic Agent SDK (TypeScript/Python) - typed tool system
- **Workflow Engine**: LangGraph - deterministic state machines
- **UI Framework**: CopilotKit + AG-UI - streaming agent interactions with HITL approvals
- **ERPNext Apps**: Standard app structure with hooks.py, client scripts, DocTypes

**Rationale**: Frappe is foundational to ERPNext; ADK provides robust tool calling; LangGraph enables observable workflows; CopilotKit solves streaming + approval UX.

### Security & RBAC
- Agent sessions MUST map 1:1 to authenticated ERPNext user sessions
- All API calls inherit user's role permissions via Frappe RBAC
- Tool handlers MUST validate inputs before API calls (defense in depth)
- Agent logs stored with user_id, timestamp, tool_name, inputs/outputs
- No credential storage in agent state; use session tokens only

### Testing Requirements
- **Contract tests** - All tool handlers verify API contract compliance
- **Workflow tests** - LangGraph state machines tested with mock states
- **Integration tests** - End-to-end flows against ERPNext test site
- **Client script tests** - UI injection verified in Frappe test harness
- **HITL simulation** - Approval prompts tested with automated responses

Minimum 80% coverage on tool handlers and workflows before production deployment.

## Development Workflow

### Feature Lifecycle
1. **Spec Phase** - Business requirements captured without implementation details
2. **Plan Phase** - Technical design, unknown resolution, contract generation
3. **Task Phase** - Ordered, testable task breakdown with [P] parallel markers
4. **Implementation Phase** - TDD execution (failing tests → code → passing tests)
5. **Review Phase** - Constitution compliance check, security review, integration validation

### Branching & Versioning
- Feature branches: `[###-feature-name]` (e.g., `001-hotel-copilot-panel`)
- Constitution version: `MAJOR.MINOR.PATCH` semantic versioning
  - **MAJOR**: Backward-incompatible principle changes (e.g., removing LangGraph requirement)
  - **MINOR**: New principle/constraint added (e.g., adding new security rule)
  - **PATCH**: Clarifications, typo fixes, non-semantic updates
- ERPNext app versions follow standard app versioning (independent of constitution)

### Code Organization
```
[repo-root]/
├── apps/
│   ├── common/              # Shared agent tools and base classes
│   │   ├── hotel_management/  # ERPNext app for hospitality vertical
│   │   └── hospital_management/ # ERPNext app for healthcare vertical
├── specs/                   # Feature specifications and design docs
│   └── [###-feature-name]/
│       ├── spec.md
│       ├── plan.md
│       ├── research.md
│       ├── data-model.md
│       ├── contracts/
│       └── tasks.md
├── .specify/
│   ├── memory/
│   │   └── constitution.md  # This file
│   └── templates/           # Spec-Kit templates
└── tests/
    ├── contract/            # API contract tests
    ├── integration/         # End-to-end workflow tests
    └── unit/                # Tool handler unit tests
```

## Governance

### Amendment Process
1. Propose change via GitHub issue with rationale
2. Tag as `constitution-amendment`
3. Require approval from 2+ core maintainers
4. Update constitution.md with version bump
5. Run sync check on all templates and agent files
6. Document migration path for breaking changes (MAJOR bumps)

### Compliance Review
- **Pre-merge gate**: All PRs must pass constitution checks in plan.md
- **Quarterly audit**: Review agent logs for RBAC violations or bypassed approvals
- **Complexity tracking**: Deviations from principles documented with justification in plan.md
- **Simplicity bias**: Reject additions unless clear value > added complexity

### Precedence
This constitution supersedes:
- Undocumented conventions
- Verbal agreements
- Prior ad-hoc decisions not ratified here

When constitution conflicts with external dependencies (ERPNext conventions, Frappe best practices), document exception in plan.md Complexity Tracking table.

**Version**: 1.0.0 | **Ratified**: 2025-10-01 | **Last Amended**: 2025-10-01
