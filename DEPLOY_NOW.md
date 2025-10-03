# 🚀 Quick Cloudflare Deployment

## Prerequisites ✅

Your Cloudflare resources are already set up:
- ✅ Account: `5a34e22d045e4ff3538a636317a631e8`
- ✅ Workers: `erpnext-agent-gateway`, `erpnext-coagent-ui`
- ✅ KV Namespaces: `SESSIONS`, `WORKFLOW_STATE`
- ✅ D1 Database: `erpnext-workflows-db`
- ✅ OpenRouter API Key: Configured in `.env`

## 🎯 One-Command Deploy

```bash
cd /Users/mekdesyared/Multi-Industry_ERPNext_Coagents_SaaS
./deploy-with-mcp.sh
```

This script will:
1. ✅ Load environment variables from `.env`
2. ✅ Set Cloudflare secrets automatically
3. ✅ Build Agent Gateway (TypeScript → JavaScript)
4. ✅ Deploy Agent Gateway to Cloudflare Workers
5. ✅ Build Frontend (React → Static files)
6. ✅ Deploy Frontend to Cloudflare Pages
7. ✅ Verify deployment health

## 📊 After Deployment

### Your Live URLs:
- **Agent Gateway**: https://erpnext-agent-gateway.workers.dev
- **Frontend**: https://erpnext-coagent-ui.pages.dev

### Verify Health:
```bash
curl https://erpnext-agent-gateway.workers.dev/health
```

Expected response:
```json
{
  "status": "healthy",
  "openrouter": {
    "configured": true,
    "model": "zhipu/glm-4-9b-chat"
  }
}
```

### Monitor Logs:
```bash
cd services/agent-gateway
pnpm dlx wrangler tail erpnext-agent-gateway --format pretty
```

## 🔧 Manual Steps (if needed)

### Set Individual Secrets:
```bash
cd services/agent-gateway

# OpenRouter
echo "sk-or-v1-..." | pnpm dlx wrangler secret put OPENROUTER_API_KEY

# ERPNext (optional)
echo "your-key" | pnpm dlx wrangler secret put ERPNEXT_API_KEY
echo "your-secret" | pnpm dlx wrangler secret put ERPNEXT_API_SECRET
echo "https://your-erpnext.com" | pnpm dlx wrangler secret put ERPNEXT_BASE_URL

# Or use Mock Mode
echo "true" | pnpm dlx wrangler secret put USE_MOCK_ERPNEXT
```

### Deploy Only Agent Gateway:
```bash
cd services/agent-gateway
pnpm run build
pnpm dlx wrangler deploy
```

### Deploy Only Frontend:
```bash
cd frontend/coagent
pnpm run build
pnpm dlx wrangler pages deploy dist --project-name=erpnext-coagent-ui
```

## 🐛 Troubleshooting

### "OPENROUTER_API_KEY not found"
Check your `.env` file contains:
```bash
OPENROUTER_API_KEY=sk-or-v1-1b38cf67cd06...
```

### "Build failed"
Install dependencies:
```bash
cd services/agent-gateway
pnpm install
pnpm run build
```

### "Deployment error"
Check Wrangler is logged in:
```bash
pnpm dlx wrangler whoami
```

If not logged in:
```bash
pnpm dlx wrangler login
```

## 📈 Next Steps

1. **Test the deployment**: Visit your frontend URL
2. **Check logs**: `pnpm dlx wrangler tail erpnext-agent-gateway`
3. **Update tasks.md**: Mark deployment complete
4. **Configure ERPNext**: Add real ERPNext credentials or use mock mode

## 💡 Current Configuration

### AI Provider: OpenRouter
- **Model**: `zhipu/glm-4-9b-chat` (Cost-effective)
- **API Key**: Loaded from `.env`
- **Base URL**: `https://openrouter.ai/api/v1`

### ERPNext Mode: Mock (Default)
- **USE_MOCK_ERPNEXT**: `true`
- For real ERPNext, set credentials in secrets

### Free Tier Compatible: ✅
- OpenRouter has free credits
- Cloudflare Workers: 100k requests/day free
- Cloudflare Pages: Unlimited static requests
- KV: 100k reads/day free
- D1: 5M rows read/day free

---

**🎉 Ready to deploy? Run `./deploy-with-mcp.sh`**
