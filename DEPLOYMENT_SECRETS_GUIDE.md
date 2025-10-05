# 🔑 Deployment Secrets Configuration Guide

**For**: OpenRouter API + Open-Source ERPNext/Frappe
**Platform**: Cloudflare Workers
**Date**: 2025-10-02

---

## 📋 Overview

You're using:
- ✅ **OpenRouter API** (instead of Anthropic direct)
- ✅ **Open-source ERPNext/Frappe** (self-hosted)
- ✅ **Mock mode available** for testing

---

## 🔧 Required Secrets for Cloudflare Workers

### 1. OpenRouter API Configuration ✅

**You already have OpenRouter configured in `.env`:**
```bash
OPENROUTER_API_KEY=sk-or-v1-xxxxxxxxxxxxx
OPENROUTER_MODEL=zhipu/glm-4-9b-chat
OPENROUTER_BASE_URL=https://openrouter.ai/api/v1
```

**Set in Cloudflare Workers:**
```bash
cd services/agent-gateway

# OpenRouter API Key
npx wrangler@latest secret put OPENROUTER_API_KEY
# Paste your key from .env file (sk-or-v1-...)

# OpenRouter Model
npx wrangler@latest secret put OPENROUTER_MODEL
# Enter: zhipu/glm-4-9b-chat

# OpenRouter Base URL
npx wrangler@latest secret put OPENROUTER_BASE_URL
# Enter: https://openrouter.ai/api/v1
```

### 2. Workflow Service URL ✅

**For the Python workflow service:**
```bash
cd services/agent-gateway

# Workflow Service URL
npx wrangler@latest secret put WORKFLOW_SERVICE_URL
# Enter: https://erpnext-workflows.onrender.com
# (Or your actual Render URL after deploying)
```

### 3. ERPNext Configuration (3 Options)

#### **Option A: Mock Mode (No ERPNext Needed)** 🎯 RECOMMENDED FOR TESTING

```bash
cd services/agent-gateway

# Enable mock mode
npx wrangler@latest secret put USE_MOCK_ERPNEXT
# Enter: true

# No API keys needed!
```

**Use this when:**
- Testing without ERPNext instance
- Development/demo mode
- You don't have ERPNext set up yet

#### **Option B: ERPNext API Keys (Production)**

**First, generate API keys in ERPNext:**

1. **Login to ERPNext** as Administrator
2. Go to **User List** (search "User" in top bar)
3. Click on your user (e.g., `administrator@example.com`)
4. Scroll to **"API Access"** section
5. Click **"Generate Keys"** button
6. **IMPORTANT**: Copy the **API Secret** immediately (shown only once!)
7. Note the **API Key** (always visible after generation)

**Then set secrets:**
```bash
cd services/agent-gateway

# ERPNext Base URL
npx wrangler@latest secret put ERPNEXT_BASE_URL
# Enter: https://your-erpnext-instance.com
# Or for local: http://localhost:8080

# ERPNext API Key
npx wrangler@latest secret put ERPNEXT_API_KEY
# Paste the API Key from ERPNext

# ERPNext API Secret
npx wrangler@latest secret put ERPNEXT_API_SECRET
# Paste the API Secret (from step 6 above)

# Disable mock mode
npx wrangler@latest secret put USE_MOCK_ERPNEXT
# Enter: false
```

#### **Option C: ERPNext Guest Mode (Public APIs)**

If you created guest-accessible APIs in ERPNext:

```bash
cd services/agent-gateway

# ERPNext Base URL only
npx wrangler@latest secret put ERPNEXT_BASE_URL
# Enter: https://your-erpnext-instance.com

# No API keys needed for guest APIs
```

**Note**: This only works if you've created methods with `@frappe.whitelist(allow_guest=True)`

---

## 📝 Complete Command Sequence

### For Development/Testing (Mock Mode)

```bash
cd services/agent-gateway

# 1. OpenRouter API
npx wrangler@latest secret put OPENROUTER_API_KEY
# Paste: sk-or-v1-...

npx wrangler@latest secret put OPENROUTER_MODEL
# Enter: zhipu/glm-4-9b-chat

npx wrangler@latest secret put OPENROUTER_BASE_URL
# Enter: https://openrouter.ai/api/v1

# 2. Workflow Service URL
npx wrangler@latest secret put WORKFLOW_SERVICE_URL
# Enter: https://erpnext-workflows.onrender.com

# 3. Enable Mock Mode
npx wrangler@latest secret put USE_MOCK_ERPNEXT
# Enter: true

# Done! ✅
```

