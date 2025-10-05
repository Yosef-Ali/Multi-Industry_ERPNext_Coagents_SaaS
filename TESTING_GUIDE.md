# 🧪 Testing Guide - Current Status

**Updated**: 2025-10-02

---

## ✅ What's Working Now

### 1. Agent Gateway (Basic)
**URL**: https://erpnext-agent-gateway.dev-yosefali.workers.dev/

**Working Endpoints**:

#### Root Endpoint
```bash
curl https://erpnext-agent-gateway.dev-yosefali.workers.dev/
```
**Response**:
```json
{
  "service": "ERPNext Coagents - Agent Gateway",
  "version": "1.0.0",
  "status": "running",
  "endpoints": {
    "health": "GET /health",
    "agui": "POST /agui (coming soon)"
  }
}
```

#### Health Check
```bash
curl https://erpnext-agent-gateway.dev-yosefali.workers.dev/health
```
**Response**:
```json
{
  "status": "healthy",
  "timestamp": "2025-10-02T09:48:36.801Z",
  "service": "erpnext-agent-gateway",
  "version": "1.0.0",
  "environment": "production",
  "openrouter": {
    "configured": true,
    "model": "zhipu/glm-4-9b-chat"
  },
  "workflow_service": "https://erpnext-workflows.onrender.com",
  "mock_mode": false
}
```
✅ Shows OpenRouter is configured correctly!

#### AG-UI Endpoint (Placeholder)
```bash
curl -X POST https://erpnext-agent-gateway.dev-yosefali.workers.dev/agui \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello"}'
```
**Response**:
```json
{
  "message": "AG-UI endpoint (Workers version)",
  "received": {"message": "Hello"},
  "note": "Full implementation coming soon"
}
```
⚠️ This is just a placeholder - not connected to the AI agent yet.

### 2. Frontend
**URL**: https://9e368f40.erpnext-coagent-ui.pages.dev/

✅ **Status**: Loads successfully
✅ **Connected to**: Agent gateway URL is configured
⚠️ **Issue**: Gateway `/agui` endpoint doesn't have AI integration yet

---

## ⚠️ Current Limitation

### The Issue
The **worker.ts** (Cloudflare Workers entry point) is a minimal placeholder. It doesn't include:
- Anthropic SDK integration
- Tool execution
- Streaming responses
- Agent conversation loop

### Why?
The full agent code in **src/agent.ts** uses:
- Express.js (doesn't work in Workers)
- Node.js-specific APIs (crypto, streams)
- Complex dependencies (body-parser, iconv-lite, etc.)

Cloudflare Workers has a different runtime and doesn't support these.

---

## 🎯 Two Options to Fix

### Option A: Keep Using Cloudflare Workers (Requires Refactoring)

**Pros**:
- $0/month cost
- Global edge network
- Fast deployment

**Cons**:
- Needs significant code refactoring
- Replace Express with Workers fetch API
- Adapt all Node.js APIs to Workers runtime

**Work Required**:
1. Rewrite `src/agent.ts` for Workers runtime
2. Replace Express routes with fetch handlers
3. Adapt SSE streaming for Workers
4. Test Anthropic SDK in Workers environment
5. Handle tool execution in Workers context

**Estimated Time**: 4-6 hours

### Option B: Deploy to Render/Railway (Node.js Server)

**Pros**:
- Existing code works as-is
- Full Node.js support
- Express.js works perfectly

**Cons**:
- Render free tier: 750 hours/month (enough for testing)
- Railway: ~$5/month

**Work Required**:
1. Create `render.yaml` in `services/agent-gateway`
2. Deploy to Render
3. Update frontend to use Render URL

**Estimated Time**: 30 minutes

---

## 📊 Recommendation

### For Testing/MVP: **Option B** (Render)
- Fastest path to working system
- Still free tier compatible
- Can always migrate to Workers later

### For Production: **Option A** (Workers) or Hybrid
- Cloudflare Workers for static gateway
- Render for Python workflows
- ERPNext for data

---

## 🚀 Quick Deploy to Render (Recommended Next Step)

### 1. Create render.yaml
```yaml
# services/agent-gateway/render.yaml
services:
  - type: web
    name: erpnext-agent-gateway
    env: node
    region: oregon
    plan: free
    buildCommand: npm install && npm run build
    startCommand: npm start
    envVars:
      - key: NODE_ENV
        value: production
      - key: OPENROUTER_API_KEY
        sync: false
      - key: OPENROUTER_MODEL
        value: zhipu/glm-4-9b-chat
      - key: OPENROUTER_BASE_URL
        value: https://openrouter.ai/api/v1
      - key: WORKFLOW_SERVICE_URL
        value: https://erpnext-workflows.onrender.com
      - key: USE_MOCK_ERPNEXT
        value: "true"
```

### 2. Deploy via Render Dashboard
1. Go to: https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Select directory: `services/agent-gateway`
5. Render auto-detects settings
6. Add environment variable: `OPENROUTER_API_KEY` (your key)
7. Click "Create Web Service"
8. Wait 3-5 minutes

### 3. Update Frontend
```bash
cd frontend/coagent

# Update environment
cat > .env.production << EOF
VITE_GATEWAY_URL=https://your-render-url.onrender.com
EOF

# Rebuild and redeploy
npx vite build
npx wrangler@latest pages deploy dist --project-name=erpnext-coagent-ui --commit-dirty=true
```

---

## 📝 Summary

### What Works ✅
- Cloudflare Workers deployed
- Frontend deployed
- OpenRouter configured
- D1 database ready
- KV storage ready

### What Needs Work ⚠️
- `/agui` endpoint needs full agent integration
- Choose deployment strategy (Workers refactor vs Render)

### Recommended Next Step 🎯
**Deploy agent gateway to Render** for quickest path to working system.

Then you can:
- Test full AI conversations
- Test workflow execution
- Test approval gates
- Demonstrate the complete platform

Later, you can refactor for Workers if needed.

---

**Current Status**: Infrastructure deployed, agent logic pending integration.
