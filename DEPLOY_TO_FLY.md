# ✈️ Deploy to Fly.io (Alternative Option)

## Why Fly.io?

- ✅ **GitHub login** (no email verification)
- ✅ **FREE tier** (3 small VMs)
- ✅ **Global edge deployment**
- ✅ **CLI-based** (quick deployment)

---

## 🚀 Deploy Steps

### Step 1: Install Fly CLI

```bash
# Mac
brew install flyctl

# Or direct download
curl -L https://fly.io/install.sh | sh
```

### Step 2: Login with GitHub

```bash
fly auth login
# Opens browser → Login with GitHub
```

### Step 3: Deploy

```bash
# Create app
fly launch --no-deploy

# It asks:
# App name: erpnext-coagent (or choose yours)
# Region: Choose closest to you
# Would you like to set up a PostgreSQL database? NO
# Would you like to set up a Redis database? NO

# Set API key
fly secrets set OPENROUTER_API_KEY=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

# Deploy!
fly deploy
```

### Step 4: Get URL

```bash
fly status
# Shows: https://erpnext-coagent.fly.dev
```

---

## ✅ Done!

Visit: `https://erpnext-coagent.fly.dev`

---

## 💰 Free Tier

- 3 shared-cpu-1x VMs (256MB RAM each)
- 3GB persistent storage
- 160GB outbound transfer

**Perfect for testing!**

---

## 🔄 Updates

```bash
# Make changes
git add .
git commit -m "update"

# Redeploy
fly deploy
```

---

**Choose this if you prefer CLI!** 🚀
