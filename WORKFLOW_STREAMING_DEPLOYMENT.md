# Workflow Streaming - Deployment Guide

> Complete guide for deploying the CopilotKit + AG-UI streaming integration

## Architecture Overview

```
Frontend (Next.js)
    ↓ NEXT_PUBLIC_GATEWAY_URL
Gateway (Cloudflare Worker)
    ↓ WORKFLOW_SERVICE_URL
Workflow Service (Python/LangGraph)
    ↓ SSE Streaming
Frontend WorkflowStreamPanel
```

---

## Prerequisites

### 1. Services Deployed
- ✅ **Workflow Service** on Render: https://erpnext-workflows.onrender.com
- ✅ **Agent Gateway** on Cloudflare Workers
- ✅ **Frontend** on Vercel/Cloudflare Pages

### 2. Required Secrets
- `WORKFLOW_SERVICE_URL` (Gateway → Workflow Service)
- `NEXT_PUBLIC_GATEWAY_URL` (Frontend → Gateway)

---

## Deployment Steps

### Step 1: Configure Workflow Service URL in Gateway

#### Option A: Cloudflare Workers (Production)
```bash
cd services/agent-gateway

# Set as secret
pnpm dlx wrangler secret put WORKFLOW_SERVICE_URL
# When prompted, enter: https://erpnext-workflows.onrender.com

# Verify
pnpm dlx wrangler secret list
```

#### Option B: Local Development
```bash
cd services/agent-gateway

# Copy example
cp .dev.vars.example .dev.vars

# Edit .dev.vars
WORKFLOW_SERVICE_URL=http://localhost:8000
```

---

### Step 2: Deploy Gateway

```bash
cd services/agent-gateway

# Build and deploy
pnpm run deploy

# Get your Worker URL
pnpm dlx wrangler deployments list

# Test deployment
curl https://multi-industry-coagents-gateway.YOUR_ACCOUNT.workers.dev/health
```

**Expected Response:**
```json
{
  "status": "healthy",
  "workflow_service": "https://erpnext-workflows.onrender.com",
  "service": "multi-industry-coagents-gateway"
}
```

---

### Step 3: Configure Frontend Gateway URL

#### For Vercel Deployment
```bash
cd frontend/coagent

# Set environment variable
vercel env add NEXT_PUBLIC_GATEWAY_URL production
# Enter: https://multi-industry-coagents-gateway.YOUR_ACCOUNT.workers.dev

# Redeploy
vercel --prod
```

#### For Cloudflare Pages
```bash
cd frontend/coagent

# Add to wrangler.toml or dashboard
# Environment Variables → Production
NEXT_PUBLIC_GATEWAY_URL=https://multi-industry-coagents-gateway.YOUR_ACCOUNT.workers.dev

# Deploy
npx wrangler pages deploy dist --project-name=erpnext-coagent-ui
```

#### For Local Testing
```bash
# Add to .env.local
echo "NEXT_PUBLIC_GATEWAY_URL=https://multi-industry-coagents-gateway.YOUR_ACCOUNT.workers.dev" >> frontend/coagent/.env.local

# Or for local gateway
echo "NEXT_PUBLIC_GATEWAY_URL=http://localhost:3000" >> frontend/coagent/.env.local
```

---

### Step 4: Verify End-to-End Flow

#### Test 1: Gateway → Workflow Service
```bash
curl -N -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "graph_name": "hotel_o2c",
    "initial_state": {
      "prompt": "Test deployment",
      "app_context": {"appType": "hotel", "currentPage": "test"}
    }
  }' \
  https://multi-industry-coagents-gateway.YOUR_ACCOUNT.workers.dev/agui
```

**Expected:** SSE events streaming back

#### Test 2: Frontend Integration
1. Open your deployed frontend
2. Open browser DevTools (F12)
3. Open CopilotKit sidebar
4. Send message: "Create a hotel reservation"
5. Check console for:
   ```
   [Copilot] workflow stream started
   [Copilot] workflow event: workflow_initialized
   ```
6. Verify WorkflowStreamPanel appears in UI

---

## Environment Variables Reference

### Gateway (Cloudflare Worker)
| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `WORKFLOW_SERVICE_URL` | ✅ Yes | `https://erpnext-workflows.onrender.com` | Workflow service URL for SSE streaming |
| `OPENROUTER_API_KEY` | Optional | `sk-or-...` | OpenRouter API key |
| `ANTHROPIC_API_KEY` | Optional | `sk-ant-...` | Anthropic API key |

### Frontend (Next.js)
| Variable | Required | Example | Description |
|----------|----------|---------|-------------|
| `NEXT_PUBLIC_GATEWAY_URL` | ✅ Yes | `https://...workers.dev` | Gateway URL for /agui requests |
| `NEXT_PUBLIC_COPILOT_API_KEY` | Optional | `ck_...` | CopilotKit public API key |

---

