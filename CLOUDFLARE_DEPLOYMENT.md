# 🚀 Cloudflare Workers Deployment Guide

**Platform**: Cloudflare Workers + Pages  
**CLI Tool**: Wrangler (v4.40.3+)  
**Package Manager**: pnpm

---

## 📋 Prerequisites

1. **Cloudflare Account**
   - Sign up at https://dash.cloudflare.com/
   - Get your Account ID from dashboard

2. **Wrangler CLI** (Already installed ✅)
   ```bash
   pnpm dlx wrangler --version  # Should show 4.40.3+
   ```

3. **API Tokens**
   - Anthropic API key (from console.anthropic.com)
   - ERPNext API credentials

---

## 🔐 Step 1: Authenticate Wrangler

```bash
# Login to Cloudflare
pnpm dlx wrangler login

# This will open your browser for authentication
```

---

## 📦 Step 2: Create Storage Resources

### KV Namespaces (for session & state storage)

```bash
# Session storage for Agent Gateway
cd services/agent-gateway
pnpm dlx wrangler kv:namespace create SESSIONS

# Output: Copy the ID and update wrangler.toml
# id = "abc123..."

# Workflow state storage
cd ../workflows
pnpm dlx wrangler kv:namespace create WORKFLOW_STATE

# Output: Copy the ID and update wrangler.toml
```

### R2 Bucket (for generated apps)

```bash
cd ../generator
pnpm dlx wrangler r2 bucket create erpnext-generated-apps

# Output: Bucket created successfully
```

---

## 🔑 Step 3: Set Secrets

### Agent Gateway Secrets

```bash
cd services/agent-gateway

# Set Anthropic API key
pnpm dlx wrangler secret put ANTHROPIC_API_KEY
# Paste your key when prompted

# Set ERPNext credentials
pnpm dlx wrangler secret put ERPNEXT_API_KEY
pnpm dlx wrangler secret put ERPNEXT_API_SECRET
pnpm dlx wrangler secret put ERPNEXT_BASE_URL
# Example: https://your-erpnext-instance.com
```

### Workflows Service Secrets

```bash
cd ../workflows

pnpm dlx wrangler secret put ANTHROPIC_API_KEY
pnpm dlx wrangler secret put ERPNEXT_API_KEY
pnpm dlx wrangler secret put ERPNEXT_API_SECRET
pnpm dlx wrangler secret put ERPNEXT_BASE_URL
```

### Generator Service Secrets

```bash
cd ../generator

pnpm dlx wrangler secret put ANTHROPIC_API_KEY
pnpm dlx wrangler secret put ERPNEXT_API_URL
```

---

## 🚀 Step 4: Deploy Services

### 1. Deploy Agent Gateway

```bash
cd services/agent-gateway

# Install dependencies
npm install

# Deploy to Cloudflare Workers
pnpm dlx wrangler deploy

# Output:
# ✅ Deployed to: https://erpnext-agent-gateway.workers.dev
```

### 2. Deploy Workflows Service

```bash
cd ../workflows

# Install dependencies
export PATH="$HOME/.local/bin:$PATH"
poetry install

# Deploy to Cloudflare Workers
pnpm dlx wrangler deploy

# Output:
# ✅ Deployed to: https://erpnext-workflows.workers.dev
```

### 3. Deploy Generator Service

```bash
cd ../generator

# Install dependencies
poetry install

# Deploy to Cloudflare Workers
pnpm dlx wrangler deploy

# Output:
# ✅ Deployed to: https://erpnext-generator.workers.dev
```

### 4. Deploy Frontend (Cloudflare Pages)

```bash
cd ../../frontend/coagent

# Update wrangler.toml with your Agent Gateway URL
# VITE_GATEWAY_URL = "https://erpnext-agent-gateway.workers.dev"

# Install dependencies
npm install

# Deploy to Cloudflare Pages
pnpm dlx wrangler pages deploy dist

# Output:
# ✅ Deployed to: https://erpnext-coagent-ui.pages.dev
```

---

## 🧪 Step 5: Test Deployment

### Test Agent Gateway

