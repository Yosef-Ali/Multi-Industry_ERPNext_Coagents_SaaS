# 🆓 Free Tier Setup Guide

## ✅ What's Free

- **Cloudflare Workers**: 100,000 requests/day
- **KV Storage**: 100,000 reads/day, 1,000 writes/day, 1GB storage
- **R2 Storage**: 10GB storage, 1M operations/month
- **Cloudflare Pages**: Unlimited requests, 500 builds/month
- **ERPNext**: Open source, self-hosted

---

## 🏠 Option 1: Local ERPNext Development

### Install ERPNext Locally (Free)

```bash
# Using Docker (easiest)
docker run -d \
  --name erpnext \
  -p 8080:8000 \
  -e SITE_NAME=erpnext.local \
  frappe/erpnext:latest

# Access: http://localhost:8080
# Default credentials: Administrator / admin
```

### Get API Credentials from ERPNext

1. Login to ERPNext at http://localhost:8080
2. Go to: **Settings → API → Generate Keys**
3. Copy your API Key and Secret

### Update .env

```bash
# Local ERPNext
ERPNEXT_BASE_URL=http://localhost:8080
ERPNEXT_API_KEY=your_generated_api_key
ERPNEXT_API_SECRET=your_generated_api_secret
ANTHROPIC_API_KEY=sk-ant-your-key  # Get free credits from Anthropic
```

---

## ☁️ Option 2: Free Cloud ERPNext

### Use Frappe Cloud Free Trial

1. Go to https://frappecloud.com/
2. Sign up for free trial (14 days)
3. Create a new site
4. Get your site URL: `https://your-site.frappe.cloud`

### Or Use Railway Free Tier

```bash
# Deploy ERPNext on Railway (free tier: $5 credit/month)
# 1. Go to railway.app
# 2. Deploy from template: ERPNext
# 3. Get your deployed URL
```

---

## 🚀 Deploy to Cloudflare Workers (Free)

### 1. Set Secrets (One-time)

```bash
cd services/agent-gateway

# Anthropic API Key (free tier available)
pnpm dlx wrangler secret put ANTHROPIC_API_KEY
# Enter: sk-ant-your-key

# ERPNext credentials
pnpm dlx wrangler secret put ERPNEXT_API_KEY
# Enter: your_api_key

pnpm dlx wrangler secret put ERPNEXT_API_SECRET
# Enter: your_api_secret

pnpm dlx wrangler secret put ERPNEXT_BASE_URL
# Enter: http://localhost:8080 (or your cloud URL)
```

### 2. Deploy Agent Gateway

```bash
cd services/agent-gateway
npm install
pnpm dlx wrangler deploy

# Output: ✅ Deployed to https://erpnext-agent-gateway.workers.dev
```

### 3. Deploy Frontend

```bash
cd ../../frontend/coagent

# Update with your deployed gateway URL
# Edit wrangler.toml:
# VITE_GATEWAY_URL = "https://erpnext-agent-gateway.workers.dev"

npm install
npm run build
pnpm dlx wrangler pages deploy dist

# Output: ✅ Deployed to https://erpnext-coagent-ui.pages.dev
```

---

## 💰 Cost Breakdown (All FREE)

| Service | Free Tier Limits | Cost |
|---------|-----------------|------|
| **Cloudflare Workers** | 100K requests/day | $0 |
| **KV Storage** | 1GB + 100K reads/day | $0 |
| **Cloudflare Pages** | Unlimited requests | $0 |
| **ERPNext (Local)** | Unlimited | $0 |
| **Anthropic Claude** | Free credits for testing | $0 |
| **GitHub** | Unlimited public repos | $0 |

**Total**: $0/month for development! 🎉

---

## 🧪 Testing Without ERPNext

If you don't have ERPNext set up yet, you can use mock mode:

```bash
# In .env
USE_MOCK_ERPNEXT=true

# This will simulate ERPNext API responses for testing
```

---

## 📊 Monitor Your Usage (Stay Free)

### Check Cloudflare Dashboard

```bash
# View your usage
pnpm dlx wrangler deployments list

# View real-time logs (free)
pnpm dlx wrangler tail erpnext-agent-gateway
```

### Free Tier Limits

- **Workers**: 100,000 requests/day = ~1.15 requests/second
- **KV Reads**: 100,000/day = ~1.15 reads/second
- **KV Writes**: 1,000/day = careful with sessions!

### Tips to Stay Under Limits

1. **Cache responses** - Reduce API calls
2. **Use KV wisely** - Session TTL of 30 mins
3. **Batch operations** - Combine multiple requests
4. **Use mock mode** - For testing without hitting APIs

---

## 🔄 Development Workflow (All Local, Free)

```bash
# Terminal 1: Run ERPNext locally
docker start erpnext

# Terminal 2: Test Agent Gateway locally
cd services/agent-gateway
pnpm dlx wrangler dev --port 3000

# Terminal 3: Test Frontend locally
cd frontend/coagent
npm run dev

# Access: http://localhost:5173
```

This runs everything locally - **no cloud costs!**

---

## 🚀 When Ready to Deploy (Still Free)

```bash
# Deploy everything to Cloudflare (free tier)
./deploy-all.sh

# Check it works
curl https://erpnext-agent-gateway.workers.dev/health
```

---

## 📈 Scale Up Later (Optional)

When you outgrow free tier:

- **Cloudflare Workers Paid**: $5/month for 10M requests
- **ERPNext Cloud**: $10+/month for managed hosting
- **Anthropic API**: Pay-as-you-go pricing

But for development and testing, **everything is FREE!** 🎊

---

## 🆘 Get Free Anthropic API Credits

1. Go to https://console.anthropic.com/
2. Sign up with email
3. Get $5 free credits (good for ~25,000 API calls)
4. Use promo codes from Anthropic events for more credits

---

## ✅ Quick Start Checklist

- [ ] Install Docker Desktop (free)
- [ ] Run ERPNext locally: `docker run frappe/erpnext`
- [ ] Get ERPNext API credentials
- [ ] Sign up for Anthropic free credits
- [ ] Authenticate Wrangler: `pnpm dlx wrangler login` ✅ (Done!)
- [ ] Set secrets: `pnpm dlx wrangler secret put ...`
- [ ] Deploy: `pnpm dlx wrangler deploy`
- [ ] Test: Visit your `.workers.dev` URL

**Total Time**: ~30 minutes  
**Total Cost**: $0 💰

---

Ready to deploy for free? Let me know and I'll help you set the secrets! 🚀
