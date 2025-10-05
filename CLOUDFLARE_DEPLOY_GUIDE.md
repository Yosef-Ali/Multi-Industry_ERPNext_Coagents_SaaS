# Cloudflare Pages Deployment Guide

## Quick Deploy

### Option 1: Manual Deploy (Using Script)

```bash
# From project root
./deploy-cloudflare-frontend.sh

# For production deployment
./deploy-cloudflare-frontend.sh production
```

### Option 2: GitHub Actions (Auto-Deploy)

Push to `main` or `feature/frontend-copilotkit-integration` branch to trigger automatic deployment.

## Setup Steps

### 1. Set GitHub Secrets

Go to your GitHub repository → Settings → Secrets and Variables → Actions

Add these secrets:
- `CLOUDFLARE_API_TOKEN` - Get from Cloudflare dashboard → My Profile → API Tokens
- `CLOUDFLARE_ACCOUNT_ID` - Found in Cloudflare dashboard → Account → Account ID
- `OPENROUTER_API_KEY` - Your OpenRouter API key

### 2. Set Cloudflare Pages Environment Variables

Go to Cloudflare dashboard → Pages → Your Project → Settings → Environment Variables

Add these variables:

**Production & Preview:**
```
OPENROUTER_API_KEY=your-openrouter-api-key
OPENROUTER_MODEL=mistralai/mistral-7b-instruct
OPENROUTER_HTTP_REFERER=https://your-app.pages.dev
OPENROUTER_APP_TITLE=ERPNext CoAgent Assistant
WORKFLOW_SERVICE_URL=https://erpnext-workflows.onrender.com
```

### 3. Configure Build Settings

In Cloudflare Pages project settings:

- **Framework preset**: Next.js
- **Build command**: `npm run build`
- **Build output directory**: `.next`
- **Root directory**: `frontend/coagent`

## Model Configuration

The app now uses `mistralai/mistral-7b-instruct` for cost-effective AI responses.

### Pricing Comparison

| Model | Cost per 1K tokens | Speed | Quality |
|-------|-------------------|-------|---------|
| `mistralai/mistral-7b-instruct` | ~$0.0002 | Fast | Good |
| `mistralai/mixtral-8x7b` | ~$0.0006 | Fast | Better |
| `openai/gpt-4o-mini` | ~$0.15 | Medium | Best |

### Changing the Model

Edit `.env.production` or set `OPENROUTER_MODEL` in Cloudflare Pages:

```bash
# Budget option (current)
OPENROUTER_MODEL=mistralai/mistral-7b-instruct

# Better quality
OPENROUTER_MODEL=mistralai/mixtral-8x7b

# Premium option
OPENROUTER_MODEL=openai/gpt-4o-mini
```

## Deployment URLs

- **Production**: `https://erpnext-coagent-ui.pages.dev`
- **Preview (branches)**: `https://[branch].erpnext-coagent-ui.pages.dev`

## Troubleshooting

### Build Fails

```bash
# Test locally first
cd frontend/coagent
npm install
npm run build
```

### Environment Variables Not Working

Make sure they're set in **both** Production and Preview environments in Cloudflare Pages dashboard.

### API Errors

Check Cloudflare Pages → Functions → Logs for error details.

### Model Not Responding

1. Verify `OPENROUTER_API_KEY` is set correctly
2. Check OpenRouter dashboard for usage limits
3. Try switching to a different model

## Local Testing

```bash
# Development
cd frontend/coagent
npm run dev

# Production build
npm run build
npm run start
```

## Deployment Logs

View deployment logs:
- **GitHub Actions**: Repository → Actions tab
- **Cloudflare**: Dashboard → Pages → Deployments

## Cost Optimization

Current setup uses the low-cost `mistralai/mistral-7b-instruct` model (~$0.0002 per 1K tokens).

Estimated costs for 1M user messages:
- Input: 10 tokens per message = 10M tokens = $2.00
- Output: 50 tokens per message = 50M tokens = $10.00
- **Total: ~$12 per 1M conversations**

Compare to GPT-4o-mini: ~$1,500 per 1M conversations (125x more expensive)

## Next Steps

1. Push code to GitHub to trigger deployment
2. Monitor first deployment in GitHub Actions
3. Test deployed app at your Cloudflare Pages URL
4. Set up custom domain (optional) in Cloudflare Pages settings
