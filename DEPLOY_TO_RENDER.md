# 🚀 Deploy Agent Gateway to Render (10 minutes)

**Why**: Get the full AI agent working with OpenRouter integration

**Cost**: $0/month (750 free hours, auto-sleeps when inactive)

---

## 📋 Prerequisites

- ✅ GitHub repository (you already have this)
- ✅ Render account (free) - Sign up at https://dashboard.render.com
- ✅ OpenRouter API key (you already have this)

---

## 🎯 Deployment Steps

### Step 1: Go to Render Dashboard (2 min)

1. Visit: https://dashboard.render.com
2. Sign in or create free account
3. Click **"New +"** button (top right)
4. Select **"Web Service"**

### Step 2: Connect GitHub Repository (3 min)

1. Click **"Connect account"** if first time
2. Authorize Render to access your GitHub
3. Search for your repository: `Multi-Industry_ERPNext_Coagents_SaaS`
4. Click **"Connect"**

### Step 3: Configure Service (3 min)

Render will auto-detect most settings from `render.yaml`, but verify:

**Basic Settings**:
- **Name**: `erpnext-agent-gateway` (auto-filled)
- **Region**: Oregon (or closest to you)
- **Branch**: `feature/frontend-copilotkit-integration` (or your current branch)
- **Root Directory**: `services/agent-gateway`

**Build Settings** (auto-detected from render.yaml):
- **Build Command**: `npm install`
- **Start Command**: `npm start`

**Plan**:
- **Instance Type**: Free ✅ (750 hours/month)

### Step 4: Add Environment Variables (2 min)

The following are auto-configured from render.yaml:
- ✅ `NODE_ENV`: production
- ✅ `GATEWAY_PORT`: 10000
- ✅ `OPENROUTER_MODEL`: zhipu/glm-4-9b-chat
- ✅ `OPENROUTER_BASE_URL`: https://openrouter.ai/api/v1
- ✅ `USE_MOCK_ERPNEXT`: true
- ✅ `ALLOWED_ORIGINS`: (your frontend URL)

**You MUST add manually**:
1. Click **"Add Environment Variable"**
2. **Key**: `OPENROUTER_API_KEY`
3. **Value**: (paste your OpenRouter key from `.env` file)
   - Starts with `sk-or-v1-...`
4. Click **"Add"**

### Step 5: Deploy! (1 min)

1. Click **"Create Web Service"** button (bottom)
2. Render will start building and deploying
3. Wait 3-5 minutes (watch the logs)
4. You'll see: ✅ **"Your service is live"**

### Step 6: Copy Your Service URL

After deployment completes:
1. Copy the URL shown (e.g., `https://erpnext-agent-gateway-XXXX.onrender.com`)
2. Save it - you'll need it for the frontend

---

## 🧪 Test Your Deployed Service

### Test Health Endpoint
```bash
# Replace with your actual Render URL
curl https://erpnext-agent-gateway-XXXX.onrender.com/health
```

**Expected Response**:
```json
{
  "status": "healthy",
  "service": "erpnext-coagent-gateway",
  "version": "1.0.0-simplified",
  "environment": "development",
  "uptime": 5.123
}
```

### Test AG-UI Endpoint
```bash
# This should now work with real AI!
curl -X POST https://erpnext-agent-gateway-XXXX.onrender.com/agui \
  -H "Content-Type: application/json" \
  -d '{"message": "Hello, can you help me with ERPNext?"}'
```

**Expected**: You should see SSE stream events starting with:
```
data: {"type":"status","data":{"status":"connected"}}
```

---

## 🔄 Update Frontend to Use Render

### Step 1: Update Environment
```bash
cd frontend/coagent

# Update with YOUR Render URL
cat > .env.production << 'EOF'
VITE_GATEWAY_URL=https://erpnext-agent-gateway-XXXX.onrender.com
EOF
```

### Step 2: Rebuild and Redeploy
```bash
# Build
npx vite build

# Deploy to Cloudflare Pages
npx wrangler@latest pages deploy dist --project-name=erpnext-coagent-ui --commit-dirty=true
```

### Step 3: Get New Frontend URL
Wrangler will output a new deployment URL like:
```
✨ Deployment complete! https://abc123.erpnext-coagent-ui.pages.dev
```

---

## 🎉 Test End-to-End

1. **Visit your frontend**: https://abc123.erpnext-coagent-ui.pages.dev
2. **Type a message**: "Hello, can you help me check in a guest?"
3. **Expect**: AI response powered by OpenRouter!

---

## 📊 What You'll Have After This

```
┌─────────────────────────────────┐
│  Frontend (Cloudflare Pages)    │  ← User visits this
│  https://xxx.pages.dev          │
└───────────┬─────────────────────┘
            │
            ▼
┌─────────────────────────────────┐
│  Agent Gateway (Render)         │  ← Full AI agent with Express.js
│  https://xxx.onrender.com       │  ← OpenRouter integration
└───────────┬─────────────────────┘
            │
            ▼
┌─────────────────────────────────┐
│  OpenRouter API                 │  ← AI model (zhipu/glm-4-9b-chat)
│  (zhipu/glm-4-9b-chat)          │
└─────────────────────────────────┘
```

**Total Cost**: $0/month (all free tiers)

---

## ⚙️ Render Free Tier Details

**Limits**:
- ✅ 750 hours/month (enough for 24/7 if needed)
- ✅ Auto-sleeps after 15 minutes of inactivity
- ✅ Wakes up automatically on first request (~30 seconds)
- ✅ Custom domains supported (free)

**Good for**:
- ✅ Testing and MVP
- ✅ Demos
- ✅ Low-traffic apps

---

## 🐛 Troubleshooting

### Issue: Build Fails
**Check**:
- Does `package.json` exist in `services/agent-gateway`?
- Run `npm install` locally first to verify

**Fix**: Check build logs in Render dashboard

### Issue: Service Won't Start
**Check**:
- Is `OPENROUTER_API_KEY` set correctly?
- Check "Environment" tab in Render dashboard

**Fix**: Add missing environment variables

### Issue: CORS Errors in Frontend
**Check**:
- Is `ALLOWED_ORIGINS` set with your frontend URL?

**Fix**: Update `ALLOWED_ORIGINS` in Render dashboard:
```
https://9e368f40.erpnext-coagent-ui.pages.dev,http://localhost:5173
```

### Issue: Cold Start (First Request Slow)
**This is normal** - Render free tier sleeps after inactivity.
- First request: ~30 seconds (waking up)
- Subsequent requests: Fast!

---

## 📝 Summary

After deployment you'll have:
- ✅ Full AI agent working with OpenRouter
- ✅ Real conversations with streaming responses
- ✅ Tool execution capabilities
- ✅ Approval gates functional
- ✅ Complete end-to-end system

**Still 100% free tier!** 🎉

---

## 🎯 Alternative: Deploy via Render CLI (Optional)

If you prefer command line:

```bash
# Install Render CLI
npm install -g @renderinc/cli

# Login
render login

# Deploy
cd services/agent-gateway
render deploy

# Follow prompts and add OPENROUTER_API_KEY when asked
```

---

**Ready to deploy? Follow the steps above and you'll have a working AI agent in 10 minutes!** 🚀
