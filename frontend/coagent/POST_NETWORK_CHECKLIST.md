# Post-Network Recovery Checklist

**Created**: October 6, 2025  
**Status**: Waiting for network connectivity

## When Network Is Restored

### 1. Run Lint Check
```bash
cd /Users/mekdesyared/Multi-Industry_ERPNext_Coagents_SaaS/frontend/coagent
pnpm lint
```

### 2. Run Type Check
```bash
pnpm exec tsc --noEmit
```

### 3. Restart Dev Server
```bash
# Kill any existing processes
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

# Start fresh
pnpm dev
```

### 4. Test in Browser
- Open: `http://localhost:3001/developer`
- Check model selector shows 4 models:
  - ✅ Gemini 1.5 Flash (Free) - DEFAULT
  - ✅ GPT-3.5 Turbo (Free)
  - ✅ Mistral 7B (Free)
  - ✅ DeepSeek Chat (Affordable)

### 5. Send Test Messages
Test each model to ensure they work:
```
1. Select "Gemini 1.5 Flash (Free)"
   - Send: "Hello, test message"
   - Verify response

2. Select "GPT-3.5 Turbo (Free)"
   - Send: "Hello, test message"
   - Verify response

3. Select "Mistral 7B (Free)"
   - Send: "Hello, test message"
   - Verify response

4. Select "DeepSeek Chat"
   - Send: "Hello, test message"
   - Verify response
```

## Files Modified (Already Saved)

✅ `lib/ai/models.ts` - Updated to free/affordable models  
✅ `lib/ai/providers.ts` - Mapped new models  
✅ `lib/ai/entitlements.ts` - Updated access permissions  

## Current Configuration

### Default Model
```
google/gemini-flash-1.5:free
```

### All Available Models
```javascript
[
  'google/gemini-flash-1.5:free',        // Free tier
  'openai/gpt-3.5-turbo',                // Free tier
  'mistralai/mistral-7b-instruct:free',  // Free tier
  'deepseek/deepseek-chat',              // Very cheap
]
```

## Expected Results

✅ No rate limiting errors (using free tiers strategically)  
✅ All models accessible through OpenRouter  
✅ Cost-effective configuration  
✅ No expensive GPT-4 models  

## If Issues Occur

### Rate Limiting
- Switch between free models to distribute load
- DeepSeek is the backup with very low cost

### Model Not Found
- Check OpenRouter dashboard: https://openrouter.ai/models
- Verify model IDs are correct
- Ensure API key is active

### Connection Errors
- Verify `OPENROUTER_API_KEY` in `.env.local`
- Check API key at: https://openrouter.ai/settings/keys

## Environment Check

Make sure `.env.local` has:
```bash
OPENROUTER_API_KEY=sk-or-v1-...
DATABASE_URL=...
AUTH_SECRET=...
```

## Notes

- Removed expensive GPT-4o models
- Kept GLM out (was causing errors)
- Added Mistral and DeepSeek per request
- Free tiers are first options
- DeepSeek provides affordable fallback

---

**All changes are saved.** Just need to test when network is back! 🚀
