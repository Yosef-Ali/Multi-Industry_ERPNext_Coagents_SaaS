# 🚀 Complete Cloudflare Free Tier Deployment Guide

**Platform**: 100% Cloudflare (Workers, Pages, D1, KV, R2)
**Cost**: $0/month (free tier)
**Time**: 30-45 minutes
**Prerequisites**: Cloudflare account, Wrangler CLI

---

## 📋 Overview

Your project is already configured for Cloudflare! Here's what we'll deploy:

```
┌─────────────────────────────────────────────────┐
│  Frontend (Cloudflare Pages)                    │
│  → erpnext-coagent-ui.pages.dev                │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  Agent Gateway (Cloudflare Workers)             │
│  → erpnext-agent-gateway.workers.dev           │
│  • KV for sessions (replaces Redis)            │
│  • D1 for workflow state (replaces PostgreSQL) │
└────────────────┬────────────────────────────────┘
                 │
                 ▼
┌─────────────────────────────────────────────────┐
│  Workflow Service (Cloudflare Workers Python)   │
│  → erpnext-workflows.workers.dev               │
│  • D1 for LangGraph checkpoints                │
│  • KV for workflow cache                        │
└─────────────────────────────────────────────────┘
```

---

## 🎯 Cloudflare Free Tier Resources

| Resource | Free Tier Limit | Our Usage |
|----------|----------------|-----------|
| Workers | 100,000 req/day | ✅ Plenty |
| KV | 100,000 reads/day, 1,000 writes/day | ✅ Sufficient |
| D1 (SQL) | 5GB storage, 5M reads/day | ✅ More than enough |
| Pages | Unlimited sites | ✅ Perfect |
| R2 | 10GB storage (if needed) | ✅ Available |

**Total Monthly Cost**: **$0** 🎉

---

## 🔧 Step-by-Step Deployment

### Prerequisites

```bash
# 1. Install Wrangler CLI (if not already installed)
npm install -g wrangler

# 2. Login to Cloudflare
wrangler login
# Opens browser, click "Allow"

# 3. Verify account
wrangler whoami
# Should show your account email
```

---

### Step 1: Create Cloudflare Resources (10 min)

#### 1.1: Create KV Namespaces

```bash
# For Agent Gateway (sessions storage - replaces Redis)
wrangler kv:namespace create SESSIONS --preview=false
# Output: ✅ Created namespace with ID: abc123...

# For Workflow Service (state cache)
wrangler kv:namespace create WORKFLOW_STATE --preview=false
# Output: ✅ Created namespace with ID: def456...

# Note these IDs - we'll use them next!
```

#### 1.2: Create D1 Database (replaces PostgreSQL)

```bash
# Create database for LangGraph checkpoints
wrangler d1 create erpnext-workflows-db
# Output:
# ✅ Successfully created DB 'erpnext-workflows-db'
# database_id = "xyz789..."

# Create tables
wrangler d1 execute erpnext-workflows-db --file=./setup/schema.sql
```

**Create `setup/schema.sql`**:
```sql
-- LangGraph checkpoint table
CREATE TABLE IF NOT EXISTS checkpoints (
    thread_id TEXT PRIMARY KEY,
    checkpoint_ns TEXT NOT NULL,
    checkpoint BLOB NOT NULL,
    metadata TEXT,
    parent_checkpoint_id TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE INDEX idx_thread_ns ON checkpoints(thread_id, checkpoint_ns);

-- Workflow execution history
CREATE TABLE IF NOT EXISTS workflow_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    thread_id TEXT NOT NULL,
    graph_name TEXT NOT NULL,
    status TEXT NOT NULL,
    start_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    end_time TIMESTAMP,
    error TEXT,
    FOREIGN KEY (thread_id) REFERENCES checkpoints(thread_id)
);
```

---

### Step 2: Update Configuration Files (5 min)

#### 2.1: Update Agent Gateway Wrangler Config

**File**: `services/agent-gateway/wrangler.toml`

