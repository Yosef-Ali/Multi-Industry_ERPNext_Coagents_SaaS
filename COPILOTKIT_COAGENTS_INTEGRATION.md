# CopilotKit CoAgents Integration - Best Practices

**Status**: Implementation guide for integrating CopilotKit CoAgents with LangGraph workflows
**Based on**: CopilotKit v1.x CoAgents official documentation
**Date**: 2025-10-02

---

## 🎯 Overview

This guide documents how to integrate our **LangGraph workflows** with **CopilotKit CoAgents** for a production-ready agentic UI experience.

### What We Have
- ✅ 5 LangGraph workflows (Python) with `interrupt()` approval gates
- ✅ FastAPI HTTP service for workflow execution
- ✅ Claude Agent SDK (TypeScript) orchestrator + subagents
- ✅ Frontend with CopilotKit provider setup

### What We Need
- ⏳ CoAgent state sharing with `useCoAgent`
- ⏳ Agentic generative UI with `useCoAgentStateRender`
- ⏳ Human-in-the-loop approvals with `render AndWaitForResponse`
- ⏳ Multi-agent orchestration

---

## 📚 CopilotKit CoAgents Architecture

### Key Patterns from Documentation

#### 1. **CoAgent State Sharing** (`useCoAgent`)

```typescript
import { useCoAgent } from "@copilotkit/react-core";

const { agentState } = useCoAgent({
  name: "hotel_o2c_agent",
  initialState: {
    reservation_id: "RES-001",
    guest_name: "John Doe",
    room_number: "101"
  }
});

// agentState is automatically synced with LangGraph agent state
```

**Purpose**: Share state between frontend and backend agent
**Use case**: Track workflow progress in real-time

---

#### 2. **Agentic Generative UI** (`useCoAgentStateRender`)

```typescript
import { useCoAgentStateRender } from "@copilotkit/react-core";

useCoAgentStateRender({
  name: "hotel_o2c_agent",
  render: ({ state }) => {
    if (!state.folio_id) return null;

    return (
      <FolioPreview
        folioId={state.folio_id}
        roomNumber={state.room_number}
        charges={state.total_charges}
      />
    );
  },
});
```

**Purpose**: Render UI based on agent's internal state
**Use case**: Show workflow progress, entity previews, status updates

---

#### 3. **Human-in-the-Loop** (`useCopilotAction` with `renderAndWaitForResponse`)

```typescript
import { useCopilotAction } from "@copilotkit/react-core";

useCopilotAction({
  name: "approve_check_in",
  parameters: [
    {
      name: "guest_details",
      type: "object",
      description: "Guest check-in details",
      required: true,
    },
  ],
  renderAndWaitForResponse: ({ args, status, respond }) => {
    return (
      <CheckInApprovalDialog
        guestName={args.guest_details.guest_name}
        roomNumber={args.guest_details.room_number}
        isExecuting={status === "executing"}
        onApprove={() => respond?.({
          approved: true,
          metadata: { approvedAt: new Date().toISOString() }
        })}
        onReject={() => respond?.({
          approved: false,
          reason: "Guest check-in rejected"
        })}
      />
    );
  },
});
```

**Purpose**: Pause workflow for human approval
**Use case**: Approval gates from `interrupt()` in LangGraph

---

## 🏗️ Integration Architecture

### Current Flow (Without CoAgents)
```
User → Frontend → Agent Gateway → Subagent → Workflow Service → LangGraph → interrupt() → ???
```

### Target Flow (With CoAgents)
```
User → Frontend (useCoAgent)
         ↓
    Agent Gateway
         ↓
    Subagent (LangGraph CoAgent)
         ↓
    Workflow Service
         ↓
    LangGraph StateGraph
         ↓
    interrupt() → renderAndWaitForResponse
         ↓
    User approves → resume
         ↓
    useCoAgentStateRender (shows progress)
```

---

## 🔧 Implementation Tasks

### Phase 1: Update Frontend (T094-T099)

#### T094: ✅ CopilotKit Provider Setup
**Status**: Partially complete
**Current**: Basic CopilotKit provider in `App.tsx`
**Needed**: Update to support CoAgents

**Update `App.tsx`**:
```typescript
import { CopilotKit } from "@copilotkit/react-core";

<CopilotKit
  runtimeUrl={`${config.gatewayUrl}/api/copilotkit`}
  agent="erpnext_orchestrator" // Main orchestrator agent
  publicApiKey={config.authToken}
  showDevConsole={import.meta.env.DEV}
>
  {children}
</CopilotKit>
```

