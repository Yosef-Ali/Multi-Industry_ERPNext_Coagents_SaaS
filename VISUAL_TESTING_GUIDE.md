# 🎨 Visual Testing Guide - LangGraph HITL Approval Flow

## ✅ Current Setup

**Services Running:**
- ✅ Frontend: http://localhost:3001
- ✅ Agent Gateway: http://localhost:3002
- ✅ Feature Flag: `USE_LANGGRAPH_HITL=1`

---

## 🧪 Visual Testing Steps

### Step 1: Open Developer Chat

1. Open your browser to: **http://localhost:3001/developer**
2. You should see the developer chat interface with artifacts panel

### Step 2: Test Low-Risk (Auto-Approved) ✅

**Type this message:**
```
Show me the customer list
```

**Expected Behavior:**
- ✅ Message sends immediately
- ✅ No approval dialog appears
- ✅ Response shows operation completed
- ✅ Console shows: `[Developer Workflow] Low risk - auto-approved`

### Step 3: Test Medium-Risk (Yellow Warning) ⚠️

**Type this message:**
```
Create a new sales order for customer ABC
```

**Expected Behavior:**
1. ⚠️ **Approval Dialog Appears** with yellow border
2. Dialog shows:
   - Title: "Approval Required"
   - Risk Level: `MEDIUM` (yellow badge)
   - Operation: "Create a new sales order for customer ABC"
   - Question: "Do you want to proceed with this operation?"
3. Two buttons:
   - "Approve & Execute" (primary button)
   - "Cancel" (secondary button)

**Test Both Paths:**

**Path A - Approve:**
- Click "Approve & Execute"
- ✅ Dialog closes
- ✅ Message: "Operation completed: Create a new sales order..."

**Path B - Reject:**
- Click "Cancel"
- ❌ Dialog closes
- ❌ Message: "Operation cancelled by user"

### Step 4: Test High-Risk (Red Warning) 🚨

**Type this message:**
```
Delete all draft sales orders from last month
```

**Expected Behavior:**
1. 🚨 **Approval Dialog Appears** with red border
2. Dialog shows:
   - Title: "Approval Required"
   - Risk Level: `HIGH` (red badge)
   - Operation: "Delete all draft sales orders from last month"
   - Warning icon (AlertTriangle in red)
3. Same approve/reject buttons

**Test Both Paths:**

**Path A - Approve:**
- Click "Approve & Execute"
- ✅ Operation executes
- ✅ Shows success message

**Path B - Reject:**
- Click "Cancel"
- ❌ Shows cancellation message

---

## 🎯 Visual Checklist

Use this checklist while testing:

### Low-Risk Messages ✅
- [ ] "Show customer list" → Auto-approved, no dialog
- [ ] "Get sales report" → Auto-approved, no dialog
- [ ] "List all orders" → Auto-approved, no dialog

### Medium-Risk Messages ⚠️
- [ ] "Create new customer" → Yellow approval dialog
- [ ] "Update order status" → Yellow approval dialog
- [ ] "Add new item" → Yellow approval dialog
- [ ] "Modify customer details" → Yellow approval dialog

### High-Risk Messages 🚨
- [ ] "Delete customer records" → Red approval dialog
- [ ] "Cancel all pending orders" → Red approval dialog
- [ ] "Remove all items" → Red approval dialog
- [ ] "Reject payment request" → Red approval dialog

---

## 🔍 What to Look For

### Approval Dialog Visual Elements

**Layout:**
```
┌─────────────────────────────────────┐
│ ⚠️  Approval Required               │
├─────────────────────────────────────┤
│                                     │
│ Risk Level: [MEDIUM/HIGH]           │
│                                     │
│ Operation Details:                  │
│ "Your message here..."              │
│                                     │
│ Question:                           │
│ Do you want to proceed with this    │
│ operation?                          │
│                                     │
│ ┌─────────────┐  ┌──────────┐     │
│ │ Approve &   │  │  Cancel  │     │
│ │  Execute    │  │          │     │
│ └─────────────┘  └──────────┘     │
└─────────────────────────────────────┘
```

**Colors:**
- **Medium Risk:** Yellow/amber border and badge
- **High Risk:** Red border and badge
- **Icon:** AlertTriangle for high-risk, Shield for medium

**Behavior:**
- Dialog blocks UI (modal)
- Backdrop darkens background
- Clicking outside closes dialog (same as reject)
- Buttons have hover states

---

## 🐛 Debugging Tips

### If Dialog Doesn't Appear:

1. **Check Console Logs:**
```bash
# Backend logs
tail -f /tmp/gateway-dev-new.log | grep -E "INTERRUPT|Risk|Approval"

# Frontend logs (in browser DevTools)
# Look for: "Approval request received" or similar
```

2. **Verify Feature Flag:**
- Open browser DevTools → Console
- Check: `USE_LANGGRAPH_HITL` is enabled
- Frontend should show routing through LangGraph

3. **Check Network Tab:**
- DevTools → Network
- Filter: `developer-chat`
- Look for SSE events with type: `interrupt`

### Expected Network Events:

**When approval is needed:**
```json
// Event 1: State update
{"type":"state_update","data":{"chatId":"..."}}

// Event 2: Interrupt (THIS TRIGGERS DIALOG)
{
  "type":"interrupt",
  "subtype":"approval_request",
  "data":{
    "type":"approval_request",
    "question":"Do you want to proceed?",
    "riskLevel":"high",
    "operation":"Delete all..."
  }
}

// Event 3: End (wait for user)
{"type":"end","chatId":"..."}
```

**After approval:**
```bash
POST /developer-chat/resume
{
  "chatId": "...",
  "approved": true
}
```

---

## 📊 Testing Scenarios Matrix

| Message Type | Risk | Approval? | Dialog Color | Expected Outcome |
|-------------|------|-----------|--------------|------------------|
| "Show list" | Low | Auto | None | Executes immediately |
| "Create order" | Medium | Required | Yellow | Shows dialog |
| "Delete records" | High | Required | Red | Shows dialog |
| Approve action | - | - | - | Executes operation |
| Reject action | - | - | - | Shows cancellation |

---

## ✨ Success Criteria

### ✅ Test Passes If:

1. **Low-risk operations:**
   - No approval dialog appears
   - Operation executes immediately
   - Response shows success

2. **Medium/High-risk operations:**
   - Approval dialog appears
   - Correct risk level shown (yellow/red)
   - Dialog shows operation details
   - Both approve/reject work correctly

3. **Visual consistency:**
   - Dialog matches design mockup
   - Colors match risk levels
   - Buttons are responsive
   - No console errors

4. **User experience:**
   - Dialog appears quickly (< 500ms)
   - Approve/reject respond immediately
   - No UI freezing or lag
   - Clear feedback on actions

---

## 🎬 Video Testing Checklist

If recording a demo:

1. Start with low-risk → show auto-approval
2. Then medium-risk → show yellow dialog
3. Approve the medium-risk operation
4. Then high-risk → show red dialog
5. Reject the high-risk operation
6. Show another high-risk → approve it this time

This demonstrates the complete flow!

---

## 🚀 Ready to Test!

Open: **http://localhost:3001/developer**

Start with: `"Show me the customer list"` ✅
Then try: `"Create a new sales order"` ⚠️
Finally: `"Delete all customer data"` 🚨

**Have fun testing!** 🎉