```bash
curl https://erpnext-agent-gateway.workers.dev/health

# Expected: {"status":"ok","service":"agent-gateway",...}
```

### Test Workflows Service

```bash
curl https://erpnext-workflows.workers.dev/health

# Expected: {"status":"ok","service":"workflows",...}
```

### Test Generator Service

```bash
curl https://erpnext-generator.workers.dev/health

# Expected: {"status":"ok","service":"generator",...}
```

### Test Frontend

```bash
open https://erpnext-coagent-ui.pages.dev
```

---

## 📊 Monitor & Manage

### View Logs (Real-time)

```bash
# Agent Gateway logs
cd services/agent-gateway
pnpm dlx wrangler tail

# Workflows logs
cd ../workflows
pnpm dlx wrangler tail

# Generator logs
cd ../generator
pnpm dlx wrangler tail
```

### View Deployment Info

```bash
pnpm dlx wrangler deployments list
```

### Rollback Deployment

```bash
pnpm dlx wrangler rollback
```

---

## 🔄 Development Workflow

### Local Development

```bash
# Agent Gateway
cd services/agent-gateway
pnpm dlx wrangler dev --port 3000

# Workflows
cd services/workflows
pnpm dlx wrangler dev --port 8000

# Generator
cd services/generator
pnpm dlx wrangler dev --port 8001

# Frontend
cd frontend/coagent
npm run dev
```

### Deploy Updates

```bash
# After making changes, deploy again
cd services/agent-gateway
pnpm dlx wrangler deploy

# Repeat for other services
```

---

## 🛠️ Troubleshooting

### Error: "Invalid API token"
```bash
# Re-authenticate
pnpm dlx wrangler login
```

### Error: "KV namespace not found"
```bash
# Create the namespace and update wrangler.toml with the ID
pnpm dlx wrangler kv:namespace create SESSIONS
```

### Error: "Build failed"
```bash
# Make sure dependencies are installed
npm install  # or poetry install
npm run build  # Test build locally
```

### Check Cloudflare Dashboard
- Go to https://dash.cloudflare.com
- Navigate to Workers & Pages
- View logs, metrics, and deployment status

---

## 💰 Pricing (as of 2024)

**Cloudflare Workers:**
- Free tier: 100,000 requests/day
- Paid plan: $5/month for 10 million requests

**KV Storage:**
- Free tier: 100,000 reads/day, 1,000 writes/day
- 1 GB storage included

**R2 Storage:**
- Free tier: 10 GB storage, 1 million Class A operations
- No egress fees ✨

**Pages:**
- Free tier: Unlimited requests
- 500 builds/month

---

## 🎯 Next Steps

1. **Configure Custom Domain**
   ```bash
   pnpm dlx wrangler domains add example.com
   ```

2. **Set Up CI/CD**
   - Add GitHub Actions workflow
   - Auto-deploy on push to main branch

3. **Enable Analytics**
   - View in Cloudflare dashboard
   - Set up alerts for errors

4. **Scale Settings**
   ```toml
   # In wrangler.toml
   [limits]
   cpu_ms = 50  # Increase for complex operations
   ```

---

## 📚 Useful Commands

```bash
# List all workers
pnpm dlx wrangler list

# View worker details
pnpm dlx wrangler info

# Delete worker
pnpm dlx wrangler delete

# View KV namespaces
pnpm dlx wrangler kv:namespace list

# View R2 buckets
pnpm dlx wrangler r2 bucket list

# Update secret
pnpm dlx wrangler secret put SECRET_NAME

# List secrets
pnpm dlx wrangler secret list
```

---

## 🔗 Resources

- **Wrangler Docs**: https://developers.cloudflare.com/workers/wrangler/
- **Workers Docs**: https://developers.cloudflare.com/workers/
- **Pages Docs**: https://developers.cloudflare.com/pages/
- **KV Docs**: https://developers.cloudflare.com/kv/
- **R2 Docs**: https://developers.cloudflare.com/r2/

---

**Ready to deploy!** 🚀

Start with Step 1 (Authentication), then follow the steps in order.
