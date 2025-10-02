# 🔌 Integration Readiness Guide

## Overview

This document ensures all integrations are ready for the next implementation phases (Phase 3.3 - 3.8).

---

## ✅ Currently Integrated & Ready

### 1. Cloudflare Workers Platform ✅
- **Status**: Fully configured
- **Account ID**: `5a34e22d045e4ff3538a636317a631e8`
- **Services Configured**:
  - Agent Gateway (Node.js/TypeScript)
  - Workflows Service (Python - pending)
  - Generator Service (Python - pending)
  - Frontend (React + Vite)
- **Storage**:
  - KV Namespace: `SESSIONS` (ID: `eec1ac4c36d14839a7574b41c0ffa339`)
  - R2 Bucket: Pending creation

### 2. Wrangler CLI ✅
- **Version**: 4.40.3
- **Authentication**: Logged in as dev.yosefali@gmail.com
- **Permissions**: Full access (workers, kv, pages, r2, d1, queues, etc.)

### 3. GitHub Repository ✅
- **Repo**: Yosef-Ali/Multi-Industry_ERPNext_Coagents_SaaS
- **Current Branch**: feature/frontend-copilotkit-integration
- **Default Branch**: 001-erpnext-coagents-mvp
- **Remote**: Configured and accessible

---

## 🔄 Integrations Pending Setup

### 1. ERPNext Integration
**Status**: Configuration ready, pending credentials

**What's Needed**:
```bash
# Option A: Local ERPNext (Docker)
docker run -d \
  --name erpnext \
  -p 8080:8000 \
  frappe/erpnext:latest

# Option B: Cloud ERPNext
# Sign up: https://frappecloud.com/ (14-day free trial)

# Get API credentials from: Settings → API → Generate Keys
```

**Environment Variables**:
```bash
ERPNEXT_BASE_URL=http://localhost:8080  # or cloud URL
ERPNEXT_API_KEY=your_api_key
ERPNEXT_API_SECRET=your_api_secret
```

**Wrangler Secrets**:
```bash
cd services/agent-gateway
pnpm dlx wrangler secret put ERPNEXT_BASE_URL
pnpm dlx wrangler secret put ERPNEXT_API_KEY
pnpm dlx wrangler secret put ERPNEXT_API_SECRET
```

### 2. Anthropic Claude API
**Status**: Configuration ready, pending API key

**What's Needed**:
1. Sign up: https://console.anthropic.com/
2. Get free $5 credits (~25,000 API calls)
3. Copy your API key

**Wrangler Secret**:
```bash
cd services/agent-gateway
pnpm dlx wrangler secret put ANTHROPIC_API_KEY
# Paste: sk-ant-xxxxxxxxxxxxxxxx
```

### 3. Redis/KV Storage for Sessions
**Status**: KV configured, Redis optional for local dev

**Current Setup**:
- **Production**: Cloudflare KV (SESSIONS namespace) ✅
- **Local Dev**: In-memory storage (can add Redis)

**Optional Local Redis**:
```bash
# If you want Redis for local development
docker run -d -p 6379:6379 --name redis redis:7-alpine

# Update .env
REDIS_URL=redis://localhost:6379
```

---

## 🚀 Next Implementation Phases Integration Setup

### Phase 3.3: Workflows (T080-T087)
**Integration Points**:
- ✅ LangGraph SDK (already in pyproject.toml)
- ✅ AG-UI Frame emission configured in streaming.ts
- ⏳ Redis/KV for state storage (KV ready, workflows pending)
- ⏳ Anthropic API for agent execution

**Preparation Commands**:
```bash
# Create KV namespace for workflow state
cd services/workflows
pnpm dlx wrangler kv namespace create WORKFLOW_STATE

# Update wrangler.toml with the ID returned
```

### Phase 3.4: Approval Gate (T088-T093)
**Integration Points**:
- ✅ ApprovalDialog component (frontend/coagent/src/components/ApprovalDialog.tsx)
- ✅ Risk classifier (apps/common/risk_classifier.py)
- ✅ Audit logger (apps/common/audit_logger.py)
- ⏳ Approval event streaming via AG-UI

**Preparation**:
```bash
# No additional setup needed - components ready
# Just need to implement approval workflow handlers
```

### Phase 3.5: CopilotKit UI (T094-T102)
**Integration Points**:
- ✅ CopilotKit SDK installed (@copilotkit/sdk-js@1.10.5)
- ✅ React frontend configured (frontend/coagent/)
- ✅ AG-UI endpoint (/agui) configured
- ✅ CopilotPanel component ready

**Preparation**:
```bash
# Frontend already configured
cd frontend/coagent
npm install  # Dependencies already in package.json
```

### Phase 3.6: Hospital Tools (T059-T070)
**Integration Points**:
- ✅ Tool registry system (src/tools/registry.ts)
- ✅ Hospital tool stubs (src/tools/hospital/)
- ⏳ ERPNext Hospital module setup
- ⏳ Tool implementations

