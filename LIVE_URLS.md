# ✅ Live URLs - ERPNext CoAgents Platform

**Status**: WORKING | **Updated**: 2025-10-02

---

## 🌐 Production URLs

### Frontend (React UI)
```
https://9e368f40.erpnext-coagent-ui.pages.dev/
```
✅ **CONFIRMED WORKING**

**Use this URL** to access the chat interface.

### Agent Gateway (API)
```
https://erpnext-agent-gateway.dev-yosefali.workers.dev/
```
✅ **CONFIRMED WORKING**

**Endpoints**:
- Root: https://erpnext-agent-gateway.dev-yosefali.workers.dev/
- Health: https://erpnext-agent-gateway.dev-yosefali.workers.dev/health
- AG-UI: https://erpnext-agent-gateway.dev-yosefali.workers.dev/agui (POST)

---

## 🎛️ Cloudflare Dashboard Links

**Main Dashboard**: https://dash.cloudflare.com/5a34e22d045e4ff3538a636317a631e8

**Direct Links**:
- **Frontend (Pages)**: https://dash.cloudflare.com/5a34e22d045e4ff3538a636317a631e8/pages/view/erpnext-coagent-ui
- **Agent Gateway (Workers)**: https://dash.cloudflare.com/5a34e22d045e4ff3538a636317a631e8/workers/services/view/erpnext-agent-gateway
- **D1 Database**: https://dash.cloudflare.com/5a34e22d045e4ff3538a636317a631e8/d1
- **KV Storage**: https://dash.cloudflare.com/5a34e22d045e4ff3538a636317a631e8/kv

---

## 🧪 Quick Tests

### Test Frontend
```bash
# Open in browser
open https://9e368f40.erpnext-coagent-ui.pages.dev/
```

### Test Gateway
```bash
# Health check
curl https://erpnext-agent-gateway.dev-yosefali.workers.dev/health

# Expected response:
# {"status":"healthy","timestamp":"...","service":"erpnext-agent-gateway",...}
```

---

## 📊 System Status

| Component | URL | Status |
|-----------|-----|--------|
| Frontend | https://9e368f40.erpnext-coagent-ui.pages.dev/ | ✅ Working |
| Gateway | https://erpnext-agent-gateway.dev-yosefali.workers.dev/ | ✅ Working |
| KV Storage | eec1ac4c36d14839a7574b41c0ffa339 | ✅ Active |
| D1 Database | 438122c1-fe33-446c-a222-4bb3cfeb8fa5 | ✅ Active |

**Total Cost**: $0/month 🎉

---

## 🚀 Ready to Use!

Visit the frontend URL and start chatting with the ERPNext CoAgent assistant!
