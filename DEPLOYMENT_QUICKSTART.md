# 🚀 Deployment Quick Start

**Platform**: Cloudflare Workers (Agent Gateway) + Render (Workflow Service)
**Time**: ~15 minutes
**Cost**: Free tier

---

## ⚡ 3-Step Deployment

### Step 1: Deploy Workflow Service to Render (5 min)

1. **Go to Render**: https://dashboard.render.com
2. **New Web Service** → Connect GitHub repo
3. **Select Directory**: `services/workflows`
4. **Auto-detected**: `render.yaml` ✅
5. **Environment Variables**:
   - `ANTHROPIC_API_KEY` = `sk-ant-...`
6. **Deploy** (takes ~3 minutes)
7. **Copy URL**: `https://erpnext-workflows.onrender.com`

---

### Step 2: Deploy Agent Gateway to Cloudflare (5 min)

```bash
cd services/agent-gateway

# 1. Login to Cloudflare
pnpm dlx wrangler login

# 2. Set secrets
pnpm dlx wrangler secret put ANTHROPIC_API_KEY
# Enter: sk-ant-...

pnpm dlx wrangler secret put WORKFLOW_SERVICE_URL
# Enter: https://erpnext-workflows.onrender.com

# 3. Deploy
pnpm dlx wrangler deploy

# Output: ✅ https://erpnext-agent-gateway.workers.dev
```

---

### Step 3: Deploy Frontend to Cloudflare Pages (5 min)

```bash
cd frontend/coagent

# 1. Login (first time only)
npx wrangler login

# 2. Install deps and build
npm install
npm run build

# 3. Deploy to Pages
npx wrangler pages deploy dist --project-name=erpnext-coagent-ui

# Output: ✅ https://erpnext-coagent-ui.pages.dev
```

> **Tip:** Run `scripts/update-openrouter-model.sh --model mistralai/mistral-7b-instruct --cloudflare` before deploying if you change models locally. It keeps Cloudflare secrets in sync.

### Step 4: Test (2 min)

```bash
# Test workflow service
curl https://erpnext-workflows.onrender.com/

# Test agent gateway
curl https://erpnext-agent-gateway.workers.dev/health

# Test frontend (Pages)
curl -I https://erpnext-coagent-ui.pages.dev

# Test end-to-end via gateway
curl -X POST https://erpnext-agent-gateway.workers.dev/api/chat \
  -H "Content-Type: application/json" \
  -d '{"message": "Check in guest John Doe for room 101"}'
```

✅ **Done!** Your services are live.

---

## 🧪 Local Testing First

Before deploying, test locally:

```bash
# Terminal 1: Workflow service (FastAPI)
cd services/workflows
poetry install
poetry run uvicorn src.main:app --reload --port 8000

# Terminal 2: Agent gateway (Cloudflare Worker shim)
cd services/agent-gateway
npm install
npm run dev
# → http://localhost:3000

# Terminal 3: Frontend (Next.js)
cd frontend/coagent
npm install
npm run dev
# → http://localhost:3000 (CopilotKit UI)

# Terminal 4: End-to-end smoke test
curl -s -X POST http://localhost:3000/api/copilotkit \
  -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}]}' | jq .
```

> Switch OpenRouter models locally with `scripts/update-openrouter-model.sh --model mistralai/mistral-7b-instruct`. Add `--cloudflare` to update the deployed secrets too.

---

## 🔑 Required Secrets

### For Workflow Service (Render)
- `ANTHROPIC_API_KEY` - Get from console.anthropic.com

### For Agent Gateway (Cloudflare)
- `ANTHROPIC_API_KEY` - Same as above
- `WORKFLOW_SERVICE_URL` - Your Render URL
- `OPENROUTER_MODEL` / `OPENROUTER_HTTP_REFERER` / `OPENROUTER_APP_TITLE` (sync with script)

---

## 📊 Service URLs After Deployment

```
Workflow Service: https://erpnext-workflows.onrender.com
Agent Gateway:    https://erpnext-agent-gateway.workers.dev
Frontend:         https://erpnext-coagent-ui.pages.dev (optional)
```

---

## 🐛 Troubleshooting

### "Workflow service not responding"
```bash
# Check if Render service is awake (free tier sleeps after 15 min)
curl https://erpnext-workflows.onrender.com/
# Wait ~30 seconds for cold start
```

### "ANTHROPIC_API_KEY not set"
```bash
# Verify secrets in Cloudflare
pnpm dlx wrangler secret list

# Verify env vars in Render
# Dashboard → Service → Environment → Check ANTHROPIC_API_KEY
```

### "Connection refused"
```bash
# Verify WORKFLOW_SERVICE_URL is correct
pnpm dlx wrangler secret list | grep WORKFLOW_SERVICE_URL
# Should show: https://erpnext-workflows.onrender.com (no trailing slash)
```

---

## 🎯 Next Steps After Deployment

1. ✅ Services deployed and tested
2. ✅ Deploy frontend to Cloudflare Pages
3. ⏳ Add custom domain
4. ⏳ Set up monitoring
5. ⏳ Add PostgreSQL for production persistence
6. ⏳ Push changes to GitHub

## 📤 Git Push Checklist

```bash
# 1. Make sure tests pass
pnpm run lint        # TypeScript services
poetry run pytest    # Python services

# 2. Commit your work
git status
git add .
git commit -m "feat: update OpenRouter model config"

# 3. Push to GitHub
git push origin feature/frontend-copilotkit-integration
```

Open a PR against `001-erpnext-coagents-mvp` and include deployed URLs (Workers + Pages) in the description.

---

## 💰 Costs

| Service | Tier | Monthly Cost |
|---------|------|--------------|
| Render (Workflow Service) | Free | $0 (750 hrs) |
| Cloudflare Workers (Agent Gateway) | Free | $0 (100k req/day) |
| Cloudflare Pages (Frontend) | Free | $0 (unlimited) |
| **Total** | | **$0/month** |

---

## 📞 Support

- **Render Docs**: https://render.com/docs
- **Cloudflare Workers**: https://developers.cloudflare.com/workers/
- **Wrangler CLI**: https://developers.cloudflare.com/workers/wrangler/

---

**Ready to deploy?** Start with Step 1! 🚀
