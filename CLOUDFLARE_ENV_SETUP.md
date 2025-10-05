# Cloudflare Environment Variables Setup

## Live URL
🚀 **https://erpnext-coagent-ui.dev-yosefali.workers.dev**

## Current Issue
The chat is not responding because the OpenRouter API key and other environment variables are not set on Cloudflare Workers.

## Steps to Fix

### 1. Go to Cloudflare Dashboard
Visit: https://dash.cloudflare.com

### 2. Navigate to Your Worker
- Click **Workers & Pages** (left sidebar)
- Find and click **erpnext-coagent-ui**

### 3. Add Environment Variables
- Click **Settings** tab
- Scroll to **Environment Variables**
- Click **Add Variable** for each:

#### Required Variables:

```
OPENROUTER_API_KEY
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
```

```
OPENROUTER_MODEL
mistralai/mistral-7b-instruct
```

```
OPENROUTER_HTTP_REFERER
https://erpnext-coagent-ui.dev-yosefali.workers.dev
```

```
OPENROUTER_APP_TITLE
ERPNext CoAgent Assistant
```

### 4. Save and Redeploy
- Click **Save** after adding each variable
- The worker will automatically redeploy with the new environment variables

### 5. Test Chat
- Visit https://erpnext-coagent-ui.dev-yosefali.workers.dev
- Click "Open Chat"
- Type a message like "hello"
- You should now get AI responses!

## Cost Tracking
- Model: **mistralai/mistral-7b-instruct**
- Cost: ~$0.0002 per 1,000 tokens (750x cheaper than GPT-4o-mini)
- Monitor usage: https://openrouter.ai/activity

## Architecture (100% Free Tier ✅)
- ✅ **Cloudflare Workers** - Frontend + API (free, global CDN)
- ✅ **OpenRouter** - AI model API (pay-as-you-go, ~$0.0002/1K tokens)
- No databases, no Redis, no backend servers needed for chat!

## Troubleshooting

### If chat still doesn't work:
1. Check Cloudflare Workers logs:
   - Dashboard → Workers & Pages → erpnext-coagent-ui → Logs
2. Verify environment variables are set correctly
3. Make sure you clicked "Save" for each variable
4. Wait 10-30 seconds for worker to redeploy

### Check if variables are set:
```bash
npx wrangler tail erpnext-coagent-ui
```
Then send a chat message and watch the logs.
