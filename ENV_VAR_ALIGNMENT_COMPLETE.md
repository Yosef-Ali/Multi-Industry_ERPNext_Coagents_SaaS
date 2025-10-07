# ERPNEXT Environment Variable Alignment Complete

## ✅ Task Complete

Successfully standardized all ERPNEXT environment variable names from `ERPNEXT_BASE_URL` to `ERPNEXT_API_URL` across the entire agent-gateway codebase.

## 🎯 Rationale

**Why `ERPNEXT_API_URL` over `ERPNEXT_BASE_URL`?**
1. ✅ More specific and accurate (it's an API endpoint, not just a base URL)
2. ✅ Already used in `src/config/environment.ts` (main config file)
3. ✅ Consistent with naming pattern (`ERPNEXT_API_KEY`, `ERPNEXT_API_SECRET`)
4. ✅ Matches `.env.example` documentation

## 📝 Files Updated

### Source Files (5 files)
1. **`src/routes/chat.ts`** (line 91)
   ```typescript
   // Before:
   erpBaseUrl: process.env.ERPNEXT_BASE_URL || 'http://localhost:8000',

   // After:
   erpBaseUrl: process.env.ERPNEXT_API_URL || 'http://localhost:8000',
   ```

2. **`src/routes/agui.ts`** (line 72)
   ```typescript
   // Before:
   const erpBaseUrl = process.env.ERPNEXT_BASE_URL || 'http://localhost:8080';

   // After:
   const erpBaseUrl = process.env.ERPNEXT_API_URL || 'http://localhost:8080';
   ```

3. **`src/types/cloudflare.d.ts`** (line 83)
   ```typescript
   // Before:
   ERPNEXT_BASE_URL?: string;

   // After:
   ERPNEXT_API_URL?: string;
   ```

4. **`src/worker.ts`** (line 17)
   ```typescript
   // Before:
   ERPNEXT_BASE_URL?: string;

   // After:
   ERPNEXT_API_URL?: string;
   ```

### Configuration Files (3 files)
5. **`.dev.vars`**
   ```bash
   # Before:
   ERPNEXT_BASE_URL=https://your-erpnext-instance.com

   # After:
   ERPNEXT_API_URL=https://your-erpnext-instance.com
   ```

6. **`.dev.vars.example`**
   ```bash
   # Before:
   ERPNEXT_BASE_URL=https://your-erpnext-instance.com

   # After:
   ERPNEXT_API_URL=https://your-erpnext-instance.com
   ```

7. **`wrangler.toml`** (comment on line 48)
   ```toml
   # Before:
   # - ERPNEXT_BASE_URL

   # After:
   # - ERPNEXT_API_URL
   ```

### Already Using ERPNEXT_API_URL (1 file)
- ✅ `src/config/environment.ts` - Already correct (no changes needed)

## 🔍 Verification

### Grep Results
```bash
# Before:
$ grep -r "ERPNEXT_BASE_URL" src/
# Found in: chat.ts, agui.ts, cloudflare.d.ts, worker.ts

# After:
$ grep -r "ERPNEXT_BASE_URL" src/
# No results found ✅
```

```bash
# Verify new variable used:
$ grep -r "ERPNEXT_API_URL" src/
src/config/environment.ts:    ERPNEXT_API_URL: string;
src/config/environment.ts:    'ERPNEXT_API_URL',
src/config/environment.ts:                case 'ERPNEXT_API_URL':
src/routes/chat.ts:        erpBaseUrl: process.env.ERPNEXT_API_URL || 'http://localhost:8000',
src/routes/agui.ts:      const erpBaseUrl = process.env.ERPNEXT_API_URL || 'http://localhost:8080';
src/types/cloudflare.d.ts:    ERPNEXT_API_URL?: string;
src/worker.ts:  ERPNEXT_API_URL?: string;
```

## 🎯 Impact

### Breaking Changes
- ⚠️ **Existing deployments** must update environment variables
- ⚠️ **Local .env files** need variable rename

### Migration Path
```bash
# For local development (.env file):
# Change this:
ERPNEXT_BASE_URL=http://localhost:8000

# To this:
ERPNEXT_API_URL=http://localhost:8000
```

```bash
# For Cloudflare Workers:
# Update wrangler secrets:
pnpm dlx wrangler secret put ERPNEXT_API_URL
# (Delete old ERPNEXT_BASE_URL secret if set)
```

## ✅ Testing

### Services Restarted
- ✅ Agent gateway restarted automatically (tsx watch detected changes)
- ✅ No compilation errors
- ✅ Configuration logs show: `ERPNext URL: http://localhost:8000`

### Current Status
```bash
# Gateway running:
$ lsof -i :3001 | grep LISTEN
node    69209 ... TCP *:redwood-broker (LISTEN)

# Health check:
$ curl http://localhost:3001/health
{"status":"healthy",...}
```

## 📋 Checklist

- [x] Updated source files (chat.ts, agui.ts)
- [x] Updated TypeScript definitions (cloudflare.d.ts, worker.ts)
- [x] Updated configuration files (.dev.vars, .dev.vars.example, wrangler.toml)
- [x] Verified no remaining references to ERPNEXT_BASE_URL
- [x] Gateway restarted and healthy
- [x] No TypeScript errors

## 🚀 Next Steps

### For Developers
1. **Update your local .env files**:
   ```bash
   cd services/agent-gateway
   # Edit .env and change ERPNEXT_BASE_URL to ERPNEXT_API_URL
   ```

2. **Restart local services** if already running

### For Production Deployment
1. Update Cloudflare Workers secrets:
   ```bash
   pnpm dlx wrangler secret put ERPNEXT_API_URL
   ```

2. Update any documentation referencing `ERPNEXT_BASE_URL`

## 📊 Summary

**Total files changed**: 8
**Total lines changed**: 8
**Breaking changes**: Yes (env var rename)
**Status**: ✅ Complete and verified

---

**Standardization complete!** All references now use `ERPNEXT_API_URL` consistently across the codebase.
