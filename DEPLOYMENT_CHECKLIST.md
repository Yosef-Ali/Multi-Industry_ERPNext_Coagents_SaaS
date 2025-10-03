# ✅ Deployment Checklist

## Pre-Deployment (Already Done!)

- [x] Cloudflare account configured
- [x] Workers created (erpnext-agent-gateway, erpnext-coagent-ui)
- [x] KV namespaces created (SESSIONS, WORKFLOW_STATE)
- [x] D1 database created (erpnext-workflows-db)
- [x] OpenRouter API key in .env file
- [x] Project structure verified
- [x] Deployment scripts created

## Deployment Steps

- [ ] Run `./DEPLOY.sh`
- [ ] Wait for completion (2-5 minutes)
- [ ] Note the deployment URLs
- [ ] Save URLs for reference

## Verification

- [ ] Health check passes
  ```bash
  curl https://erpnext-agent-gateway.workers.dev/health
  ```
- [ ] Frontend loads in browser
  ```
  https://erpnext-coagent-ui.pages.dev
  ```
- [ ] No errors in logs
  ```bash
  cd services/agent-gateway
  pnpm dlx wrangler tail erpnext-agent-gateway
  ```

## Post-Deployment Testing

- [ ] Visit frontend URL
- [ ] Chat interface loads
- [ ] Try sending a message
- [ ] Check response appears
- [ ] Verify no console errors

## Monitoring Setup

- [ ] Bookmark Cloudflare dashboard:
  ```
  https://dash.cloudflare.com/5a34e22d045e4ff3538a636317a631e8
  ```
- [ ] Check analytics work
- [ ] Set up log monitoring command
- [ ] Note any errors for fixing

## Documentation

- [ ] Read START_HERE.md
- [ ] Bookmark CLOUDFLARE_QUICK_REF.md
- [ ] Keep QUICK_DEPLOY_CARD.txt handy
- [ ] Review DEPLOY_NOW.md if issues

## Optional: Production Setup

- [ ] Connect real ERPNext instance
  - [ ] Set ERPNEXT_API_KEY secret
  - [ ] Set ERPNEXT_API_SECRET secret
  - [ ] Set ERPNEXT_BASE_URL secret
  - [ ] Set USE_MOCK_ERPNEXT=false
- [ ] Upgrade OpenRouter model to Claude Sonnet 4.5
  - [ ] Set OPENROUTER_MODEL=anthropic/claude-sonnet-4-5
- [ ] Set up custom domain
- [ ] Configure CORS for production
- [ ] Enable analytics

## Next: v0-Style Features (Future)

- [ ] Phase 4: Cloudflare Workers AI integration
- [ ] Phase 5: v0-style workflow (variants, previews)
- [ ] Phase 6: UI/UX improvements (split-pane, artifacts)
- [ ] Update tasks.md with new tasks

---

## 🎯 Current Status

**Date**: October 3, 2025
**Status**: Ready to Deploy
**Command**: `./DEPLOY.sh`

---

## 📝 Notes

Deployment Time: ___________
Frontend URL: ___________
Agent URL: ___________
Health Check Result: ___________

Issues Encountered:
- 
- 
- 

Fixes Applied:
- 
- 
- 

---

**✅ Mark each item as you complete it!**