```toml
name = "erpnext-agent-gateway"
account_id = "5a34e22d045e4ff3538a636317a631e8"
main = "src/index.ts"  # Updated from server.ts
compatibility_date = "2024-10-01"
compatibility_flags = ["nodejs_compat"]

# KV for sessions (replaces Redis)
[[kv_namespaces]]
binding = "SESSIONS"
id = "abc123..."  # ← Use ID from Step 1.1

# D1 for workflow metadata
[[d1_databases]]
binding = "DB"
database_name = "erpnext-workflows-db"
database_id = "xyz789..."  # ← Use ID from Step 1.2

[vars]
NODE_ENV = "production"
WORKFLOW_SERVICE_URL = "https://erpnext-workflows.workers.dev"  # Will update after deploying workflows

[build]
command = "npm run build"

[dev]
port = 3000
```

#### 2.2: Update Workflow Service Wrangler Config

**Important**: Cloudflare Workers has **experimental Python support**. For production, we'll use a **Python-to-JS adapter** or deploy Python service to a compatible platform.

**Option A: Use Cloudflare Workers for Containers (Beta)**

```toml
# services/workflows/wrangler.toml
name = "erpnext-workflows"
account_id = "5a34e22d045e4ff3538a636317a631e8"
compatibility_date = "2024-10-01"

# Python support (experimental)
[build]
command = "pip install -r requirements.txt && python -m compileall src/"

# KV for workflow cache
[[kv_namespaces]]
binding = "WORKFLOW_STATE"
id = "def456..."  # ← Use ID from Step 1.1

# D1 for checkpoints
[[d1_databases]]
binding = "DB"
database_name = "erpnext-workflows-db"
database_id = "xyz789..."  # ← Use ID from Step 1.2

[vars]
ENVIRONMENT = "production"
```

**Option B: Deploy Python Service to Cloudflare Pages Functions (Recommended)**

Cloudflare Pages supports Python via Functions. Better compatibility!

---

### Step 3: Adapt for Cloudflare D1 (15 min)

#### 3.1: Create D1 Checkpoint Adapter

**File**: `services/workflows/src/core/d1_checkpointer.py`

```python
"""
D1 Database Checkpoint Adapter for LangGraph
Replaces PostgresSaver with Cloudflare D1
"""

from typing import Optional, Dict, Any
from langgraph.checkpoint.base import BaseCheckpointSaver
import json
import asyncio

class D1CheckpointSaver(BaseCheckpointSaver):
    """
    Checkpoint saver using Cloudflare D1 database
    Compatible with LangGraph's checkpoint protocol
    """

    def __init__(self, db_binding):
        """
        Args:
            db_binding: Cloudflare D1 database binding (from env.DB)
        """
        self.db = db_binding

    async def aget(self, thread_id: str, checkpoint_ns: str = "default") -> Optional[Dict]:
        """Get checkpoint from D1"""
        result = await self.db.prepare(
            "SELECT checkpoint, metadata FROM checkpoints WHERE thread_id = ? AND checkpoint_ns = ?"
        ).bind(thread_id, checkpoint_ns).first()

        if result:
            return {
                "checkpoint": json.loads(result["checkpoint"]),
                "metadata": json.loads(result["metadata"]) if result["metadata"] else {}
            }
        return None

    async def aput(self, thread_id: str, checkpoint_ns: str, checkpoint: Dict, metadata: Dict = None) -> None:
        """Save checkpoint to D1"""
        await self.db.prepare(
            """
            INSERT OR REPLACE INTO checkpoints (thread_id, checkpoint_ns, checkpoint, metadata)
            VALUES (?, ?, ?, ?)
            """
        ).bind(
            thread_id,
            checkpoint_ns,
            json.dumps(checkpoint),
            json.dumps(metadata) if metadata else None
        ).run()

    async def alist(self, thread_id: str, limit: int = 10) -> list:
        """List checkpoints for thread"""
        results = await self.db.prepare(
            "SELECT * FROM checkpoints WHERE thread_id = ? ORDER BY created_at DESC LIMIT ?"
        ).bind(thread_id, limit).all()

        return [
            {
                "checkpoint": json.loads(r["checkpoint"]),
                "metadata": json.loads(r["metadata"]) if r["metadata"] else {},
                "created_at": r["created_at"]
            }
            for r in results["results"]
        ]
```

#### 3.2: Update Workflow Executor

**File**: `services/workflows/src/core/executor.py`

