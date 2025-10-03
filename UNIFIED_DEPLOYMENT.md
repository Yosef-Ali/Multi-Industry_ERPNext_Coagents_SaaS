# 🎯 Unified SaaS Deployment Strategy

## Your Goal: Complete Free-Tier SaaS Platform

You want everything running for **free** (or near-free) as a SaaS service that customers can reach.

## ✅ Current Status

| Component | Status | Hosting |
|-----------|--------|---------|
| Frontend | ✅ Deployed | Cloudflare Workers (Free) |
| Workflow Service | ⚠️ Local Only | Need to deploy |
| Agent Gateway | ⚠️ Not Started | Need to deploy |
| ERPNext Backend | ❓ Unknown | Customer's server |

## 🏗️ Two Deployment Options

### Option 1: Docker on Single Free VM (Recommended for MVP)

**Use:** Free tier VM from Render, Railway, or Fly.io

```
Free VM (512MB-1GB RAM)
├── Docker Compose
│   ├── workflow-service:8001 (Python/FastAPI)
│   ├── agent-gateway:3000 (TypeScript/Express)
│   └── Redis (optional)
├── Public URL: https://your-app.onrender.com
```

**Pros:**
- ✅ Everything in one place (easy maintenance)
- ✅ Matches your `docker-compose.yml` exactly
- ✅ Free tier available (Render: 512MB RAM, Railway: $5/month credit)
- ✅ Simple to scale later

**Cons:**
- ⚠️ Free tier has sleep after inactivity (cold starts ~30s)
- ⚠️ Limited to 1 instance (no auto-scaling)

### Option 2: Serverless (Current Approach)

```
Frontend: Cloudflare Workers ✅
Workflow Service: Need serverless platform
Agent Gateway: Need serverless platform
```

**Problem:** Your Python workflow service uses LangGraph which needs:
- State persistence
- Long-running processes
- WebSocket support

These don't work well in serverless (cold starts, timeouts).

## 🎯 Recommended: Hybrid Approach

**Best for SaaS:**

```
┌─────────────────────────────────────────┐
│  Cloudflare Workers (Free)              │
│  ├── Frontend UI                        │
│  │   https://erpnext-coagent-ui....     │
│  │   Currently deployed ✅               │
└─────────────────────────────────────────┘
           │
           ↓ (calls API)
┌─────────────────────────────────────────┐
│  Render.com Web Service (Free Tier)    │
│  https://erpnext-backend.onrender.com   │
│                                          │
│  Docker Compose (same as local):        │
│  ├── workflow-service:8001              │
│  ├── agent-gateway:3000                 │
│  └── Redis (optional)                   │
└─────────────────────────────────────────┘
           │
           ↓ (calls Frappe API)
┌─────────────────────────────────────────┐
│  Customer's ERPNext                     │
│  (their own server/cloud)               │
└─────────────────────────────────────────┘
```

**Why this works:**
- ✅ Frontend stays on Cloudflare (global CDN, instant)
- ✅ Backend runs 24/7 on Render (persistent state, no cold starts)
- ✅ Uses your existing `docker-compose.yml`
- ✅ **100% Free** for development/small usage
- ✅ Easy to upgrade to paid tier when you get customers

## 📋 Deployment Steps (Recommended)

### Step 1: Deploy Backend to Render (Free Tier)

**Create `render.yaml` in project root:**

```yaml
services:
  # Combined backend service (workflow + agent-gateway)
  - type: web
    name: erpnext-backend
    env: docker
    plan: free
    dockerfilePath: ./Dockerfile.render
    dockerContext: .
    envVars:
      - key: ANTHROPIC_API_KEY
        sync: false
      - key: OPENROUTER_API_KEY
        sync: false
      - key: PORT
        value: 8001
```

**Create `Dockerfile.render`:**

```dockerfile
FROM node:18-alpine AS agent-builder
WORKDIR /app/agent-gateway
COPY services/agent-gateway/package*.json ./
RUN npm install
COPY services/agent-gateway .
RUN npm run build

FROM python:3.11-slim
WORKDIR /app

# Install Node.js for agent-gateway
RUN apt-get update && apt-get install -y nodejs npm curl && rm -rf /var/lib/apt/lists/*

# Copy workflow service
COPY services/workflows /app/workflows
WORKDIR /app/workflows
RUN pip install --no-cache-dir -r requirements.txt

# Copy agent-gateway from builder
COPY --from=agent-builder /app/agent-gateway /app/agent-gateway

# Create startup script
RUN echo '#!/bin/sh\n\
cd /app/workflows && python src/server.py &\n\
cd /app/agent-gateway && npm start\n\
wait' > /app/start.sh && chmod +x /app/start.sh

EXPOSE 8001 3000
CMD ["/app/start.sh"]
```

### Step 2: Update Frontend to Use Render URL

**In `frontend/coagent/src/components/ERPNextActions.tsx`:**

```typescript
const WORKFLOW_SERVICE_URL =
  process.env.NEXT_PUBLIC_WORKFLOW_URL ||
  'https://erpnext-backend.onrender.com';
```

### Step 3: Deploy

```bash
# 1. Push to GitHub
git add .
git commit -m "feat: unified backend deployment"
git push

# 2. Connect to Render
# - Go to render.com
# - New → Web Service
# - Connect GitHub repo
# - Render detects render.yaml
# - Click Deploy

# 3. Redeploy frontend (already done)
bash deploy-cloudflare-frontend.sh
```

## 💰 Cost Analysis

### Free Tier Limits

**Cloudflare Workers:**
- ✅ 100,000 requests/day
- ✅ Unlimited bandwidth
- ✅ Global CDN
- Cost: **$0/month**

**Render.com Free Tier:**
- ✅ 512MB RAM
- ✅ 0.1 CPU
- ✅ Sleeps after 15min inactivity
- ✅ 750 hours/month
- Cost: **$0/month**

**When you get customers (Paid Tier):**
- Render Starter: $7/month (1GB RAM, no sleep)
- Render Standard: $25/month (2GB RAM, auto-scale)

### Staying Within Free Tier

**Your SaaS will stay free until:**
- >100k requests/day (very unlikely for MVP)
- Need 24/7 uptime with no cold starts
- Need more than 512MB RAM

For a **beta/MVP SaaS**, this is perfect!

## 🚀 Quick Start (Recommended Path)

Want me to:
1. Create the `Dockerfile.render` and `render.yaml`
2. Test the Docker build locally
3. Help you deploy to Render
4. Update frontend to use the Render URL

This gives you a **100% free, fully functional SaaS** that customers can access!

**Say "yes" and I'll set it up now.**