---

#### T095: ⏳ Update `useCopilot` Hook

**File**: `frontend/coagent/src/hooks/useCopilot.ts`

**Add CoAgent support**:
```typescript
import { useCoAgent, useCoAgentStateRender, useCopilotAction } from "@copilotkit/react-core";

export function useWorkflowCoAgent(workflowName: string, initialState: any) {
  // Share state with LangGraph agent
  const { agentState } = useCoAgent({
    name: workflowName,
    initialState
  });

  // Render workflow state
  useCoAgentStateRender({
    name: workflowName,
    render: ({ state, nodeName, status }) => {
      return <WorkflowProgressIndicator
        state={state}
        currentNode={nodeName}
        status={status}
      />;
    },
  });

  return { agentState };
}
```

---

#### T097: ⏳ Update EventStream Component

**File**: `frontend/coagent/src/components/EventStream.tsx`

**Use CoAgent state rendering**:
```typescript
import { useCoAgentStateRender } from "@copilotkit/react-core";

export function EventStream({ agentName }: { agentName: string }) {
  useCoAgentStateRender({
    name: agentName,
    render: ({ state }) => {
      if (!state.steps_completed) return null;

      return (
        <div className="space-y-2">
          {state.steps_completed.map((step, index) => (
            <StepComplete key={index} step={step} />
          ))}
        </div>
      );
    },
  });

  return <div className="event-stream-container" />;
}
```

---

#### T098: ⏳ Update ApprovalDialog Component

**File**: `frontend/coagent/src/components/ApprovalDialog.tsx`

**Use `renderAndWaitForResponse` pattern**:
```typescript
import { useCopilotAction } from "@copilotkit/react-core";

export function HotelCheckInApproval() {
  useCopilotAction({
    name: "approve_hotel_check_in",
    parameters: [
      {
        name: "guest_details",
        type: "object",
        description: "Guest check-in information",
        required: true,
      },
    ],
    renderAndWaitForResponse: ({ args, status, respond }) => {
      const details = args.guest_details;

      return (
        <ApprovalDialog
          title="Approve Guest Check-In"
          isExecuting={status === "executing"}
          onCancel={() => respond?.({ approved: false })}
          onApprove={() => respond?.({
            approved: true,
            metadata: { approvedAt: new Date().toISOString() }
          })}
        >
          <div className="space-y-2">
            <p><strong>Guest:</strong> {details.guest_name}</p>
            <p><strong>Room:</strong> {details.room_number}</p>
            <p><strong>Check-in:</strong> {details.check_in_date}</p>
            <p><strong>Check-out:</strong> {details.check_out_date}</p>
          </div>
        </ApprovalDialog>
      );
    },
  });

  return null; // Rendered via hook
}
```

---

### Phase 2: Update Agent Gateway

#### Update CopilotKit Runtime

**File**: `services/agent-gateway/src/api/copilotkit/route.ts`

```typescript
import { CopilotRuntime } from "@copilotkit/runtime";
import { langGraphPlatformEndpoint } from "@copilotkit/runtime";

const runtime = new CopilotRuntime({
  agents: [
    // Define each workflow as a CoAgent
    langGraphPlatformEndpoint({
      deploymentUrl: process.env.WORKFLOW_SERVICE_URL || "http://localhost:8001",
      agents: [
        {
          name: "hotel_o2c",
          description: "Hotel Order-to-Cash workflow"
        },
        {
          name: "hospital_admissions",
          description: "Hospital admissions workflow"
        },
        {
          name: "manufacturing_production",
          description: "Manufacturing production workflow"
        },
        {
          name: "retail_fulfillment",
          description: "Retail order fulfillment workflow"
        },
        {
          name: "education_admissions",
          description: "Education admissions workflow"
        }
      ]
    })
  ]
});

export async function POST(req: Request) {
  const { handleRequest } = runtime;
  return handleRequest(req);
}
```

---

### Phase 3: Update Workflow Service

#### Add CopilotKit State Integration

**File**: `services/workflows/src/server.py`