```python
# Add imports
import os
from .d1_checkpointer import D1CheckpointSaver

class WorkflowExecutor:
    def __init__(self, db_binding=None):
        """
        Args:
            db_binding: Cloudflare D1 database (from env.DB in Workers)
        """
        # Use D1 checkpointer if available, otherwise InMemory
        if db_binding:
            self.checkpointer = D1CheckpointSaver(db_binding)
        else:
            from langgraph.checkpoint.memory import InMemorySaver
            self.checkpointer = InMemorySaver()

        # ... rest of init
```

---

### Step 4: Deploy Services (10 min)

#### 4.1: Deploy Agent Gateway

```bash
cd services/agent-gateway

# 1. Install dependencies
npm install

# 2. Set secrets
wrangler secret put ANTHROPIC_API_KEY
# Enter: sk-ant-...

wrangler secret put ERPNEXT_API_KEY
# Enter: your-erpnext-key (if you have it)

wrangler secret put ERPNEXT_API_SECRET
# Enter: your-erpnext-secret

wrangler secret put ERPNEXT_BASE_URL
# Enter: https://your-erpnext.com

# 3. Deploy
wrangler deploy

# Output: ✅ https://erpnext-agent-gateway.workers.dev
```

#### 4.2: Deploy Workflow Service

**Option A: Via Cloudflare Pages Functions** (Recommended)

```bash
cd services/workflows

# 1. Create Pages project
wrangler pages project create erpnext-workflows

# 2. Build for Pages Functions
mkdir -p functions
cat > functions/api/[[route]].ts << 'EOF'
// This file proxies to Python FastAPI via Pyodide or similar
import { handleRequest } from '../../dist/worker.js';

export async function onRequest(context) {
  return handleRequest(context.request, context.env);
}
EOF

# 3. Deploy
wrangler pages deploy dist --project-name=erpnext-workflows

# Output: ✅ https://erpnext-workflows.pages.dev
```

**Option B: Use Hyperdrive (Python via proxy)**

Actually, for Python workflows, let's use **Cloudflare Workers for Python (Beta)** or **hybrid approach**:

```bash
# The Python service is complex - let's keep it on Render (free tier)
# But connect it to Cloudflare D1 for persistence

# Update agent-gateway to point to Render URL:
wrangler secret put WORKFLOW_SERVICE_URL
# Enter: https://your-render-app.onrender.com
```

#### 4.3: Deploy Frontend

```bash
cd frontend/coagent

# 1. Build
npm run build

# 2. Deploy to Cloudflare Pages
wrangler pages deploy dist --project-name=erpnext-coagent-ui

# Output: ✅ https://erpnext-coagent-ui.pages.dev
```

---

### Step 5: Connect Services (5 min)

#### 5.1: Update URLs

**Update Agent Gateway**:
```bash
cd services/agent-gateway
wrangler secret put WORKFLOW_SERVICE_URL
# Enter: https://erpnext-workflows.onrender.com
# (Python service stays on Render for now - free tier)
```

**Update Frontend Environment**:
```bash
cd frontend/coagent

# Update wrangler.toml
# [vars]
# VITE_GATEWAY_URL = "https://erpnext-agent-gateway.workers.dev"

# Redeploy
npm run build
wrangler pages deploy dist
```

---

## 🔄 Hybrid Free Tier Architecture (Recommended)

Since Python on Cloudflare Workers is experimental, here's the **optimal free tier setup**:

```
┌─────────────────────────────────────────┐
│  Frontend                               │
│  Cloudflare Pages (FREE)                │
│  https://erpnext-coagent-ui.pages.dev  │
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│  Agent Gateway                          │
│  Cloudflare Workers (FREE)              │
│  • KV for sessions                      │
│  • D1 for metadata                      │
│  https://erpnext-agent-gateway.workers.dev
└───────────────┬─────────────────────────┘
                │
                ▼
┌─────────────────────────────────────────┐
│  Workflow Service                       │
│  Render Free Tier (750 hrs/month)      │
│  • Python FastAPI ✅                    │
│  • Connects to Cloudflare D1 for state │
│  https://erpnext-workflows.onrender.com │
└─────────────────────────────────────────┘
```