## Configuration Files Updated

### ✅ Files Modified
1. **`services/agent-gateway/wrangler.toml`**
   - Added WORKFLOW_SERVICE_URL documentation
   - Added .dev.vars instructions

2. **`services/agent-gateway/.dev.vars.example`**
   - Template for local development secrets

3. **`services/agent-gateway/src/worker.ts`**
   - Fixed heartbeat timer types
   - Removed `as any` casts

4. **`frontend/coagent/.env.local`**
   - Added NEXT_PUBLIC_GATEWAY_URL

5. **`frontend/coagent/.env.example`**
   - Documented NEXT_PUBLIC_GATEWAY_URL

6. **`frontend/coagent/hooks/use-erpnext-copilot.ts`**
   - Added reconnection logic (3 retries)
   - Added exponential backoff

7. **`frontend/coagent/components/workflow-stream-panel.tsx`**
   - Added ErrorBoundary
   - Filtered heartbeat events

---

## Troubleshooting

### Issue: "WORKFLOW_SERVICE_URL is not configured"

**Symptom:** Gateway /health shows `"workflow_service": "not-set"`

**Fix:**
```bash
cd services/agent-gateway
pnpm dlx wrangler secret put WORKFLOW_SERVICE_URL
# Enter: https://erpnext-workflows.onrender.com

# Redeploy
pnpm run deploy
```

---

### Issue: Frontend uses fallback /api/ag-ui

**Symptom:** Browser shows requests to `/api/ag-ui` instead of gateway

**Fix:**
```bash
# Verify env var is set
vercel env ls

# If missing, add it
vercel env add NEXT_PUBLIC_GATEWAY_URL production

# Redeploy
vercel --prod
```

---

### Issue: CORS errors in browser

**Symptom:** Browser console shows CORS errors

**Fix:** Gateway already includes CORS headers. Check:
1. Gateway is deployed: `curl https://...workers.dev/health`
2. Frontend env var is correct: Check browser Network tab
3. No proxy/VPN interfering with requests

---

### Issue: SSE stream disconnects

**Symptom:** Events stop after 30-60 seconds

**Fix:** Already implemented:
- ✅ Heartbeat every 30s in worker.ts
- ✅ Reconnection logic with 3 retries
- ✅ Exponential backoff

**Check:**
1. Cloudflare Worker logs for timeout errors
2. Workflow service logs for connection issues
3. Network tab for disconnection reason

---

## Production Checklist

Before going live, verify:

- [ ] Gateway deployed to Cloudflare
- [ ] `WORKFLOW_SERVICE_URL` secret set
- [ ] Gateway /health returns correct workflow_service URL
- [ ] Frontend deployed with `NEXT_PUBLIC_GATEWAY_URL`
- [ ] Manual SSE test succeeds (curl test)
- [ ] Browser test shows WorkflowStreamPanel
- [ ] No errors in browser console
- [ ] No errors in Cloudflare Workers logs
- [ ] Workflow service accessible from gateway

---

## Monitoring & Logs

### Cloudflare Workers Logs
```bash
# Live tail
pnpm dlx wrangler tail

# View in dashboard
https://dash.cloudflare.com → Workers → multi-industry-coagents-gateway → Logs
```

### Workflow Service Logs (Render)
```bash
# Dashboard
https://dashboard.render.com → erpnext-workflows → Logs
```

### Frontend Logs (Vercel)
```bash
# Dashboard
https://vercel.com → erpnext-coagent-ui → Deployments → View Logs
```

---

## Performance Optimization

### Cloudflare Workers
- ✅ Heartbeat interval: 30s (prevents timeout)
- ✅ Stream piping: Direct passthrough (no buffering)
- ✅ Error handling: Graceful failures with retries

### Frontend
- ✅ Event limit: 20 recent events (memory efficient)
- ✅ Error boundary: Prevents UI crashes
- ✅ Reconnection: 3 retries with backoff

---

## Next Steps

1. **Custom Workflows**
   - Add new graphs in `services/workflows/src/`
   - Update graph mapping in `use-erpnext-copilot.ts`

2. **Enhanced UI**
   - Render artifacts in WorkflowStreamPanel
   - Add approval/rejection buttons
   - Domain-specific event displays

3. **Monitoring**
   - Set up alerts for stream failures
   - Track retry rates
   - Monitor latency metrics

---

## Support

**Issues?**
1. Run test script: `./test-workflow-streaming.sh`
2. Check deployment docs: `WORKFLOW_STREAMING_TEST.md`
3. Review architecture: `specs/001-erpnext-coagents-mvp/plan.md`

**Success Indicators:**
- ✅ Gateway health check passes
- ✅ SSE events visible in curl test
- ✅ WorkflowStreamPanel shows in UI
- ✅ No 404/500 errors in console

---

**Last Updated:** 2025-10-04
**Version:** 1.0.0
**Status:** Production Ready ✅
