# 🚀 Deploy Now - Complete Guide

**Status**: ✅ Cloudflare resources ready | ⏳ Secrets + Deployment pending

---

## 📋 What's Already Done

✅ **Cloudflare Login**: dev.yosefali@gmail.com
✅ **KV Namespaces Created**:
- SESSIONS: `eec1ac4c36d14839a7574b41c0ffa339`
- WORKFLOW_STATE: `3733a35d182d4f58872db5f46c73aba5`

✅ **D1 Database Created**:
- Name: `erpnext-workflows-db`
- ID: `438122c1-fe33-446c-a222-4bb3cfeb8fa5`
- Schema: Initialized with 7 tables

✅ **Configuration Updated**:
- `services/agent-gateway/wrangler.toml` - All resource IDs added

---

## 🎯 Next Steps (15 minutes)

### Step 1: Set Secrets (5 min)

You need to set 5 secrets. I've created a helper script:

```bash
# Run this from project root
./SET_SECRETS.sh
```

**Or manually** (if you prefer):

```bash
cd services/agent-gateway

# 1. OpenRouter API Key (from your .env file)
npx wrangler@latest secret put OPENROUTER_API_KEY
# When prompted, paste: sk-or-v1-xxxxxxxxxxxxx

# 2. OpenRouter Model
npx wrangler@latest secret put OPENROUTER_MODEL
# When prompted, enter: zhipu/glm-4-9b-chat

# 3. OpenRouter Base URL
npx wrangler@latest secret put OPENROUTER_BASE_URL
# When prompted, enter: https://openrouter.ai/api/v1

# 4. Workflow Service URL
npx wrangler@latest secret put WORKFLOW_SERVICE_URL
# When prompted, enter: https://erpnext-workflows.onrender.com
# (Or use your actual Render URL if you've deployed already)

# 5. Enable Mock Mode (no ERPNext needed for testing)
npx wrangler@latest secret put USE_MOCK_ERPNEXT
# When prompted, enter: true
```

**Note**: Each secret prompt requires you to enter the value and press Enter.

---

### Step 2: Deploy Agent Gateway (5 min)

```bash
cd services/agent-gateway

# Install dependencies (if needed)
npm install

# Build TypeScript
npm run build

# Deploy to Cloudflare Workers
npx wrangler@latest deploy

# Expected output:
# ✅ https://erpnext-agent-gateway.XXXX.workers.dev
```

**Save the Worker URL** - you'll need it for the frontend.

---

### Step 3: Deploy Frontend (5 min)

```bash
cd ../../frontend/coagent

# Install dependencies (if needed)
npm install

# Create production environment file
cat > .env.production << EOF
VITE_GATEWAY_URL=https://your-gateway-url.workers.dev
EOF

# Update with YOUR actual gateway URL from Step 2!

# Build React app
npm run build

# Deploy to Cloudflare Pages
npx wrangler@latest pages deploy dist --project-name=erpnext-coagent-ui

# Expected output:
# ✅ https://erpnext-coagent-ui.pages.dev
```

---

### Step 4: Test (Optional - 2 min)

```bash
# Test agent gateway health
curl https://your-gateway.workers.dev/health

# Expected: {"status": "ok", ...}

# Test frontend
open https://erpnext-coagent-ui.pages.dev

# Try chat: "Check in guest John Doe for room 101"
# Expected: Approval dialog appears in UI
```

---

## 🔄 Deploy Workflow Service to Render (Optional - 10 min)

If you want real Python workflows (not just mock mode):

### Option A: Web Dashboard (Easiest)

1. Go to: https://dashboard.render.com
2. Click **"New +"** → **"Web Service"**
3. Connect your GitHub repository
4. Select directory: `services/workflows`
5. Render auto-detects `render.yaml` ✅
6. Add environment variable:
   - Key: `OPENROUTER_API_KEY`
   - Value: (your OpenRouter key)
7. Click **"Create Web Service"**
8. Wait 3-5 minutes for deployment
9. Copy URL: `https://erpnext-workflows-XXXX.onrender.com`

### Option B: Render CLI

```bash
# Install Render CLI
npm install -g @renderinc/cli

# Login
render login

# Deploy
cd services/workflows
render deploy

# Get URL
render services list
```

### Update Agent Gateway

After deploying to Render:

```bash
cd services/agent-gateway

# Update workflow service URL
npx wrangler@latest secret put WORKFLOW_SERVICE_URL
# Enter: https://your-actual-render-url.onrender.com

# Redeploy
npx wrangler@latest deploy
```

---

## 📊 What You'll Have After Deployment

```
✅ Frontend:        https://erpnext-coagent-ui.pages.dev
✅ Agent Gateway:   https://erpnext-agent-gateway.XXXX.workers.dev
✅ Workflows:       https://erpnext-workflows.onrender.com (if deployed)
✅ Database:        Cloudflare D1 (erpnext-workflows-db)
✅ Sessions:        Cloudflare KV (SESSIONS + WORKFLOW_STATE)
```

**Total Cost**: $0/month 🎉

---

## 🐛 Troubleshooting

### Issue: "Worker not found" when setting secrets

**Fix**: This is normal before first deployment. Set secrets first, then deploy.

### Issue: Build fails with TypeScript errors

```bash
cd services/agent-gateway
npm install --force
npm run build
```

### Issue: Pages deployment asks for project name

```bash
# Use exact name
npx wrangler@latest pages deploy dist --project-name=erpnext-coagent-ui
```

### Issue: Secrets not taking effect

```bash
# Verify secrets are set
npx wrangler@latest secret list

# Redeploy to apply
npx wrangler@latest deploy
```

---

## ✅ Quick Deploy Checklist

- [ ] Run `./SET_SECRETS.sh` (or set 5 secrets manually)
- [ ] Deploy agent gateway: `cd services/agent-gateway && npm run build && npx wrangler@latest deploy`
- [ ] Note gateway URL
- [ ] Update frontend .env.production with gateway URL
- [ ] Deploy frontend: `cd frontend/coagent && npm run build && npx wrangler@latest pages deploy dist`
- [ ] Test: Visit frontend URL and try a chat
- [ ] (Optional) Deploy workflows to Render
- [ ] (Optional) Update WORKFLOW_SERVICE_URL secret with Render URL

---

## 📞 Support

**Documentation**:
- Complete guide: `DEPLOYMENT_SECRETS_GUIDE.md`
- Free tier details: `CLOUDFLARE_FREE_TIER_DEPLOY.md`
- Resource info: `DEPLOYMENT_INFO.txt`

**Cloudflare Dashboard**: https://dash.cloudflare.com/5a34e22d045e4ff3538a636317a631e8

---

## 🎯 Start Now

**Fastest path** (use mock mode for testing):

```bash
# 1. Set secrets (interactive - 5 min)
./SET_SECRETS.sh

# 2. Deploy everything (10 min)
cd services/agent-gateway && npm run build && npx wrangler@latest deploy
cd ../../frontend/coagent && npm run build && npx wrangler@latest pages deploy dist --project-name=erpnext-coagent-ui

# 3. Test!
# Visit the Pages URL and chat with "Check in guest John Doe"
```

**Ready to deploy! 🚀**