**Why this approach**:
- ✅ Frontend & Gateway on Cloudflare (instant, global)
- ✅ Python workflows on Render (full Python support)
- ✅ State stored in Cloudflare D1 (free, persistent)
- ✅ Sessions in Cloudflare KV (free, fast)
- ✅ **Total cost: $0/month**

---

## 📝 Complete Deployment Commands

### One-Time Setup

```bash
# 1. Create resources
wrangler kv:namespace create SESSIONS
wrangler kv:namespace create WORKFLOW_STATE
wrangler d1 create erpnext-workflows-db
wrangler d1 execute erpnext-workflows-db --file=setup/schema.sql

# 2. Note the IDs and update wrangler.toml files
```

### Deploy All Services

```bash
# Deploy Agent Gateway
cd services/agent-gateway
wrangler secret put ANTHROPIC_API_KEY
wrangler secret put WORKFLOW_SERVICE_URL  # https://your-render-app.onrender.com
wrangler deploy

# Deploy Frontend
cd frontend/coagent
npm run build
wrangler pages deploy dist --project-name=erpnext-coagent-ui

# Deploy Workflow Service (Render via GitHub)
# 1. Push to GitHub
# 2. Connect Render to your repo
# 3. Render auto-deploys using render.yaml ✅
```

---

## 🧪 Testing Deployed Services

```bash
# 1. Test Agent Gateway
curl https://erpnext-agent-gateway.workers.dev/health

# 2. Test Workflow Service
curl https://erpnext-workflows.onrender.com/workflows

# 3. Test Frontend
# Visit: https://erpnext-coagent-ui.pages.dev
# Chat: "Check in guest John Doe"
# Should work end-to-end! ✅
```

---

## 💾 Database & State Management

### Cloudflare D1 (SQL Database)
```bash
# View data
wrangler d1 execute erpnext-workflows-db --command="SELECT * FROM checkpoints LIMIT 5"

# Backup
wrangler d1 export erpnext-workflows-db --output=backup.sql

# Restore
wrangler d1 execute erpnext-workflows-db --file=backup.sql
```

### Cloudflare KV (Key-Value Store)
```bash
# View keys
wrangler kv:key list --namespace-id=abc123

# Get value
wrangler kv:key get "session:123" --namespace-id=abc123

# Delete old sessions (cleanup)
wrangler kv:bulk delete --namespace-id=abc123 --prefix="session:"
```

---

## 📊 Free Tier Limits & Monitoring

### Check Usage (via Cloudflare Dashboard)

1. Go to: https://dash.cloudflare.com
2. Click on "Workers & Pages"
3. View usage:
   - Workers requests: X / 100,000 daily
   - KV reads: X / 100,000 daily
   - D1 reads: X / 5,000,000 daily

### Stay Within Free Tier

**Current setup should use**:
- ~1,000 Worker requests/day (well under 100k limit)
- ~500 KV operations/day (well under limits)
- ~2,000 D1 reads/day (well under 5M limit)

**You're safe!** ✅

---

## 🎯 Final Checklist

- [ ] Cloudflare account created
- [ ] Wrangler CLI installed and logged in
- [ ] KV namespaces created (SESSIONS, WORKFLOW_STATE)
- [ ] D1 database created with schema
- [ ] Agent gateway deployed to Workers
- [ ] Frontend deployed to Pages
- [ ] Workflow service deployed to Render (free tier)
- [ ] All secrets configured
- [ ] Services connected and tested
- [ ] URLs documented

---

## 📞 Support & Resources

### Cloudflare Docs
- **Workers**: https://developers.cloudflare.com/workers/
- **KV**: https://developers.cloudflare.com/kv/
- **D1**: https://developers.cloudflare.com/d1/
- **Pages**: https://developers.cloudflare.com/pages/
- **Wrangler**: https://developers.cloudflare.com/workers/wrangler/

### Your Services
- **Frontend**: `https://erpnext-coagent-ui.pages.dev`
- **Gateway**: `https://erpnext-agent-gateway.workers.dev`
- **Workflows**: `https://erpnext-workflows.onrender.com`

---

**Status**: Ready to deploy! 🚀
**Cost**: $0/month (100% free tier)
**Next**: Run the deployment commands above

*Everything is configured for Cloudflare free tier!* 🎉
