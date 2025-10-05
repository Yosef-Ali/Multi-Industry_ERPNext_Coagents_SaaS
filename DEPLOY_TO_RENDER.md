# 🚀 Deploy ERPNext CoAgent to Render (All-in-One)

## What You're Deploying

**ONE** service with everything:
- ✅ Frontend (Next.js chat UI)
- ✅ Agent Gateway (TypeScript)
- ✅ Workflow Service (Python/LangGraph)

**Result:** https://erpnext-coagent.onrender.com (one URL for everything!)

---

## 📋 Prerequisites

1. GitHub account
2. Render.com account (free)
3. OpenRouter API key (for AI)

---

## 🎯 Deployment Steps

### Step 1: Push to GitHub

```bash
# Add all files
git add .

# Commit
git commit -m "feat: unified Render deployment with all services"

# Push
git push origin feature/frontend-copilotkit-integration
```

### Step 2: Deploy to Render

1. **Go to Render Dashboard**
   - Visit: https://dashboard.render.com
   - Sign up/login (use GitHub)

2. **Create New Web Service**
   - Click: "New +" → "Web Service"
   - Connect your GitHub repository
   - Select: Multi-Industry_ERPNext_Coagents_SaaS

3. **Render Auto-Detects Configuration**
   - Render reads your render.yaml automatically
   - Service name: erpnext-coagent
   - Plan: Free
   - Click: "Apply"

4. **Set Environment Variable**
   - In service settings → "Environment"
   - Add: OPENROUTER_API_KEY = sk-or-v1-7062...
   - Click "Save"

5. **Deploy!**
   - Render builds Docker image (~5-10 min)

---

## ✅ Test It

Visit: https://erpnext-coagent.onrender.com

Try: "List available hotel workflows"

---

## 💰 100% FREE

- 512MB RAM
- 750 hours/month
- Sleeps after 15min (30s wake-up)

Upgrade when you get customers!

---

Ready? Follow steps above! 🎉