**ERPNext Setup**:
```bash
# Install hospital app in ERPNext
cd apps/erpnext_hospital
bench --site erpnext.local install-app erpnext_hospital

# Enable in ERPNext: Settings → Industry Modules → Hospital
```

### Phase 3.7: App Generator (T103-T115)
**Integration Points**:
- ✅ Generator service structure (services/generator/)
- ⏳ R2 bucket for generated artifacts
- ⏳ Template system (src/templates/)
- ⏳ Anthropic API for code generation

**Preparation**:
```bash
# Create R2 bucket for generated apps
cd services/generator
pnpm dlx wrangler r2 bucket create erpnext-generated-apps

# Update wrangler.toml with bucket name
```

### Phase 3.8: Deployment (T119-T124)
**Integration Points**:
- ✅ Wrangler configuration complete
- ✅ GitHub repository connected
- ⏳ CI/CD pipeline
- ⏳ Production deployment

**GitHub Actions Setup**:
```yaml
# .github/workflows/deploy.yml (to be created)
# Will auto-deploy on push to main branch
```

---

## 🔐 Secrets Management

### Current Secrets Status

| Secret | Service | Status | Set Command |
|--------|---------|--------|-------------|
| `ANTHROPIC_API_KEY` | agent-gateway | ⏳ Pending | `pnpm dlx wrangler secret put ANTHROPIC_API_KEY` |
| `ERPNEXT_BASE_URL` | agent-gateway | ⏳ Pending | `pnpm dlx wrangler secret put ERPNEXT_BASE_URL` |
| `ERPNEXT_API_KEY` | agent-gateway | ⏳ Pending | `pnpm dlx wrangler secret put ERPNEXT_API_KEY` |
| `ERPNEXT_API_SECRET` | agent-gateway | ⏳ Pending | `pnpm dlx wrangler secret put ERPNEXT_API_SECRET` |

### For Each Service

```bash
# Agent Gateway
cd services/agent-gateway
pnpm dlx wrangler secret put ANTHROPIC_API_KEY
pnpm dlx wrangler secret put ERPNEXT_BASE_URL
pnpm dlx wrangler secret put ERPNEXT_API_KEY
pnpm dlx wrangler secret put ERPNEXT_API_SECRET

# Workflows (when ready)
cd ../workflows
pnpm dlx wrangler secret put ANTHROPIC_API_KEY
pnpm dlx wrangler secret put ERPNEXT_BASE_URL

# Generator (when ready)
cd ../generator
pnpm dlx wrangler secret put ANTHROPIC_API_KEY
pnpm dlx wrangler secret put ERPNEXT_BASE_URL
```

---

## 📦 Storage Resources

### KV Namespaces

| Namespace | Binding | ID | Purpose | Status |
|-----------|---------|----|---------| -------|
| SESSIONS | SESSIONS | `eec1ac4c36d14839a7574b41c0ffa339` | User sessions | ✅ Created |
| WORKFLOW_STATE | WORKFLOW_STATE | ⏳ Pending | Workflow state | ⏳ Pending |
| APPROVALS | APPROVALS | ⏳ Pending | Approval requests | ⏳ Pending |

**Create Pending Namespaces**:
```bash
# Workflow state storage
pnpm dlx wrangler kv namespace create WORKFLOW_STATE

# Approval requests storage
pnpm dlx wrangler kv namespace create APPROVALS
```

### R2 Buckets

| Bucket | Purpose | Status |
|--------|---------|--------|
| erpnext-generated-apps | Generated app artifacts | ⏳ Pending |
| erpnext-uploads | User file uploads | ⏳ Pending |

**Create Buckets**:
```bash
# Generated apps storage
pnpm dlx wrangler r2 bucket create erpnext-generated-apps

# User uploads (optional)
pnpm dlx wrangler r2 bucket create erpnext-uploads
```

---

## 🧪 Testing Integration Points

### 1. API Health Checks
```bash
# Local development
curl http://localhost:3000/health

# Production (after deployment)
curl https://erpnext-agent-gateway.workers.dev/health
```

### 2. ERPNext Connection Test
```bash
# Test from agent gateway
curl -X POST http://localhost:3000/agui \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test-token" \
  -d '{
    "user_id": "test@example.com",
    "message": "test connection",
    "enabled_industries": ["common"]
  }'
```

### 3. KV Storage Test
```bash
# Test KV write/read
pnpm dlx wrangler kv:key put --binding=SESSIONS test-key "test-value"
pnpm dlx wrangler kv:key get --binding=SESSIONS test-key
```

---

## 📊 Monitoring & Observability

### Cloudflare Dashboard
- **URL**: https://dash.cloudflare.com/
- **Workers**: Monitor requests, errors, CPU time
- **KV**: Track read/write operations
- **Analytics**: Real-time metrics

