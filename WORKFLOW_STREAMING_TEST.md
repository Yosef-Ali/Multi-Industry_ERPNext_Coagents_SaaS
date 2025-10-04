# Workflow Streaming - Testing Guide

## Quick Start Testing

### Prerequisites
1. **Workflow Service Running**: `http://localhost:8000`
2. **Gateway Running**: `http://localhost:3000`
3. **Frontend Running**: `http://localhost:3001`

---

## Automated Testing

### Run Full Test Suite
```bash
./test-workflow-streaming.sh
```

This will verify:
- ✅ Gateway health and configuration
- ✅ Workflow service connectivity
- ✅ SSE streaming functionality
- ✅ Frontend environment setup
- ✅ Gateway local configuration

---

## Manual Testing

### 1. Test Gateway Health
```bash
curl http://localhost:3000/health | jq
```

**Expected Response:**
```json
{
  "status": "healthy",
  "workflow_service": "http://localhost:8000",
  "service": "multi-industry-coagents-gateway"
}
```

⚠️ If `workflow_service` is `"not-set"`, fix configuration:
```bash
# Add to services/agent-gateway/.dev.vars
echo "WORKFLOW_SERVICE_URL=http://localhost:8000" >> services/agent-gateway/.dev.vars
```

---

### 2. Test Workflow Service
```bash
curl http://localhost:8000/health | jq
```

**Expected Response:**
```json
{
  "status": "healthy",
  "service": "erpnext-workflows"
}
```

---

### 3. Test SSE Streaming (Manual)
```bash
curl -N -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "graph_name": "hotel_o2c",
    "initial_state": {
      "prompt": "Create a test reservation",
      "app_context": {
        "appType": "hotel",
        "currentPage": "reservations"
      }
    }
  }' \
  http://localhost:3000/agui
```

**Expected Output (SSE format):**
```
event: workflow_initialized
data: {"workflowId":"...","graph":"hotel_o2c"}

event: step_started
data: {"step":"check_in"}

event: workflow_complete
data: {"status":"success"}
```

**Press Ctrl+C to stop streaming**

---

### 4. Test Frontend Integration

#### A. Check Environment
```bash
cat frontend/coagent/.env.local | grep GATEWAY
```

**Should show:**
```
NEXT_PUBLIC_GATEWAY_URL=http://localhost:3000
```

#### B. Browser Testing

1. **Open Frontend**: http://localhost:3001
2. **Open Browser DevTools** (F12)
3. **Open CopilotKit Sidebar** (click chat icon)
4. **Send Test Message**:
   ```
   Create a hotel reservation for John Doe
   ```
5. **Check Console** for:
   ```
   [Copilot] workflow stream started
   [Copilot] workflow event: workflow_initialized
   [Copilot] workflow event: step_started
   ```
6. **Check UI** for:
   - WorkflowStreamPanel visible above chat
   - Events appearing in real-time
   - "Streaming..." indicator active

---

## Troubleshooting

### Issue: "WORKFLOW_SERVICE_URL not configured"

**Fix:**
```bash
# For local development
cd services/agent-gateway
cp .dev.vars.example .dev.vars
# Edit .dev.vars and set WORKFLOW_SERVICE_URL=http://localhost:8000

# For Cloudflare production
pnpm dlx wrangler secret put WORKFLOW_SERVICE_URL
# Enter: https://erpnext-workflows.onrender.com
```

---

### Issue: "No SSE events received"

**Check:**
1. Workflow service is running: `curl http://localhost:8000/health`
2. Gateway can reach workflow service:
   ```bash
   curl -v http://localhost:3000/agui \
     -H "Content-Type: application/json" \
     -d '{"graph_name":"hotel_o2c","initial_state":{}}'
   ```
3. Check gateway logs for errors

---

### Issue: "Frontend uses /api/ag-ui instead of gateway"

**Fix:**
```bash
# Add to frontend/coagent/.env.local
echo "NEXT_PUBLIC_GATEWAY_URL=http://localhost:3000" >> frontend/coagent/.env.local

# Restart Next.js dev server
cd frontend/coagent
pnpm run dev
```

---

### Issue: "Connection refused" errors

**Check all services are running:**
```bash
# Check gateway
curl http://localhost:3000/health

# Check workflow service
curl http://localhost:8000/health

# Check frontend
curl http://localhost:3001
```

**Start missing services:**
```bash
# Gateway
cd services/agent-gateway && pnpm run dev

# Workflow Service
cd services/workflows && poetry run uvicorn src.main:app --reload

# Frontend
cd frontend/coagent && pnpm run dev
```

---

## Production Testing

### 1. Set Production URLs
```bash
# Frontend .env.production
NEXT_PUBLIC_GATEWAY_URL=https://multi-industry-coagents-gateway.your-account.workers.dev

# Gateway (Cloudflare Secret)
pnpm dlx wrangler secret put WORKFLOW_SERVICE_URL
# Enter: https://erpnext-workflows.onrender.com
```

### 2. Deploy & Test
```bash
# Deploy gateway
cd services/agent-gateway
pnpm run deploy

# Test production gateway
curl https://multi-industry-coagents-gateway.your-account.workers.dev/health | jq

# Test production streaming
curl -N -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{"graph_name":"hotel_o2c","initial_state":{"prompt":"test"}}' \
  https://multi-industry-coagents-gateway.your-account.workers.dev/agui
```

---

## Event Types Reference

| Event Name | Description | Payload Example |
|------------|-------------|-----------------|
| `workflow_initialized` | Workflow started | `{"workflowId":"...","graph":"hotel_o2c"}` |
| `workflow_reconnecting` | Retry attempt | `{"attempt":1,"maxRetries":3}` |
| `step_started` | Node execution began | `{"step":"check_in"}` |
| `step_completed` | Node finished | `{"step":"check_in","result":{...}}` |
| `approval_required` | Human-in-loop gate | `{"stepId":"...","message":"Approve?"}` |
| `workflow_complete` | Workflow finished | `{"status":"success"}` |
| `workflow_error` | Error occurred | `{"message":"...","retries":3}` |
| `workflow_aborted` | User cancelled | `{"workflowId":"..."}` |

---

## Success Criteria

✅ **All tests pass** when:
1. Gateway health shows correct `workflow_service` URL
2. SSE streaming returns event data (not errors)
3. Frontend console shows workflow events
4. WorkflowStreamPanel displays in UI
5. No CORS or network errors in browser console

---

## Next Steps After Testing

1. **Monitor production logs**
   - Check Cloudflare Workers logs
   - Check Render workflow service logs

2. **Add custom workflows**
   - Create new graph in `services/workflows/src/`
   - Update mapping in `use-erpnext-copilot.ts:72-81`

3. **Extend UI**
   - Add artifact rendering in WorkflowStreamPanel
   - Create domain-specific event displays
   - Add approval/rejection UI components

---

**Happy Testing! 🚀**
