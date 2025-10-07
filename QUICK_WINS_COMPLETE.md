# Quick Wins Complete: /api/tools Proxy + USE_GATEWAY_CHAT=1

## ✅ Completed Tasks

### 1. Created /api/tools Proxy Endpoint
**File**: `frontend/coagent/app/api/tools/route.ts`

Following the same pattern as `/api/models`, created a Next.js API proxy that:
- Fetches tools from agent-gateway with 1-hour cache (`unstable_cache`)
- Falls back to empty array on gateway errors (graceful degradation)
- Supports industry-based filtering via query params
- Includes POST endpoint for cache revalidation
- Returns metadata about cache status and timestamps

**Features**:
```typescript
GET /api/tools?industries=hotel,hospital
POST /api/tools  // Revalidate cache
```

### 2. Updated Frontend Tools Registry Client
**File**: `frontend/coagent/lib/tools/registry.ts`

Changed from direct gateway calls to Next.js proxy:
- Now calls `http://localhost:3000/api/tools` (same origin)
- Avoids CORS issues
- Benefits from Next.js server-side caching
- Maintains session-duration in-memory cache as second layer

**Before**:
```typescript
const gatewayUrl = 'http://localhost:3001';
fetch(`${gatewayUrl}/api/tools`)  // Cross-origin request
```

**After**:
```typescript
const url = new URL('/api/tools', window.location.origin);
fetch(url.toString())  // Same-origin request via Next.js proxy
```

### 3. Implemented USE_GATEWAY_CHAT=1 Routing
**File**: `frontend/coagent/app/developer/api/chat/route.ts` (lines 164-222)

Added gateway routing logic that:
- Checks `USE_GATEWAY_CHAT` environment variable
- Forwards chat requests to agent-gateway `/api/chat`
- Converts UI messages to gateway format
- Streams SSE response directly to client
- Falls back to local `myProvider` on errors

**Implementation**:
```typescript
if (USE_GATEWAY_CHAT) {
  console.log('[Chat] Routing to agent-gateway');

  const gatewayResponse = await fetch(`${gatewayUrl}/api/chat`, {
    method: 'POST',
    body: JSON.stringify({
      messages: gatewayMessages,
      model: activeModelId,
      industries: [],
      sessionId: id,
      userId: session.user.id,
    }),
  });

  // Return SSE stream directly
  return new Response(gatewayResponse.body, {
    headers: { 'Content-Type': 'text/event-stream' },
  });
}
// Falls through to local provider
```

### 4. Environment Configuration
**File**: `frontend/coagent/.env.local`

Added:
```bash
# Agent Gateway URL
AGENT_GATEWAY_URL=http://localhost:3001
NEXT_PUBLIC_AGENT_GATEWAY_URL=http://localhost:3001

# Feature flag
USE_GATEWAY_CHAT=1
```

## 🧪 Testing Results

### /api/tools Endpoint
```bash
$ curl http://localhost:3000/api/tools | jq '.tools | length'
4

$ curl http://localhost:3000/api/tools | jq '.tools[0]'
{
  "name": "search_doc",
  "description": "Search ERPNext documents by DocType with filters",
  "operationType": "read",
  "requiresApproval": false
}
```

### Services Running
- ✅ Frontend: `http://localhost:3000` (Next.js 15)
- ✅ Agent Gateway: `http://localhost:3001` (Express)
- ✅ CORS configured for localhost:3000

## 🎯 Architecture Flow

```
User types message in browser
    ↓
Frontend Chat UI (port 3000)
    ↓
POST /developer/api/chat
    ↓
[USE_GATEWAY_CHAT=1 check]
    ↓ YES
    ├─→ Forward to agent-gateway
    │   POST http://localhost:3001/api/chat
    │   {
    │     "messages": [...],
    │     "model": "gemini-2.5-pro",
    │     "industries": [],
    │     "sessionId": "chat-123",
    │     "userId": "user-456"
    │   }
    │   ↓
    │   Agent Gateway creates Agent SDK instance
    │   ↓
    │   Agent SDK executes with tool registry
    │   ↓
    │   SSE stream returned
    │   ↓
    │   Frontend receives stream
    │   ↓
    │   ToolCallCard renders tool calls
    │
    ↓ NO (fallback)
    └─→ Local myProvider
        (existing flow)
```

## 🔑 Key Benefits

1. **Progressive Rollout**: Toggle between gateway and local with env var
2. **Graceful Fallback**: Gateway errors don't break chat
3. **Tool Visualization**: ToolCallCard automatically renders new tools
4. **Caching**: Multi-layer caching (Next.js + client)
5. **Same-Origin**: Proxy avoids CORS complexities

## 📊 What Changed

### New Files
1. `frontend/coagent/app/api/tools/route.ts` (170 lines)

### Modified Files
1. `frontend/coagent/lib/tools/registry.ts`
   - Changed gateway URL to use Next.js proxy

2. `frontend/coagent/app/developer/api/chat/route.ts`
   - Added USE_GATEWAY_CHAT routing logic (58 lines)

3. `frontend/coagent/.env.local`
   - Added AGENT_GATEWAY_URL
   - Added USE_GATEWAY_CHAT=1 flag

## 🚀 Ready to Test

### Manual Testing Steps

1. **Open browser**: `http://localhost:3000/developer`
2. **Type a message**: "Search for invoices"
3. **Observe**:
   - Console log: `[Chat] Routing to agent-gateway`
   - Gateway receives request
   - SSE stream flows back
   - Tool calls render in ToolCallCard

### Verify Gateway Routing
```bash
# Check frontend logs
tail -f /tmp/frontend-test.log

# Check gateway logs
tail -f /tmp/gateway-test.log

# Should see:
# Frontend: [Chat] Routing to agent-gateway (USE_GATEWAY_CHAT=1)
# Gateway: POST /api/chat received
```

### Toggle Back to Local
```bash
# In frontend/.env.local:
USE_GATEWAY_CHAT=0  # or comment out

# Restart frontend
# Chat will use local myProvider again
```

## 🎉 Success Criteria Met

- ✅ /api/tools proxy created and tested
- ✅ Tools registry client updated to use proxy
- ✅ USE_GATEWAY_CHAT=1 routing implemented
- ✅ Environment variables configured
- ✅ Both services running and communicating
- ✅ Graceful fallback on errors
- ✅ Ready for end-to-end chat testing

## 🔜 Next Steps

### Immediate (Can test now)
1. **Open browser and test chat**: Type a message and verify it routes to gateway
2. **Check tool rendering**: Verify ToolCallCard shows up for tool calls
3. **Test fallback**: Stop gateway and verify fallback to local provider

### Short-term (Next session)
1. **Align ERPNEXT env vars**: Standardize on `ERPNEXT_API_URL`
2. **Replace Python SDK shim**: Implement real HTTP streaming
3. **Add pytest-asyncio**: Migrate away from custom async hook

### Medium-term
1. **Add approval gates UI**: Modal for tool approval
2. **Implement /api/chat/approve endpoint**: Backend approval handling
3. **Add gateway integration tests**: Test SSE streaming

---

**Status**: ✅ Quick wins complete! Gateway chat integration ready for testing.