**Add CopilotKit state middleware**:
```python
from copilotkit import CopilotKitState, copilotkit_emit_state

# Update state schema to inherit from CopilotKitState
class HotelO2CState(CopilotKitState):
    # Existing fields
    reservation_id: str
    guest_name: str
    room_number: str

    # ... rest of state

# Emit state updates to frontend
async def check_in_guest(state: HotelO2CState) -> Command:
    # Emit state to frontend
    await copilotkit_emit_state(state)

    # Request approval
    decision = interrupt({
        "operation": "approve_hotel_check_in",
        "guest_details": {
            "guest_name": state["guest_name"],
            "room_number": state["room_number"],
            "check_in_date": state["check_in_date"],
            "check_out_date": state["check_out_date"]
        }
    })

    # ... rest of logic
```

---

## 📝 Task Updates for tasks.md

### Completed Tasks
- [x] T094 - CopilotKit provider setup (basic implementation exists)

### Updated Task Descriptions

**T095**: Update `useCopilot` hook with CoAgent integration
```markdown
- [ ] T095 Implement useCoAgent integration in frontend/coagent/src/hooks/useCopilot.ts with state sharing and useCoAgentStateRender for workflow progress
```

**T097**: Update EventStream component
```markdown
- [x] T097 Implement EventStream component in frontend/coagent/src/components/EventStream.tsx using useCoAgentStateRender for real-time state visualization
```

**T098**: Update ApprovalDialog component
```markdown
- [x] T098 Implement ApprovalDialog component in frontend/coagent/src/components/ApprovalDialog.tsx using useCopilotAction with renderAndWaitForResponse for LangGraph interrupt() gates
```

**T099**: AG-UI event parsing utilities
```markdown
- [ ] T099 Implement AG-UI event parsing utilities in frontend/coagent/src/utils/streaming.ts for CopilotKit message stream handling
```

---

## 🧪 Testing CoAgent Integration

### Test 1: State Sharing
```typescript
// In component
const { agentState } = useCoAgent({
  name: "hotel_o2c",
  initialState: { reservation_id: "RES-001" }
});

// Should see state updates in real-time as workflow progresses
console.log(agentState.folio_id); // Updates when folio is created
```

### Test 2: Generative UI
```typescript
// Should render FolioPreview when folio_id exists in state
useCoAgentStateRender({
  name: "hotel_o2c",
  render: ({ state }) => {
    return state.folio_id ? <FolioPreview id={state.folio_id} /> : null;
  }
});
```

### Test 3: Approval Flow
```typescript
// Should show approval dialog when interrupt() is hit
useCopilotAction({
  name: "approve_check_in",
  renderAndWaitForResponse: ({ respond }) => {
    return <ApprovalDialog onApprove={() => respond({ approved: true })} />;
  }
});
```

---

## 🚀 Deployment Considerations

### Environment Variables
```env
# Frontend
VITE_GATEWAY_URL=https://erpnext-agent-gateway.workers.dev
VITE_COPILOTKIT_PUBLIC_KEY=ck_pub_...

# Agent Gateway
WORKFLOW_SERVICE_URL=https://erpnext-workflows.onrender.com
ANTHROPIC_API_KEY=sk-ant-...

# Workflow Service
COPILOTKIT_ENABLED=true
```

### CopilotKit Endpoint
```
Agent Gateway: https://erpnext-agent-gateway.workers.dev/api/copilotkit
Workflow Service: https://erpnext-workflows.onrender.com/copilotkit
```

---

## 📚 References

- **CopilotKit CoAgents Docs**: https://docs.copilotkit.ai/coagents
- **LangGraph Integration**: https://docs.copilotkit.ai/langgraph
- **Human-in-the-Loop**: https://docs.copilotkit.ai/coagents/human-in-the-loop
- **useCoAgent Hook**: https://docs.copilotkit.ai/reference/hooks/useCoAgent
- **useCoAgentStateRender**: https://docs.copilotkit.ai/reference/hooks/useCoAgentStateRender

---

## ✅ Next Steps

1. ⏳ Update `useCopilot.ts` with `useCoAgent` integration
2. ⏳ Update `EventStream.tsx` with `useCoAgentStateRender`
3. ⏳ Update `ApprovalDialog.tsx` with `renderAndWaitForResponse`
4. ⏳ Create CopilotKit runtime endpoint in agent-gateway
5. ⏳ Add CopilotKitState to Python workflows
6. ⏳ Test end-to-end CoAgent flow
7. ⏳ Deploy and verify in production

---

**Status**: Ready for implementation
**Priority**: High (enables full agentic UI experience)
**Estimated Effort**: 2-3 hours for frontend, 1-2 hours for backend

