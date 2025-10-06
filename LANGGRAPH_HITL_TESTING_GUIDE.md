# LangGraph HITL Testing Guide

## Overview
This guide explains how to test the LangGraph Human-in-the-Loop (HITL) implementation with approval gates for the developer chat.

## Prerequisites

1. **Backend (Agent Gateway) running**
   ```bash
   cd services/agent-gateway
   npm run dev
   ```

2. **Frontend running**
   ```bash
   cd frontend/coagent
   npm run dev
   ```

3. **Environment Variables**

   **Backend** (`.env` or `.dev.vars`):
   ```bash
   # Optional: PostgreSQL for state persistence
   POSTGRES_URL=postgresql://user:password@localhost:5432/langgraph
   # OR
   DATABASE_URL=postgresql://user:password@localhost:5432/langgraph
   ```

   **Frontend** (`.env.local`):
   ```bash
   # Enable LangGraph HITL routing
   USE_LANGGRAPH_HITL=1

   # Gateway URL
   NEXT_PUBLIC_AGENT_GATEWAY_URL=http://localhost:3001
   # OR
   AGENT_GATEWAY_URL=http://localhost:3001
   ```

## Testing Scenarios

### 1. Low-Risk Operation (No Approval Needed)

**Test Input:**
```
"Show me the list of customers"
```

**Expected Behavior:**
- ✅ Message processed immediately
- ✅ No approval dialog appears
- ✅ Response returned directly

**Risk Assessment:**
- Risk Level: `low`
- Approval Needed: `false`

---

### 2. Medium-Risk Operation (Approval Required)

**Test Input:**
```
"Create a new sales order for customer ABC123"
```

**Expected Behavior:**
1. ✅ Message sent to LangGraph workflow
2. ✅ Risk classified as `medium`
3. ✅ Workflow pauses with `interrupt()`
4. ✅ Approval dialog appears showing:
   - Question: "Do you want to proceed with this operation?"
   - Risk Level: MEDIUM (yellow)
   - Operation: "Create a new sales order for customer ABC123"
   - Tool calls (if any)
5. ✅ User approves → workflow resumes → operation executes
6. ✅ User rejects → workflow cancelled → operation skipped

**Risk Assessment:**
- Keywords detected: `create`
- Risk Level: `medium`
- Approval Needed: `true`

---

### 3. High-Risk Operation (Approval Required with Warning)

**Test Input:**
```
"Delete all draft sales orders from last month"
```

**Expected Behavior:**
1. ✅ Message sent to LangGraph workflow
2. ✅ Risk classified as `high`
3. ✅ Workflow pauses with `interrupt()`
4. ✅ Approval dialog appears showing:
   - Question: "Do you want to proceed with this operation?"
   - Risk Level: HIGH (red)
   - Operation: "Delete all draft sales orders from last month"
   - **Warning Alert:** "This is a high-risk operation that may modify critical data..."
   - Tool calls (if any)
5. ✅ Approve button is red (danger color)
6. ✅ User approves → workflow resumes → operation executes
7. ✅ User rejects → workflow cancelled → operation skipped

**Risk Assessment:**
- Keywords detected: `delete`
- Risk Level: `high`
- Approval Needed: `true`

---

## Risk Classification Logic

The workflow classifies messages based on keywords:

### High-Risk Keywords
- `delete`, `cancel`, `submit`, `approve`, `reject`, `remove`
- **Requires approval** with red warning alert

### Medium-Risk Keywords
- `create`, `update`, `modify`, `change`, `add`
- **Requires approval** with yellow caution alert

### Low-Risk (Default)
- All other operations (queries, reads, views)
- **No approval needed**

---

## Testing the Approval Flow

### Test 1: Approve Operation

1. Send a message: **"Create a new customer record"**
2. Approval dialog appears
3. Click **"Approve & Execute"**
4. Workflow resumes from checkpoint
5. Operation executes
6. Response displayed in chat

**API Calls:**
```
POST /developer/api/chat
  ↓
POST http://localhost:3001/developer-chat
  ↓ (interrupt event)
SSE: {type: 'interrupt', subtype: 'approval_request', ...}
  ↓ (user approves)
POST http://localhost:3001/developer-chat/resume
  ↓
SSE: {type: 'state_update', ...}
SSE: {type: 'complete', ...}
```

---

### Test 2: Reject Operation

