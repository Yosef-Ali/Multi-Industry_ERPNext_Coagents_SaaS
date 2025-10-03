# 🎯 Cloudflare Deployment - Quick Reference

## 📊 Your Resources

```
Account ID: 5a34e22d045e4ff3538a636317a631e8
```

### Workers
- ✅ erpnext-agent-gateway
- ✅ erpnext-coagent-ui

### KV Namespaces
- ✅ SESSIONS (eec1ac4c36d14839a7574b41c0ffa339)
- ✅ WORKFLOW_STATE (3733a35d182d4f58872db5f46c73aba5)

### D1 Database
- ✅ erpnext-workflows-db (438122c1-fe33-446c-a222-4bb3cfeb8fa5)

## 🚀 Deployment Commands

```bash
# Deploy everything
./deploy-with-mcp.sh

# Deploy only Agent Gateway
cd services/agent-gateway && pnpm dlx wrangler deploy

# Deploy only Frontend
cd frontend/coagent && pnpm dlx wrangler pages deploy dist --project-name=erpnext-coagent-ui

# Rollback if needed
cd services/agent-gateway && pnpm dlx wrangler rollback
```

## 🔍 Monitoring

```bash
# Real-time logs
cd services/agent-gateway
pnpm dlx wrangler tail erpnext-agent-gateway --format pretty

# Health check
curl https://erpnext-agent-gateway.workers.dev/health | jq

# Check deployment status
pnpm dlx wrangler deployments list
```

## 🔑 Secret Management

```bash
# List secrets
cd services/agent-gateway
pnpm dlx wrangler secret list

# Set secret
echo "value" | pnpm dlx wrangler secret put SECRET_NAME

# Delete secret
pnpm dlx wrangler secret delete SECRET_NAME
```

## 📈 Analytics

Visit: https://dash.cloudflare.com/5a34e22d045e4ff3538a636317a631e8/workers-and-pages

- **Requests/day**: Monitor usage
- **CPU time**: Check performance
- **Errors**: Track issues
- **Logs**: Debug problems

## 🔧 Common Tasks

### Update OpenRouter Model
```bash
cd services/agent-gateway
echo "anthropic/claude-sonnet-4-5" | pnpm dlx wrangler secret put OPENROUTER_MODEL
```

### Enable Real ERPNext
```bash
cd services/agent-gateway
echo "your-api-key" | pnpm dlx wrangler secret put ERPNEXT_API_KEY
echo "your-secret" | pnpm dlx wrangler secret put ERPNEXT_API_SECRET
echo "https://your-erpnext.com" | pnpm dlx wrangler secret put ERPNEXT_BASE_URL
echo "false" | pnpm dlx wrangler secret put USE_MOCK_ERPNEXT
```

### View KV Data
```bash
# List keys in SESSIONS namespace
pnpm dlx wrangler kv:key list --namespace-id=eec1ac4c36d14839a7574b41c0ffa339

# Get specific key
pnpm dlx wrangler kv:key get "session-id" --namespace-id=eec1ac4c36d14839a7574b41c0ffa339
```

### Query D1 Database
```bash
# List tables
pnpm dlx wrangler d1 execute erpnext-workflows-db --command="SELECT name FROM sqlite_master WHERE type='table';"

# Query data
pnpm dlx wrangler d1 execute erpnext-workflows-db --command="SELECT * FROM your_table LIMIT 10;"
```

## 🐛 Troubleshooting

### Deployment Failed
1. Check build: `cd services/agent-gateway && pnpm run build`
2. Check auth: `pnpm dlx wrangler whoami`
3. Check logs: `pnpm dlx wrangler tail erpnext-agent-gateway`

### 500 Errors
1. Check secrets are set: `pnpm dlx wrangler secret list`
2. View error logs: `pnpm dlx wrangler tail erpnext-agent-gateway`
3. Verify KV bindings in `wrangler.toml`

### Frontend Not Loading
1. Check build: `cd frontend/coagent && ls dist/`
2. Verify VITE_GATEWAY_URL in `.env.production`
3. Redeploy: `pnpm dlx wrangler pages deploy dist --project-name=erpnext-coagent-ui`

## 📱 Mobile Testing

```bash
# Get your local network IP
ipconfig getifaddr en0  # macOS
# or
hostname -I  # Linux

# Update frontend .env.local
VITE_GATEWAY_URL=http://YOUR_IP:3000

# Test locally first
cd services/agent-gateway && pnpm run dev
cd frontend/coagent && pnpm run dev
```

## 🎯 Production Checklist

- [ ] OpenRouter API key set
- [ ] ERPNext credentials configured (or mock mode enabled)
- [ ] Frontend .env.production points to deployed gateway
- [ ] Health check passes
- [ ] Logs show no errors
- [ ] Frontend loads and connects to gateway
- [ ] Test a simple chat interaction
- [ ] Monitor for 24 hours

## 📊 Performance Targets

- **Health check**: < 200ms
- **First token**: < 400ms (streaming)
- **Tool execution**: < 1.8s (read) / < 2.5s (write)
- **Error rate**: < 1%

---

**Quick Deploy**: `./deploy-with-mcp.sh`
**Monitor**: `pnpm dlx wrangler tail erpnext-agent-gateway`
**Dashboard**: https://dash.cloudflare.com
