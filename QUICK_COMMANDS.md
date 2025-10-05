# 🎯 Quick Integration Commands

## Authentication
```bash
# Login to Cloudflare
pnpm dlx wrangler login

# Check who you are
pnpm dlx wrangler whoami
```

## Setup Resources (One-time)
```bash
# Create all KV namespaces and R2 buckets
./setup-cloudflare-resources.sh

# Set API secrets
cd services/agent-gateway
pnpm dlx wrangler secret put OPENROUTER_API_KEY
pnpm dlx wrangler secret put OPENROUTER_MODEL
pnpm dlx wrangler secret put OPENROUTER_BASE_URL
pnpm dlx wrangler secret put ERPNEXT_BASE_URL
pnpm dlx wrangler secret put ERPNEXT_API_KEY
pnpm dlx wrangler secret put ERPNEXT_API_SECRET
```

## Deploy
```bash
# Deploy all services
./deploy-free.sh

# Or deploy individually:
cd services/agent-gateway && pnpm dlx wrangler deploy
cd frontend/coagent && npm run build && pnpm dlx wrangler pages deploy dist
```

## Monitor
```bash
# Real-time logs
pnpm dlx wrangler tail erpnext-agent-gateway

# List deployments
pnpm dlx wrangler deployments list

# View KV data
pnpm dlx wrangler kv:key list --binding=SESSIONS
```

## Test
```bash
# Health check
curl https://erpnext-agent-gateway.workers.dev/health

# Test API
curl -X POST https://erpnext-agent-gateway.workers.dev/agui \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer test" \
  -d '{"user_id":"test@example.com","message":"hello"}'
```

## Local Development
```bash
# Agent Gateway
cd services/agent-gateway
pnpm dlx wrangler dev --port 3000

# Frontend
cd frontend/coagent
npm run dev
```

## Manage Resources
```bash
# List KV namespaces
pnpm dlx wrangler kv:namespace list

# List R2 buckets
pnpm dlx wrangler r2 bucket list

# View secrets
pnpm dlx wrangler secret list
```

## Rollback
```bash
# List versions
pnpm dlx wrangler deployments list

# Rollback to previous
pnpm dlx wrangler rollback [version-id]
```

## Clean Up
```bash
# Delete worker
pnpm dlx wrangler delete erpnext-agent-gateway

# Delete KV namespace
pnpm dlx wrangler kv:namespace delete --namespace-id=xxx

# Delete R2 bucket
pnpm dlx wrangler r2 bucket delete erpnext-generated-apps
```