1. Send a message: **"Delete customer XYZ789"**
2. Approval dialog appears (HIGH risk - red warning)
3. Click **"Cancel"**
4. Workflow ends at cancelled node
5. No operation executed
6. Message in chat: "Operation cancelled by user"

**API Calls:**
```
POST /developer/api/chat
  ↓
POST http://localhost:3001/developer-chat
  ↓ (interrupt event)
SSE: {type: 'interrupt', subtype: 'approval_request', ...}
  ↓ (user rejects)
POST http://localhost:3001/developer-chat/resume (approved: false)
  ↓
SSE: {type: 'state_update', data: {error: 'Operation cancelled'}}
SSE: {type: 'complete', ...}
```

---

## Testing State Persistence

### Test: Resume After Page Refresh

1. Send a high-risk message: **"Delete old inventory items"**
2. Approval dialog appears
3. **Refresh the page** before approving
4. Navigate back to the chat
5. The approval request should still be available (if using PostgreSQL checkpointer)

**Note:** State persistence requires PostgreSQL. With in-memory checkpointer, state is lost on page refresh.

---

## Debugging

### Check Backend Logs

**Agent Gateway logs:**
```bash
cd services/agent-gateway
npm run dev

# Watch for:
[Developer Chat] Starting workflow for chat: abc123
[Developer Chat] ⏸️  INTERRUPT - Waiting for approval on chat: abc123
[Developer Chat] Resuming workflow for chat: abc123 with approved=true
```

### Check Frontend Logs

**Browser DevTools → Console:**
```javascript
// SSE events received
[LangGraph] Event received: {type: 'interrupt', subtype: 'approval_request', ...}
[LangGraph] Showing approval dialog
[LangGraph] User approved: true
[LangGraph] Resuming workflow...
[LangGraph] Workflow complete
```

### Check Network Tab

**Browser DevTools → Network:**
1. `POST /developer/api/chat` → Status 200, SSE stream
2. SSE events: `interrupt`, `state_update`, `complete`, `end`
3. `POST /developer-chat/resume` → Status 200, SSE stream
4. More SSE events after resume

---

## Troubleshooting

### Issue: Approval Dialog Not Showing

**Cause:** `USE_LANGGRAPH_HITL` not enabled

**Fix:**
```bash
# frontend/coagent/.env.local
USE_LANGGRAPH_HITL=1
```

Restart frontend:
```bash
npm run dev
```

---

### Issue: "Gateway offline" Error

**Cause:** Agent Gateway not running

**Fix:**
```bash
cd services/agent-gateway
npm run dev
```

Verify gateway is running:
```bash
curl http://localhost:3001/health
```

---

### Issue: State Not Persisting

**Cause:** Using in-memory checkpointer (no PostgreSQL)

**Fix:**
```bash
# services/agent-gateway/.env
POSTGRES_URL=postgresql://user:password@localhost:5432/langgraph
```

Restart gateway:
```bash
npm run dev
```

---

## Success Criteria

- [ ] ✅ Low-risk operations execute without approval
- [ ] ✅ Medium-risk operations show approval dialog
- [ ] ✅ High-risk operations show approval dialog with warning
- [ ] ✅ Approval dialog displays correct risk level
- [ ] ✅ Approval dialog shows operation details
- [ ] ✅ Approval dialog shows tool calls (if any)
- [ ] ✅ Approve button executes operation
- [ ] ✅ Cancel button prevents operation
- [ ] ✅ SSE events stream correctly
- [ ] ✅ Workflow resumes after approval
- [ ] ✅ State persists (if using PostgreSQL)

---

## Next Steps

After successful testing:
1. Update README with HITL status
2. Document any issues found
3. Move to **Week 2**: Claude Agent SDK integration
4. Move to **Week 3**: Full CopilotKit integration

---

## Related Documentation

- **Week 1 Implementation:** [WEEK1_LANGGRAPH_HITL_IMPLEMENTATION.md](./WEEK1_LANGGRAPH_HITL_IMPLEMENTATION.md)
- **Best Practices:** [LANGGRAPH_BEST_PRACTICES.md](./LANGGRAPH_BEST_PRACTICES.md)
- **Gap Analysis:** [DEVELOPER_CHAT_BEST_PRACTICES_GAP.md](./DEVELOPER_CHAT_BEST_PRACTICES_GAP.md)
