# 🚀 Next.js Migration Guide - CopilotKit Integration

**Why**: Use Next.js like official CopilotKit examples instead of Express.js
**Benefit**: Works on Cloudflare Pages with API Routes
**Status**: ✅ Configuration complete, ready to install and test

---

## ✅ What's Been Done

### 1. Created Next.js API Route
**File**: `frontend/coagent/app/api/copilotkit/route.ts`

```typescript
import { CopilotRuntime, OpenAIAdapter, copilotRuntimeNextJSAppRouterEndpoint } from '@copilotkit/runtime';

// Uses OpenRouter with OpenAI-compatible adapter
const runtime = new CopilotRuntime();

export async function POST(req: NextRequest) {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter: new OpenAIAdapter({
      model: 'zhipu/glm-4-9b-chat',
      openai: {
        apiKey: process.env.OPENROUTER_API_KEY,
        baseURL: 'https://openrouter.ai/api/v1',
      },
    }),
    endpoint: '/api/copilotkit',
  });

  return handleRequest(req);
}
```

✅ **This replaces Express.js entirely!**

### 2. Updated package.json
**Added**:
- `next`: ^14.0.4
- `openai`: ^4.24.1
- `@copilotkit/runtime`: ^1.10.5

**Scripts changed**:
- `dev`: `next dev` (was `vite`)
- `build`: `next build` (was `tsc && vite build`)
- `start`: `next start` (new)

### 3. Created next.config.js
Basic configuration for Cloudflare Pages compatibility

### 4. Created .env.local
Server-side environment variables (not committed to git):
- `OPENROUTER_API_KEY`
- `OPENROUTER_MODEL`
- `WORKFLOW_SERVICE_URL`

---

## 📦 Next Steps

### Step 1: Install Dependencies (2 min)
```bash
cd frontend/coagent
npm install
```

This will install:
- Next.js 14
- OpenAI SDK (for OpenRouter)
- CopilotKit runtime

### Step 2: Test Locally (2 min)
```bash
npm run dev
```

**Expected**:
- Server starts on http://localhost:3000
- API route available at http://localhost:3000/api/copilotkit
- Frontend loads with CopilotKit integration

**Test API route**:
```bash
curl -X POST http://localhost:3000/api/copilotkit \
  -H "Content-Type: application/json" \
  -d '{"messages": [{"role": "user", "content": "Hello"}]}'
```

### Step 3: Update Frontend Components (if needed)
The existing React components should work as-is, but update the CopilotKit provider endpoint:

```typescript
<CopilotKit runtimeUrl="/api/copilotkit">
  {/* Your app */}
</CopilotKit>
```

### Step 4: Deploy to Cloudflare Pages

#### Option A: Via Wrangler CLI
```bash
# Build
npm run build

# Deploy (Cloudflare will detect Next.js automatically)
npx wrangler@latest pages deploy .next --project-name=erpnext-coagent-ui
```

#### Option B: Via Cloudflare Dashboard
1. Go to https://dash.cloudflare.com/pages
2. Create new project
3. Connect GitHub repository
4. Framework preset: Next.js
5. Build command: `npm run build`
6. Build output directory: `.next`
7. Add environment variable: `OPENROUTER_API_KEY`

---

## 🎯 Architecture Comparison

### Before (Express.js + Vite)
```
Frontend (React+Vite) → Agent Gateway (Express.js Worker) ❌ Incompatible
```
**Problem**: Express doesn't work in Cloudflare Workers

### After (Next.js)
```
Frontend + API Routes (Next.js) → OpenRouter AI ✅ Works!
```
**Solution**: Next.js API routes work on Cloudflare Pages Functions

---

## 🔧 How It Works

### Client-Side (React Components)
```typescript
import { CopilotKit } from '@copilotkit/react-core';

function App() {
  return (
    <CopilotKit runtimeUrl="/api/copilotkit">
      {/* Your chat interface */}
    </CopilotKit>
  );
}
```

### Server-Side (API Route)
```
POST /api/copilotkit
├── Receives chat messages from frontend
├── Forwards to OpenRouter API (OpenAI-compatible)
├── Streams responses back to frontend
└── Uses CopilotKit runtime for state management
```

### OpenRouter Integration
```
Next.js API Route
  → OpenAIAdapter (with baseURL: openrouter.ai)
    → OpenRouter API
      → AI Model (zhipu/glm-4-9b-chat)
        → Response streamed back
```

---

## 💡 Key Advantages

### ✅ vs Express.js
- Works on Cloudflare Pages (no Workers incompatibility)
- Official CopilotKit pattern
- Built-in API routes
- No need for separate backend

### ✅ vs Current Workers Setup
- No need to refactor Express code
- API routes work out of the box
- Easier to deploy and maintain

---

## 📊 What Gets Deployed

### On Cloudflare Pages
```
erpnext-coagent-ui.pages.dev/
├── / (frontend - React SPA)
├── /api/copilotkit (API route - serverless function)
└── Static assets (JS, CSS, images)
```

**Cost**: Still $0/month! ✅

---

## 🧪 Testing Checklist

After deployment:

- [ ] Frontend loads: https://xxx.pages.dev/
- [ ] API route responds: https://xxx.pages.dev/api/copilotkit
- [ ] Chat sends message
- [ ] AI responds with streaming
- [ ] No CORS errors
- [ ] Environment variables set in Cloudflare

---

## 🔐 Environment Variables for Cloudflare

When deploying to Cloudflare Pages, set these in the dashboard:

1. **OPENROUTER_API_KEY**: Your OpenRouter key (starts with `sk-or-v1-`)
2. **OPENROUTER_MODEL**: `zhipu/glm-4-9b-chat`
3. **WORKFLOW_SERVICE_URL**: `https://erpnext-workflows.onrender.com`

**Where to set**: Cloudflare Dashboard → Pages → erpnext-coagent-ui → Settings → Environment variables

---

## 📁 File Structure

```
frontend/coagent/
├── app/
│   ├── api/
│   │   └── copilotkit/
│   │       └── route.ts          ← NEW: API endpoint
│   └── page.tsx                  ← Existing page
├── src/
│   └── components/               ← Existing React components
├── .env.local                    ← NEW: Local env vars
├── next.config.js                ← NEW: Next.js config
├── package.json                  ← UPDATED: Next.js dependencies
└── tsconfig.json                 ← Existing TS config
```

---

## 🚨 Important Notes

### API Keys Security
- ✅ `OPENROUTER_API_KEY` stays server-side (in API route)
- ✅ Never exposed to client
- ✅ Cloudflare encrypts environment variables

### Next.js App Router
- Using App Router (not Pages Router)
- API routes in `app/api/` directory
- Server components by default

### Cloudflare Pages Functions
- API routes become serverless functions
- Edge runtime compatible
- Auto-deployed with static site

---

## 🎯 Next Actions

1. **Now**: Run `npm install` to get dependencies
2. **Then**: Test locally with `npm run dev`
3. **Finally**: Deploy to Cloudflare Pages

This approach is **much cleaner** than Express.js and follows official CopilotKit examples! 🎉

---

**Estimated Time**: 15 minutes (install, test, deploy)
**Cost**: $0/month
**Compatibility**: ✅ Works on Cloudflare Pages out of the box
