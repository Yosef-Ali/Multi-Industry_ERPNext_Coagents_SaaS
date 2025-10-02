# 🚀 Quick Access - ERPNext CoAgents Platform

**Status**: ✅ LIVE | **Cost**: $0/month | **Updated**: 2025-10-02

---

## 🔗 Live URLs

### Frontend (User Interface)
```
https://9e368f40.erpnext-coagent-ui.pages.dev
```
**Use this** to access the chat interface.

### Agent Gateway (API)
```
https://erpnext-agent-gateway.dev-yosefali.workers.dev
```
**Health Check**: https://erpnext-agent-gateway.dev-yosefali.workers.dev/health

---

## 🎛️ Cloudflare Dashboard

**Account**: dev.yosefali@gmail.com
**Dashboard**: https://dash.cloudflare.com/5a34e22d045e4ff3538a636317a631e8

**Quick Links**:
- Workers: https://dash.cloudflare.com/5a34e22d045e4ff3538a636317a631e8/workers
- Pages: https://dash.cloudflare.com/5a34e22d045e4ff3538a636317a631e8/pages
- D1: https://dash.cloudflare.com/5a34e22d045e4ff3538a636317a631e8/d1
- KV: https://dash.cloudflare.com/5a34e22d045e4ff3538a636317a631e8/kv

---

## 🔑 Resource IDs

### KV Namespaces
- **SESSIONS**: `eec1ac4c36d14839a7574b41c0ffa339`
- **WORKFLOW_STATE**: `3733a35d182d4f58872db5f46c73aba5`

### D1 Database
- **Name**: `erpnext-workflows-db`
- **ID**: `438122c1-fe33-446c-a222-4bb3cfeb8fa5`
- **Region**: WEUR

---

## ⚡ Quick Commands

### Redeploy Agent Gateway
```bash
cd services/agent-gateway
npm run build
npx wrangler@latest deploy
```

### Redeploy Frontend
```bash
cd frontend/coagent
npx vite build
npx wrangler@latest pages deploy dist --project-name=erpnext-coagent-ui --commit-dirty=true
```

### View Worker Logs
```bash
cd services/agent-gateway
npx wrangler@latest tail
```

### Query D1 Database
```bash
cd services/agent-gateway
npx wrangler@latest d1 execute erpnext-workflows-db --remote \
  --command="SELECT * FROM workflow_executions LIMIT 5"
```

### Update Secrets
```bash
cd services/agent-gateway
npx wrangler@latest secret put SECRET_NAME
```

---

## 📊 Current Configuration

### Agent Gateway Secrets
- ✅ OPENROUTER_API_KEY - Configured
- ✅ OPENROUTER_MODEL - zhipu/glm-4-9b-chat
- ✅ OPENROUTER_BASE_URL - https://openrouter.ai/api/v1
- ✅ WORKFLOW_SERVICE_URL - https://erpnext-workflows.onrender.com
- ✅ USE_MOCK_ERPNEXT - false

### Frontend Environment
- ✅ VITE_GATEWAY_URL - https://erpnext-agent-gateway.dev-yosefali.workers.dev

---

## 📖 Documentation

- **Complete Guide**: `DEPLOYMENT_COMPLETE.md`
- **Secrets Setup**: `DEPLOYMENT_SECRETS_GUIDE.md`
- **Quick Deploy**: `DEPLOY_NOW.md`
- **Resource Info**: `DEPLOYMENT_INFO.txt`

---

## 🧪 Quick Test

```bash
# Test gateway health
curl https://erpnext-agent-gateway.dev-yosefali.workers.dev/health

# Expected response
{
  "status": "healthy",
  "service": "erpnext-agent-gateway",
  "version": "1.0.0",
  "openrouter": {
    "configured": true,
    "model": "zhipu/glm-4-9b-chat"
  }
}
```

---

## 🎯 Next Steps (Optional)

1. **Deploy Python Workflows** (Render): Enable LangGraph workflows with approval gates
2. **Connect ERPNext**: Link to real ERPNext instance (currently using mock mode)
3. **Add Custom Domain**: Configure custom domain for frontend

---

**Everything is live and working! 🎉**
