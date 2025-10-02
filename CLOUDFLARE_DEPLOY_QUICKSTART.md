# ⚡ Cloudflare Deployment - Quick Start

**Time**: 15 minutes | **Cost**: $0/month | **Platform**: 100% Cloudflare

---

## 🚀 One-Command Deployment

```bash
# Run the automated deployment script
./deploy-cloudflare.sh
```

This script will:
1. ✅ Create KV namespaces (SESSIONS, WORKFLOW_STATE)
2. ✅ Create D1 database with schema
3. ✅ Deploy Agent Gateway to Workers
4. ✅ Deploy Frontend to Pages
5. ✅ Configure all connections
6. ✅ Save deployment info

---

## 📋 Manual Steps (If Preferred)

### Step 1: Create Resources (5 min)

```bash
# 1. Login to Cloudflare
wrangler login

# 2. Create KV namespaces
wrangler kv:namespace create SESSIONS
wrangler kv:namespace create WORKFLOW_STATE

# 3. Create D1 database
wrangler d1 create erpnext-workflows-db

# 4. Initialize schema
wrangler d1 execute erpnext-workflows-db --file=setup/schema.sql
```

**Save the IDs** - You'll need them!

### Step 2: Deploy Services (10 min)

```bash
# Deploy Agent Gateway
cd services/agent-gateway
wrangler secret put ANTHROPIC_API_KEY  # Enter your key
wrangler secret put WORKFLOW_SERVICE_URL  # Enter Render URL
wrangler deploy

# Deploy Frontend
cd frontend/coagent
npm run build
wrangler pages deploy dist --project-name=erpnext-coagent-ui
```

---

## 🗂️ What Gets Deployed

| Service | Platform | Free Tier | URL |
|---------|----------|-----------|-----|
| Frontend | Cloudflare Pages | ✅ Unlimited | `*.pages.dev` |
| Agent Gateway | Cloudflare Workers | ✅ 100k req/day | `*.workers.dev` |
| Sessions (Redis) | Cloudflare KV | ✅ 100k reads/day | N/A |
| State (PostgreSQL) | Cloudflare D1 | ✅ 5M reads/day | N/A |
| Workflows | Render | ✅ 750 hrs/month | `*.onrender.com` |

**Total**: $0/month 🎉

---

## 🔑 Required Secrets

Set via: `wrangler secret put <NAME>`

**Minimum Required**:
- `ANTHROPIC_API_KEY` - Get from console.anthropic.com
- `WORKFLOW_SERVICE_URL` - Your Render URL (e.g., `https://erpnext-workflows.onrender.com`)

**Optional** (for ERPNext integration):
- `ERPNEXT_API_KEY`
- `ERPNEXT_API_SECRET`
- `ERPNEXT_BASE_URL`

---

## 🧪 Testing Deployed System

```bash
# 1. Test Agent Gateway
curl https://your-gateway.workers.dev/health

# 2. Visit Frontend
open https://your-frontend.pages.dev

# 3. Chat test
# "Check in guest John Doe for room 101"
# ✅ Should trigger workflow and show approval dialog
```

---

## 📊 Monitor Usage

**Cloudflare Dashboard**: https://dash.cloudflare.com

Navigate to:
- **Workers & Pages** → View request metrics
- **KV** → View read/write operations
- **D1** → View database queries

**Limits**:
- Workers: 100,000 requests/day ✅
- KV: 100,000 reads, 1,000 writes/day ✅
- D1: 5,000,000 reads/day ✅

You'll be **well under** these limits!

---

## 🔄 Hybrid Architecture

```
Cloudflare (Free):
├── Frontend (Pages)
├── Agent Gateway (Workers)
├── Sessions (KV)
└── State (D1 SQL)

Render (Free):
└── Workflow Service (Python)
    └── Connects to D1 for persistence
```

**Why hybrid**:
- Cloudflare: Global CDN, instant responses
- Render: Full Python support for LangGraph
- D1: Shared state between both
- **Combined**: 100% free tier! ✅

---

## 💾 Database Access

### View D1 Data

```bash
# List all workflows
wrangler d1 execute erpnext-workflows-db \
  --command="SELECT * FROM workflow_executions LIMIT 10"

# View checkpoints
wrangler d1 execute erpnext-workflows-db \
  --command="SELECT thread_id, graph_name, created_at FROM checkpoints"

# Stats
wrangler d1 execute erpnext-workflows-db \
  --command="SELECT * FROM workflow_stats"
```

### Backup & Restore

```bash
# Backup
wrangler d1 export erpnext-workflows-db --output=backup.sql

# Restore
wrangler d1 execute erpnext-workflows-db --file=backup.sql
```

---

## 🐛 Common Issues

### Issue: "KV namespace not found"
```bash
# Solution: Update ID in wrangler.toml
# Copy ID from: wrangler kv:namespace list
```

### Issue: "D1 database not found"
```bash
# Solution: Check database name
wrangler d1 list
# Update database_id in wrangler.toml
```

### Issue: "Worker deployment failed"
```bash
# Solution: Check secrets are set
wrangler secret list
# Set missing secrets:
wrangler secret put ANTHROPIC_API_KEY
```

### Issue: "Frontend can't reach gateway"
```bash
# Solution: Update environment variable
# In frontend/coagent/.env.production:
VITE_GATEWAY_URL=https://your-actual-worker.workers.dev
```

---

## 📁 Files Modified

After deployment, these files are updated:

- `services/agent-gateway/wrangler.toml` - KV/D1 IDs added
- `frontend/coagent/.env.production` - Gateway URL added
- `DEPLOYMENT_INFO.txt` - All deployment details saved

**Keep these in git** (except secrets!)

---

## ✅ Deployment Checklist

- [ ] Wrangler installed: `npm install -g wrangler`
- [ ] Logged in: `wrangler login`
- [ ] KV namespaces created
- [ ] D1 database created with schema
- [ ] Secrets configured (ANTHROPIC_API_KEY, WORKFLOW_SERVICE_URL)
- [ ] Agent gateway deployed
- [ ] Frontend deployed
- [ ] Workflow service deployed to Render
- [ ] End-to-end test passed
- [ ] Deployment info saved

---

## 🎯 After Deployment

### Immediate
1. ✅ Test all 5 workflows
2. ✅ Verify approval gates work
3. ✅ Check D1 data is persisting

### Next Steps
1. Add custom domain (Cloudflare Pages)
2. Set up monitoring/alerts
3. Add ERPNext integration
4. Build domain widgets

---

## 📞 Need Help?

**Documentation**:
- Full guide: `CLOUDFLARE_FREE_TIER_DEPLOY.md`
- Database schema: `setup/schema.sql`
- Deployment script: `deploy-cloudflare.sh`

**Cloudflare Support**:
- Workers: https://developers.cloudflare.com/workers/
- D1: https://developers.cloudflare.com/d1/
- KV: https://developers.cloudflare.com/kv/

---

## 🎉 Success!

After deployment, you'll have:
- ✅ Global CDN-distributed frontend
- ✅ Serverless agent gateway
- ✅ Persistent workflow state in D1
- ✅ Fast session storage in KV
- ✅ All for **$0/month**

**Your URLs**:
```
Frontend:  https://erpnext-coagent-ui.pages.dev
Gateway:   https://erpnext-agent-gateway.workers.dev
Workflows: https://erpnext-workflows.onrender.com
```

🚀 **You're live!**