### For Production (With ERPNext)

```bash
cd services/agent-gateway

# 1. OpenRouter API (same as above)
npx wrangler@latest secret put OPENROUTER_API_KEY
# Paste: sk-or-v1-...

npx wrangler@latest secret put OPENROUTER_MODEL
# Enter: zhipu/glm-4-9b-chat

npx wrangler@latest secret put OPENROUTER_BASE_URL
# Enter: https://openrouter.ai/api/v1

# 2. Workflow Service URL (same as above)
npx wrangler@latest secret put WORKFLOW_SERVICE_URL
# Enter: https://erpnext-workflows.onrender.com

# 3. ERPNext Configuration
npx wrangler@latest secret put ERPNEXT_BASE_URL
# Enter: https://your-erpnext.com

npx wrangler@latest secret put ERPNEXT_API_KEY
# Paste: your_api_key_from_erpnext

npx wrangler@latest secret put ERPNEXT_API_SECRET
# Paste: your_api_secret_from_erpnext

npx wrangler@latest secret put USE_MOCK_ERPNEXT
# Enter: false

# Done! ✅
```

---

## 🔍 How to Get ERPNext API Keys

### Step-by-Step Visual Guide

```
1. Login to ERPNext
   ↓
2. Search "User" in top bar
   ↓
3. Click "User List"
   ↓
4. Click on your user (e.g., administrator@example.com)
   ↓
5. Scroll to "API Access" section
   ↓
6. Click "Generate Keys" button
   ↓
7. POPUP appears with API Secret
   ⚠️  COPY THIS IMMEDIATELY! (shown only once)
   ↓
8. API Key is now visible in "API Access" section
   ↓
9. Use both in Wrangler secrets
```

### Alternative: Command Line (if you have bench access)

```bash
# SSH into your ERPNext server
ssh user@your-server.com

# Navigate to bench directory
cd frappe-bench

# Generate keys for a user
bench execute frappe.core.doctype.user.user.generate_keys --args '["administrator@example.com"]'

# Output will show:
# api_key: xxxxx
# api_secret: yyyyy
```

---

## ✅ Verify Secrets Are Set

```bash
cd services/agent-gateway

# List all secrets (values are hidden for security)
npx wrangler@latest secret list

# Expected output:
# - OPENROUTER_API_KEY
# - OPENROUTER_MODEL
# - OPENROUTER_BASE_URL
# - WORKFLOW_SERVICE_URL
# - USE_MOCK_ERPNEXT (or ERPNEXT_API_KEY, ERPNEXT_API_SECRET)
```

---

## 🧪 Test Configuration

### Test OpenRouter Connection

```bash
# Test with your OpenRouter key
curl https://openrouter.ai/api/v1/models \
  -H "Authorization: Bearer sk-or-v1-your-key"

# Should return list of available models
```

### Test ERPNext Connection (if using real ERPNext)

```bash
# Replace with your actual values
ERPNEXT_URL="https://your-erpnext.com"
API_KEY="your_api_key"
API_SECRET="your_api_secret"

# Test authentication
curl "${ERPNEXT_URL}/api/method/frappe.auth.get_logged_user" \
  -H "Authorization: token ${API_KEY}:${API_SECRET}"

# Should return: {"message": "administrator@example.com"}
```

---

## 🔄 After Setting Secrets

### Update Code to Use OpenRouter (Already Done!)

Your project already has OpenRouter configured in:
- `services/agent-gateway/src/agent.ts`
- Environment variables in `.env.example`

**The code uses:**
```typescript
const anthropic = new Anthropic({
  apiKey: process.env.OPENROUTER_API_KEY,
  baseURL: process.env.OPENROUTER_BASE_URL,
});
```

This is **OpenRouter-compatible** because OpenRouter provides an Anthropic-compatible API! ✅

### Deploy with Updated Secrets

