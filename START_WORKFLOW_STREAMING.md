# 🚀 Quick Start - Workflow Streaming

> **5-minute guide to get workflow streaming working**

---

## ✅ What's Been Done

All code is **production-ready** and **tested**:
- ✅ Gateway proxy with SSE streaming
- ✅ CopilotKit integration with real-time events
- ✅ Error boundaries + reconnection logic
- ✅ Environment configuration
- ✅ Test scripts + documentation

---

## 🎯 Start in 3 Steps

### Step 1: Configure Local Environment (1 min)

```bash
# Gateway configuration
cd services/agent-gateway
cp .dev.vars.example .dev.vars

# Edit .dev.vars and set:
# WORKFLOW_SERVICE_URL=http://localhost:8000

# Frontend already configured in .env.local:
# NEXT_PUBLIC_GATEWAY_URL=http://localhost:3000
```

---

### Step 2: Start All Services (2 min)

Open **3 terminal windows**:

#### Terminal 1: Workflow Service
```bash
cd services/workflows
poetry install
poetry run uvicorn src.main:app --reload --port 8000
```

**Wait for:** `Application startup complete`

#### Terminal 2: Agent Gateway
```bash
cd services/agent-gateway
pnpm install
pnpm run dev
```

**Wait for:** `⎔ Listening on http://localhost:3000`

#### Terminal 3: Frontend
```bash
cd frontend/coagent
pnpm install
pnpm run dev
```

**Wait for:** `▲ Local: http://localhost:3001`

---

### Step 3: Test It! (2 min)

#### Option A: Automated Test
```bash
# In a new terminal
./test-workflow-streaming.sh
```

**Expected:**
```
✓ Gateway healthy
✓ Workflow service healthy
✓ SSE streaming working
✓ NEXT_PUBLIC_GATEWAY_URL configured
✓ Gateway .dev.vars configured
```

#### Option B: Manual Browser Test
1. **Open** http://localhost:3001
2. **Open DevTools** (F12) → Console tab
3. **Click** CopilotKit sidebar icon (chat bubble)
4. **Type:** "Create a hotel reservation for John Doe"
5. **Watch:**
   - Console: `[Copilot] workflow event: workflow_initialized`
   - UI: WorkflowStreamPanel appears with real-time events
   - Panel shows: "Streaming..." with live updates

---

## 🧪 Quick Verification

### Test 1: Services Health
```bash
# Gateway
curl http://localhost:3000/health | jq

# Workflow Service
curl http://localhost:8000/health | jq
```

### Test 2: SSE Streaming
```bash
curl -N -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d '{
    "graph_name": "hotel_o2c",
    "initial_state": {
      "prompt": "Test",
      "app_context": {"appType": "hotel"}
    }
  }' \
  http://localhost:3000/agui
```

**Expected:** SSE events streaming (Ctrl+C to stop)

---

## 🎬 See It In Action

### What You'll See:

1. **CopilotKit Sidebar**
   - WorkflowStreamPanel appears above chat
   - Shows "Streaming..." indicator

2. **Real-Time Events**
   ```
   workflow_initialized
   {"workflowId":"...","graph":"hotel_o2c"}

   step_started
   {"step":"reservation_create"}

   workflow_complete
   {"status":"success"}
   ```

3. **Console Logs**
   ```
   [Copilot] workflow stream started
   [Copilot] workflow event: workflow_initialized
   [Copilot] workflow event: step_started
   [Copilot] workflow event: workflow_complete
   ```

---

## 🐛 Troubleshooting

### Services Not Starting?

**Gateway port conflict:**
```bash
# Kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or use different port in .dev.vars
PORT=3002
```

**Workflow service issues:**
```bash
# Check Python/Poetry installed
python --version  # Should be 3.11+
poetry --version

# Reinstall dependencies
cd services/workflows
poetry install --no-cache
```

**Frontend issues:**
```bash
# Clear cache and reinstall
cd frontend/coagent
rm -rf .next node_modules
pnpm install
pnpm run dev
```

---

### Test Script Fails?

**"Gateway not accessible":**
- Check gateway is running: `curl http://localhost:3000/health`
- Check .dev.vars has WORKFLOW_SERVICE_URL

**"No SSE events":**
- Check workflow service: `curl http://localhost:8000/health`
- Check gateway logs for errors

**"NEXT_PUBLIC_GATEWAY_URL not set":**
- Check frontend/.env.local has the variable
- Restart Next.js dev server

---

## 🚀 Production Deployment

Once local works, deploy to production:

### 1. Deploy Workflow Service (Already on Render)
```bash
# Already deployed: https://erpnext-workflows.onrender.com
```

### 2. Deploy Gateway to Cloudflare
```bash
cd services/agent-gateway

# Set production secret
pnpm dlx wrangler secret put WORKFLOW_SERVICE_URL
# Enter: https://erpnext-workflows.onrender.com

# Deploy
pnpm run deploy

# Get URL
pnpm dlx wrangler deployments list
# Copy your Worker URL
```

### 3. Deploy Frontend
```bash
cd frontend/coagent

# Set gateway URL
vercel env add NEXT_PUBLIC_GATEWAY_URL production
# Enter: https://multi-industry-coagents-gateway.YOUR_ACCOUNT.workers.dev

# Deploy
vercel --prod
```

### 4. Test Production
```bash
# Test gateway
curl https://YOUR_GATEWAY_URL/health

# Test streaming
curl -N -H "Accept: text/event-stream" \
  -H "Content-Type: application/json" \
  -d '{"graph_name":"hotel_o2c","initial_state":{"prompt":"test"}}' \
  https://YOUR_GATEWAY_URL/agui
```

---

## 📚 Full Documentation

- **Testing Guide:** [WORKFLOW_STREAMING_TEST.md](./WORKFLOW_STREAMING_TEST.md)
- **Deployment Guide:** [WORKFLOW_STREAMING_DEPLOYMENT.md](./WORKFLOW_STREAMING_DEPLOYMENT.md)
- **System Overview:** [WORKFLOW_STREAMING_READY.md](./WORKFLOW_STREAMING_READY.md)

---

## ✨ Success Checklist

- [ ] All 3 services running locally
- [ ] Automated test passes: `./test-workflow-streaming.sh`
- [ ] Browser shows WorkflowStreamPanel
- [ ] Console shows workflow events
- [ ] No errors in any console/terminal
- [ ] SSE curl test returns events

**When all checked → You're ready to deploy! 🎉**

---

**Estimated Time:** 5-10 minutes
**Difficulty:** Easy (all code ready, just start services)
**Support:** See troubleshooting section above

---

*Let's see it in action! 🚀*
