# Comment / Agent Instructions for Local Development

## Purpose
This file communicates to the local development agent (e.g. Codex, AI assistant, CLI bot) exactly what architectural, design, and coding conventions to follow while working on this project. It's a reference contract the agent should consult before generating or modifying code.

---

## Project Overview

- This is a multi-industry ERPNext coagent SaaS project.
- We maintain ERPNext's native UI/UX, augmenting with a "Copilot" panel rather than replacing ERPNext pages.
- All mutations (writes) to ERPNext must go through typed tools in our agent gateway, not direct client calls or ad-hoc REST usage.
- High-impact operations (app generation, bulk updates, critical document changes) must include human-in-the-loop (HITL) approval before execution.
- Core business workflows (e.g. Order-to-Cash, Admissions -> Billing) should be encoded as LangGraph graphs with explicit branches, retries, fallback, and escalation.
- The agent gateway API must provide a streaming AG-UI endpoint (SSE) to push events (chat messages, tool invocations, UI prompts, results).
- Security, observability, and perf are non-negotiable: rate limits, CORS, validation, logging, idempotency, batching.

---

## Conventions & Constraints for Code Generation

1. **Language / Stack**
   - Backend: TypeScript (Node + Express) for agent gateway
   - Tools: use Claude Agent SDK tool definitions
   - Frontend: React / CopilotKit (AG-UI consumer)
   - Workflows: LangGraph (JS/TS or Python, but consistent in repo)
   - ERP app: Python, Frappe / ERPNext standard patterns

2. **API / Gateway / `api.ts` style**
   - Use `helmet()`, `cors()` with allowlist, express-rate-limit
   - JSON body parsing with size limit
   - `GET /health` endpoint
   - `POST /agui` endpoint streams SSE events (don't buffer)
   - Validate request payloads (e.g. with `zod` or JSON Schema)
   - Require bearer token for UI -> gateway
   - Sanitize errors; do not expose internal stack to client
   - ERP secrets (API key, etc.) only via environment variables

3. **Tool definitions / handlers**
   - Every tool must have an input schema and output contract
   - Tools may call Frappe/ERPNext REST or whitelisted RPC methods
   - No raw SQL or unvalidated client-supplied queries
   - Wrap writes behind approval logic when required (HITL)
   - Include idempotency or retry logic where appropriate
   - Return structured, minimal JSON (not raw HTML or full error traces)

4. **HITL / Approval flows**
   - Use CopilotKit's `renderAndWaitForResponse` pattern in UI
   - From the backend side, an approval request should be turned into an AG-UI frame (`ui_prompt`) with summary
   - The system must wait for the `ui_response` before executing the write tool
   - If canceled, skip the operation gracefully, notify the user

5. **LangGraph workflows**
   - Design graphs per vertical (Hotel, Hospital) for critical flows
   - Each node should call exactly one tool (or subagent)
   - Branching logic for errors, fallback, approvals
   - Emit node progress into AG-UI frames, so the UI panel can show "Node X ran, result Y"
   - Allow for user intervention / escalation in graphs

6. **Frontend (CopilotKit / AG-UI consumer)**
   - Wrap app in `CopilotKitProvider` targeting the gateway `/agui`
   - Use `useCopilotAction` or similar to integrate approval UI
   - Display tool result panels; stream intermediate tokens/messages
   - Keep UI minimal and aligned with ERPNext design (colors, spacing)

7. **Logging / Observability**
   - Log each tool invocation: tool name, caller session/user, input summary, start/end timestamp, latency, outputs (or partial)
   - Log graph runtime paths: which nodes ran, branch taken, any errors
   - Log approval decisions (approved / canceled) with user ID and context
   - Errors must include internal correlation ID; client sees minimal error code/message

8. **Performance & batching**
   - For operations on multiple records (child lines, updates), prefer `bulk_update` tools
   - Stream results gradually, don't wait for full job completion
   - Use "first token" thresholds: try to emit first response within ~400-500ms
   - Tune timeouts (e.g. keep `/agui` live for longer durations, short timeouts on helper endpoints)

9. **File / directory structure & boundaries**
   - Keep ERPNext apps under `/apps/<vertical>`
   - Gateway server code under `/services/agent-gateway`
   - Workflow graphs under `/services/workflows`
   - Frontend under `/frontend/coagent`
   - Generator logic under `/generator/service`
   - No cross-pollination; one component should not touch another's internal details

10. **Definition of Done for any new code**
    - Pass input validation tests / schema checks
    - Include unit tests or mocks where applicable
    - Demonstrate integration in a sample vertical (Hotel or Hospital)
    - Show working UI panel + approval + tool execution
    - Log metadata as per observability spec
    - No lint errors; follows repo style (indent, naming)
    - Document any new environment vars or setup steps

---

If the agent (Codex or other) adheres to these rules when generating or modifying code, it will maintain architectural integrity, security, and forward flexibility. Use this file as a guardrail.
