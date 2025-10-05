# Workflow Service Deployment to Cloudflare Workers

**Service**: Python LangGraph Workflow Service
**Platform**: Cloudflare Workers (Python support)
**CLI**: Wrangler v4.40.3+
**Location**: `services/workflows/`

---

## 🎯 Overview

The workflow service is a FastAPI-based Python application that executes LangGraph workflows. Since Cloudflare Workers has **experimental Python support**, we have two deployment options:

### Option 1: Deploy Python Service to External Platform (Recommended)
Deploy the Python workflow service to a platform with full Python support, then connect it to the Cloudflare Workers agent gateway.

**Recommended Platforms**:
- **Render** (easiest, free tier)
- **Railway** (simple, great DX)
- **Fly.io** (global edge deployment)
- **Heroku** (classic, reliable)

### Option 2: Cloudflare Workers Python (Experimental)
Use Cloudflare's experimental Python Workers support (limited to specific Python packages).

---

## 🚀 Option 1: Deploy to Render (Recommended)

Render provides free Python hosting perfect for this service.

### Step 1: Prepare for Deployment

```bash
cd services/workflows
```

### Step 2: Create `render.yaml`

Already included in the repository:

```yaml
services:
  - type: web
    name: erpnext-workflows
    env: python
    plan: free
    buildCommand: pip install -r requirements.txt
    startCommand: uvicorn src.server:app --host 0.0.0.0 --port $PORT
    healthCheckPath: /
    envVars:
      - key: PYTHON_VERSION
        value: 3.11
      - key: ANTHROPIC_API_KEY
        sync: false
```

### Step 3: Deploy to Render

**Option A: Via Web Dashboard**

1. Go to https://dashboard.render.com
2. Click "New +" → "Web Service"
3. Connect your GitHub repository
4. Select `services/workflows` directory
5. Render auto-detects `render.yaml`
6. Click "Create Web Service"

**Option B: Via Render CLI**

```bash
# Install Render CLI
brew install render  # or: npm install -g @render/cli

# Login
render login

# Deploy
render deploy
```

### Step 4: Set Environment Variables

In Render dashboard:
1. Go to your service → Environment
2. Add:
   ```
   ANTHROPIC_API_KEY=sk-ant-...
   ```

### Step 5: Get Service URL

After deployment, Render provides a URL like:
```
https://erpnext-workflows.onrender.com
```

### Step 6: Update Agent Gateway

Update the agent gateway environment variable:

```bash
cd services/agent-gateway

# Update wrangler.toml or set secret
pnpm dlx wrangler secret put WORKFLOW_SERVICE_URL
# Enter: https://erpnext-workflows.onrender.com
```

---

## 🚀 Option 2: Deploy to Railway

Railway offers simple deployment with great developer experience.

### Step 1: Install Railway CLI

```bash
# Install
npm install -g @railway/cli

# Login
railway login
```

### Step 2: Initialize Project

```bash
cd services/workflows

# Create new project
railway init
```

### Step 3: Deploy

```bash
# Deploy
railway up

# Set environment variables
railway variables set ANTHROPIC_API_KEY=sk-ant-...

# Get deployment URL
railway domain
```

### Step 4: Update Agent Gateway

```bash
cd services/agent-gateway
pnpm dlx wrangler secret put WORKFLOW_SERVICE_URL
# Enter Railway URL
```

---

## 🚀 Option 3: Deploy to Fly.io

Fly.io provides edge deployment similar to Cloudflare.

### Step 1: Install Fly CLI

```bash
# Install
curl -L https://fly.io/install.sh | sh

# Login
flyctl auth login
```

### Step 2: Create `fly.toml`

```toml
app = "erpnext-workflows"

[build]
  builder = "paketobuildpacks/builder:base"

[env]
  PORT = "8001"

[http_service]
  internal_port = 8001
  force_https = true
  auto_stop_machines = true
  auto_start_machines = true
  min_machines_running = 0

[[services]]
  protocol = "tcp"
  internal_port = 8001

  [[services.ports]]
    port = 80
    handlers = ["http"]

  [[services.ports]]
    port = 443
    handlers = ["tls", "http"]

  [services.concurrency]
    type = "connections"
    hard_limit = 25
    soft_limit = 20
```

### Step 3: Deploy

```bash
cd services/workflows

# Launch app
flyctl launch

# Set secrets
flyctl secrets set ANTHROPIC_API_KEY=sk-ant-...

# Deploy
flyctl deploy

# Get URL
flyctl info
```

---

## 🧪 Testing Deployed Service

Once deployed, test the service:

```bash
# Health check
curl https://your-service-url.com/

# List workflows
curl https://your-service-url.com/workflows

# Test workflow execution
curl -X POST https://your-service-url.com/execute \
  -H "Content-Type: application/json" \
  -d '{
    "graph_name": "hotel_o2c",
    "initial_state": {
      "reservation_id": "RES-001",
      "guest_name": "John Doe",
      "room_number": "101",
      "check_in_date": "2025-10-01",
      "check_out_date": "2025-10-02",
      "folio_id": null,
      "invoice_id": null,
      "current_step": "start",
      "steps_completed": [],
      "errors": [],
      "pending_approval": false,
      "approval_decision": null
    },
    "stream": false
  }'
```