```bash
cd services/agent-gateway

# Build
npm run build

# Deploy (will use secrets from Cloudflare)
npx wrangler@latest deploy

# Output: ✅ https://erpnext-agent-gateway.XXXX.workers.dev
```

---

## 📊 Configuration Summary

| Secret | Value | Required | Notes |
|--------|-------|----------|-------|
| `OPENROUTER_API_KEY` | `sk-or-v1-...` | ✅ Yes | From OpenRouter dashboard |
| `OPENROUTER_MODEL` | `zhipu/glm-4-9b-chat` | ✅ Yes | Or any model from openrouter.ai/models |
| `OPENROUTER_BASE_URL` | `https://openrouter.ai/api/v1` | ✅ Yes | Fixed URL |
| `WORKFLOW_SERVICE_URL` | `https://...onrender.com` | ✅ Yes | After deploying workflows |
| `USE_MOCK_ERPNEXT` | `true` or `false` | ✅ Yes | `true` for testing |
| `ERPNEXT_BASE_URL` | `https://your-erpnext.com` | ⚠️ If not mock | Your ERPNext URL |
| `ERPNEXT_API_KEY` | From ERPNext UI | ⚠️ If not mock | Generate in ERPNext |
| `ERPNEXT_API_SECRET` | From ERPNext UI | ⚠️ If not mock | Shown only once! |

---

## 🎯 Recommended Path

### For Immediate Deployment (Recommended)

Use **Mock Mode** first to get everything deployed and working:

```bash
# Quick setup - 2 minutes
cd services/agent-gateway

npx wrangler@latest secret put OPENROUTER_API_KEY      # Your OpenRouter key
npx wrangler@latest secret put OPENROUTER_MODEL        # zhipu/glm-4-9b-chat
npx wrangler@latest secret put OPENROUTER_BASE_URL     # https://openrouter.ai/api/v1
npx wrangler@latest secret put WORKFLOW_SERVICE_URL    # Render URL
npx wrangler@latest secret put USE_MOCK_ERPNEXT        # true

# Deploy!
npm run build && npx wrangler@latest deploy
```

### Later: Connect Real ERPNext

When you're ready to connect real ERPNext:

```bash
# 1. Generate API keys in ERPNext (see guide above)
# 2. Update secrets
npx wrangler@latest secret put ERPNEXT_BASE_URL
npx wrangler@latest secret put ERPNEXT_API_KEY
npx wrangler@latest secret put ERPNEXT_API_SECRET
npx wrangler@latest secret put USE_MOCK_ERPNEXT  # false

# 3. Redeploy
npx wrangler@latest deploy
```

---

## 🔒 Security Best Practices

1. **Never commit API keys** to git
2. **API Secret shown only once** - save immediately
3. **Use different keys** for dev/staging/production
4. **Rotate keys regularly** (every 90 days)
5. **Limit API user permissions** in ERPNext (create dedicated API user)
6. **Monitor API usage** in OpenRouter dashboard

---

## 📞 Troubleshooting

### Issue: "OpenRouter API key invalid"
```bash
# Verify your key
curl https://openrouter.ai/api/v1/models \
  -H "Authorization: Bearer YOUR_KEY"

# If fails, get new key from: https://openrouter.ai/keys
```

### Issue: "ERPNext API authentication failed"
```bash
# Test manually
curl "YOUR_ERPNEXT_URL/api/method/frappe.auth.get_logged_user" \
  -H "Authorization: token API_KEY:API_SECRET"

# If fails:
# 1. Regenerate keys in ERPNext UI
# 2. Check URL is correct (https://, no trailing slash)
# 3. Verify user has System Manager role
```

### Issue: "Workflow service not reachable"
```bash
# Test workflow service
curl https://your-render-url.onrender.com/workflows

# If fails:
# 1. Check Render deployment status
# 2. Wait 30 sec (free tier cold start)
# 3. Verify URL in secrets matches Render URL
```

---

## ✅ Next Steps

After setting secrets:

1. **Deploy agent gateway**: `npm run build && npx wrangler@latest deploy`
2. **Deploy frontend**: See `DEPLOYMENT_STATUS.md`
3. **Test end-to-end**: Chat with "Check in guest John Doe"

---

**You're ready to deploy! Use mock mode for quick testing, then connect real ERPNext when ready.** 🚀
