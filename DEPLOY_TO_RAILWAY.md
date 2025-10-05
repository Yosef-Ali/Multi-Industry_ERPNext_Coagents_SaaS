# 🚂 Deploy to Railway.app (Easier than Render!)

## Why Railway?

- ✅ **Sign in with GitHub** (no email verification!)
- ✅ **$5 FREE credit/month** (runs 24/7)
- ✅ **Faster deployment**
- ✅ **Better dashboard**

---

## 🚀 Deploy in 5 Minutes

### Step 1: Push to GitHub

```bash
git add .
git commit -m "feat: unified deployment"
git push origin feature/frontend-copilotkit-integration
```

### Step 2: Deploy to Railway

1. **Go to Railway**
   - Visit: https://railway.app
   - Click: **"Login"**
   - Choose: **"Login with GitHub"** ← No email needed!

2. **Create New Project**
   - Click: **"New Project"**
   - Choose: **"Deploy from GitHub repo"**
   - Select: `Multi-Industry_ERPNext_Coagents_SaaS`
   - Branch: `feature/frontend-copilotkit-integration`

3. **Railway Auto-Detects Dockerfile**
   - Reads your `Dockerfile` automatically
   - Starts building immediately

4. **Add Environment Variable**
   - In project dashboard, click **"Variables"**
   - Add:
     ```
     OPENROUTER_API_KEY=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
     ```
   - Click **"Save"**

5. **Get Your URL**
   - Click **"Settings"** → **"Networking"**
   - Click **"Generate Domain"**
   - You get: `https://your-app.up.railway.app`

---

## ✅ Done!

Visit your URL: `https://your-app.up.railway.app`

Try: "List available hotel workflows"

---

## 💰 Free Tier

**Railway gives you:**
- $5 FREE credit every month
- Runs ~100-140 hours/month
- No sleep/cold starts
- Faster than Render

**Perfect for MVP/beta!**

---

## 🔄 Auto-Deploy

Railway watches your GitHub branch:

```bash
git add .
git commit -m "update"
git push
# Railway auto-deploys in 2-3 minutes!
```

---

**That's it! Much easier than Render!** 🎉