Expected response:
```json
{
  "thread_id": "abc-123",
  "status": "paused",
  "interrupt_data": {
    "operation": "check_in_guest",
    ...
  }
}
```

---

## 🔄 Complete Deployment Flow

### 1. Deploy Workflow Service (Python)

```bash
# Choose your platform:

# Render:
render deploy

# Railway:
railway up

# Fly.io:
flyctl deploy
```

### 2. Get Service URL

```bash
# Render: https://erpnext-workflows.onrender.com
# Railway: https://erpnext-workflows.up.railway.app
# Fly.io: https://erpnext-workflows.fly.dev
```

### 3. Deploy Agent Gateway (Cloudflare Workers)

```bash
cd services/agent-gateway

# Set workflow service URL
pnpm dlx wrangler secret put WORKFLOW_SERVICE_URL
# Enter your Python service URL

# Set Anthropic API key
pnpm dlx wrangler secret put ANTHROPIC_API_KEY

# Deploy
pnpm dlx wrangler deploy
```

### 4. Deploy Frontend (Cloudflare Pages)

```bash
cd frontend/coagent

# Update environment variable
# VITE_GATEWAY_URL=https://erpnext-agent-gateway.workers.dev

# Build
npm run build

# Deploy
pnpm dlx wrangler pages deploy dist
```

### 5. Test End-to-End

```bash
curl -X POST https://erpnext-agent-gateway.workers.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "Check in guest John Doe for room 101"
  }'
```

---

## 📊 Platform Comparison

| Platform | Free Tier | Python Support | Edge Network | Setup Complexity |
|----------|-----------|----------------|--------------|------------------|
| **Render** | ✅ 750 hrs/month | ✅ Full | ❌ No | ⭐ Easy |
| **Railway** | ✅ $5 credit/month | ✅ Full | ❌ No | ⭐⭐ Easy |
| **Fly.io** | ✅ 3 VMs | ✅ Full | ✅ Global | ⭐⭐⭐ Medium |
| **Cloudflare** | ✅ 100k req/day | ⚠️ Experimental | ✅ Global | ⭐⭐⭐⭐ Hard |

**Recommendation**: Start with Render for simplicity, migrate to Fly.io for global edge deployment later.

---

## 🔐 Environment Variables

Set these in your chosen platform:

### Required
- `ANTHROPIC_API_KEY` - Claude API key

### Optional
- `ERPNEXT_API_KEY` - ERPNext API key
- `ERPNEXT_API_SECRET` - ERPNext API secret
- `ERPNEXT_BASE_URL` - ERPNext instance URL
- `PORT` - Server port (usually auto-set)

---

## 🐛 Troubleshooting

### Service Won't Start

**Error**: `ModuleNotFoundError: No module named 'langgraph'`

**Solution**: Ensure `requirements.txt` is being installed:
```bash
# Render: Check build logs
# Railway: Check deploy logs
# Fly.io: Check deployment logs
```

### Connection Refused from Agent Gateway

**Error**: `ECONNREFUSED` or `Connection timeout`

**Solution**:
1. Verify workflow service is running
2. Check URL is correct (https://, not http://)
3. Verify firewall allows requests
4. Check service health: `curl https://your-service-url/`

### Approval Gates Not Working

**Issue**: Workflow doesn't pause at `interrupt()`

**Solution**:
1. Verify `InMemorySaver` is configured
2. For production, use PostgresSaver
3. Check thread_id is being passed correctly

---

## 📈 Scaling Considerations

### Current Setup (InMemorySaver)
- ✅ Perfect for development
- ✅ Simple, no database needed
- ❌ State lost on restart
- ❌ Doesn't scale across multiple instances

### Production Setup (PostgresSaver)

1. **Add PostgreSQL database**:
   ```bash
   # Render: Add PostgreSQL addon
   # Railway: Add PostgreSQL plugin
   # Fly.io: Create Postgres app
   ```

2. **Update workflow graphs**:
   ```python
   from langgraph.checkpoint.postgres import PostgresSaver

   checkpointer = PostgresSaver(
       connection_string=os.getenv("DATABASE_URL")
   )
   ```

3. **Deploy**:
   ```bash
   # Set DATABASE_URL
   # Redeploy service
   ```

---

## 🎯 Next Steps

1. ✅ Choose deployment platform (Render recommended)
2. ✅ Deploy workflow service
3. ✅ Get service URL
4. ✅ Update agent gateway with URL
5. ✅ Test end-to-end
6. ⏳ Add PostgresSaver for production
7. ⏳ Set up monitoring
8. ⏳ Configure custom domain

---

## 📚 Deployment Commands Quick Reference

### Render
```bash
# Web dashboard deployment (recommended)
# 1. Connect GitHub repo
# 2. Select services/workflows
# 3. Auto-detects render.yaml
# 4. Deploy
```

### Railway
```bash
railway login
cd services/workflows
railway up
railway domain
```

### Fly.io
```bash
flyctl auth login
cd services/workflows
flyctl launch
flyctl deploy
```

### Cloudflare Workers (Agent Gateway)
```bash
cd services/agent-gateway
pnpm dlx wrangler secret put WORKFLOW_SERVICE_URL
pnpm dlx wrangler secret put ANTHROPIC_API_KEY
pnpm dlx wrangler deploy
```

---

**Status**: Ready for deployment 🚀

**Recommended Path**: Render → Test → Fly.io (if global edge needed)