### Wrangler CLI Monitoring
```bash
# Real-time logs
pnpm dlx wrangler tail erpnext-agent-gateway

# Deployment history
pnpm dlx wrangler deployments list

# KV usage
pnpm dlx wrangler kv:namespace list
```

### Local Development Logs
```bash
# Structured logs in logs/
tail -f logs/tools.jsonl
tail -f logs/approvals.jsonl
tail -f logs/workflows.jsonl
```

---

## 🔄 CI/CD Integration (Next Step)

### GitHub Actions Workflow

Create `.github/workflows/deploy.yml`:
```yaml
name: Deploy to Cloudflare

on:
  push:
    branches: [main, 001-erpnext-coagents-mvp]

jobs:
  deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - uses: actions/setup-node@v3
        with:
          node-version: '22'
      
      - name: Deploy Agent Gateway
        env:
          CLOUDFLARE_API_TOKEN: ${{ secrets.CLOUDFLARE_API_TOKEN }}
        run: |
          cd services/agent-gateway
          npm install
          pnpm dlx wrangler deploy
      
      - name: Deploy Frontend
        run: |
          cd frontend/coagent
          npm install
          npm run build
          pnpm dlx wrangler pages deploy dist
```

### Required GitHub Secrets
1. Go to: `Settings → Secrets → Actions`
2. Add: `CLOUDFLARE_API_TOKEN`
3. Get token from: https://dash.cloudflare.com/profile/api-tokens

---

## ✅ Pre-Deployment Checklist

Before deploying each phase:

- [ ] All secrets set via `wrangler secret put`
- [ ] KV namespaces created and configured
- [ ] R2 buckets created (if needed)
- [ ] wrangler.toml updated with all IDs
- [ ] Dependencies installed (`npm install` / `poetry install`)
- [ ] TypeScript/Python builds successfully
- [ ] Tests pass (`npm test` / `pytest`)
- [ ] Health check endpoint responds
- [ ] Environment variables documented in .env.example
- [ ] CHANGELOG.md updated with changes

---

## 🚀 Quick Deploy Commands

### Deploy Agent Gateway Only
```bash
cd services/agent-gateway
npm install
pnpm dlx wrangler deploy
```

### Deploy Frontend Only
```bash
cd frontend/coagent
npm install
npm run build
pnpm dlx wrangler pages deploy dist
```

### Deploy Everything (when Python support ready)
```bash
./deploy-free.sh
```

---

## 📚 Integration Documentation

- **Cloudflare Docs**: https://developers.cloudflare.com/workers/
- **Wrangler CLI**: https://developers.cloudflare.com/workers/wrangler/
- **KV Storage**: https://developers.cloudflare.com/kv/
- **R2 Storage**: https://developers.cloudflare.com/r2/
- **ERPNext API**: https://frappeframework.com/docs/user/en/api
- **Anthropic Claude**: https://docs.anthropic.com/

---

## 🆘 Troubleshooting Integration Issues

### Issue: "Authentication required"
```bash
pnpm dlx wrangler login
pnpm dlx wrangler whoami
```

### Issue: "KV namespace not found"
```bash
# List all namespaces
pnpm dlx wrangler kv:namespace list

# Verify ID in wrangler.toml matches
```

### Issue: "Secret not set"
```bash
# List secrets
pnpm dlx wrangler secret list

# Set missing secret
pnpm dlx wrangler secret put SECRET_NAME
```

### Issue: "ERPNext connection failed"
```bash
# Test ERPNext is running
curl http://localhost:8080

# Check API credentials
# Go to ERPNext: Settings → API → Verify keys
```

---

## 📝 Next Steps for Implementation

1. **Set API Secrets** (5 min)
   ```bash
   cd services/agent-gateway
   pnpm dlx wrangler secret put ANTHROPIC_API_KEY
   pnpm dlx wrangler secret put ERPNEXT_BASE_URL
   pnpm dlx wrangler secret put ERPNEXT_API_KEY
   pnpm dlx wrangler secret put ERPNEXT_API_SECRET
   ```

2. **Create Remaining KV Namespaces** (2 min)
   ```bash
   pnpm dlx wrangler kv namespace create WORKFLOW_STATE
   pnpm dlx wrangler kv namespace create APPROVALS
   ```

3. **Create R2 Buckets** (1 min)
   ```bash
   pnpm dlx wrangler r2 bucket create erpnext-generated-apps
   ```

4. **Deploy Agent Gateway** (3 min)
   ```bash
   cd services/agent-gateway
   npm install
   pnpm dlx wrangler deploy
   ```

5. **Deploy Frontend** (3 min)
   ```bash
   cd frontend/coagent
   npm install
   npm run build
   pnpm dlx wrangler pages deploy dist
   ```

6. **Test Deployment** (2 min)
   ```bash
   curl https://erpnext-agent-gateway.workers.dev/health
   ```

**Total Time**: ~15 minutes to fully deployed! 🚀

---

**Status**: Ready for next implementation phase!
**Last Updated**: October 1, 2025
