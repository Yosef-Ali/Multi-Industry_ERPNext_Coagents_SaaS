# Architecture Updates Based on comment-1.md

**Date**: 2025-10-01
**Source**: comment-1.md (Local development agent instructions)
**Impact**: Plan.md and tasks.md updated with 6 new critical tasks

---

## 📋 **Changes Summary**

### **1. Plan.md Updates**

#### **Added Dependencies:**
- Express 4.18+ with helmet, cors, express-rate-limit
- Server-Sent Events (SSE) for AG-UI streaming endpoint
- LangGraph workflow engine clarified as Python

#### **Updated Agent Gateway Structure:**
```
services/agent-gateway/
├── src/
│   ├── server.ts              # NEW: Express app with security middleware
│   ├── routes/
│   │   ├── health.ts          # NEW: GET /health endpoint
│   │   ├── agui.ts            # NEW: POST /agui SSE streaming
│   │   └── index.ts           # NEW: Route aggregation
│   ├── middleware/
│   │   ├── auth.ts            # NEW: Bearer token validation
│   │   ├── validation.ts      # NEW: Zod request validation
│   │   └── errorHandler.ts    # NEW: Error sanitization
│   ├── agent.ts
│   ├── tools/
│   │   └── custom/            # ADDED: Custom generated tools
│   ├── session.ts
│   ├── streaming.ts           # UPDATED: AG-UI SSE event emitter
│   └── api.ts
```

---

### **2. Tasks.md Updates**

#### **New Tasks Added (T071-T076):**

**Agent Gateway - Express Server Setup:**
- **T071**: Implement Express server with helmet, cors, express-rate-limit
- **T072**: Implement GET /health endpoint
- **T073**: Implement POST /agui SSE streaming endpoint
- **T074**: Implement bearer token authentication middleware
- **T075**: Implement Zod request validation middleware
- **T076**: Implement error sanitization handler

#### **Renumbered Tasks:**
- **T071-T073** → **T077-T079** (Session & Streaming)
- **T074-T086** → **T080-T092** (Phase 3.4: Workflow Service)
- All subsequent tasks shifted by +6

#### **Updated Task Descriptions:**
- **T078**: AG-UI SSE event emitter with correlation IDs (was generic streaming)
- **T082**: Workflow executor with AG-UI frame emission (added frame requirement)
- **T083**: Approval node with AG-UI ui_prompt emission (clarified integration)
- **T086**: Notify node with AG-UI frames (added frame requirement)
- **T087**: Hotel O2C workflow - update to emit AG-UI frames

**New Total: 150 tasks** (was 144)

---

## 🎯 **Architectural Compliance Matrix**

### **comment-1.md Requirements → Implementation Mapping**

| Requirement | Component | Status |
|-------------|-----------|--------|
| **Express + helmet + cors** | server.ts (T071) | ⏳ Pending |
| **GET /health** | routes/health.ts (T072) | ⏳ Pending |
| **POST /agui SSE** | routes/agui.ts (T073) | ⏳ Pending |
| **Bearer token auth** | middleware/auth.ts (T074) | ⏳ Pending |
| **Zod validation** | middleware/validation.ts (T075) | ⏳ Pending |
| **Error sanitization** | middleware/errorHandler.ts (T076) | ⏳ Pending |
| **Tool input schemas** | All tools (T050-T070) | ✅ Implemented |
| **HITL approval flows** | create_doc, update_doc, submit_doc, cancel_doc, bulk_update | ✅ Implemented |
| **LangGraph per vertical** | hotel/o2c.py (T087), hospital/admissions.py (T088) | 🔄 Hotel done, Hospital pending |
| **AG-UI frame emission** | Workflow nodes (T083-T086) | ⏳ Pending |
| **Logging with correlation ID** | AuditLogger enhancement needed | 🔄 Partial - needs correlation IDs |
| **First token <400ms** | Performance requirement | 📊 To be measured |
| **Batch operations** | bulk_update tool (T057) | ✅ Implemented |
| **No raw SQL** | FrappeAPIClient (T047-T049) | ✅ Implemented |
| **Rate limiting 10 req/sec** | FrappeAPIClient (T048) | ✅ Implemented |
| **Idempotency** | FrappeAPIClient (T049) | ✅ Implemented |

---

## 🚀 **Implementation Priority (Updated)**

### **Phase 1: Security & Infrastructure (CRITICAL)**
**Must complete before any frontend integration:**
1. T071 - Express server with security middleware
2. T072 - Health endpoint
3. T073 - AG-UI SSE streaming endpoint
4. T074 - Bearer token auth
5. T075 - Zod validation middleware
6. T076 - Error sanitization

### **Phase 2: AG-UI Integration**
**Enables frontend to communicate with backend:**
7. T077 - Session management
8. T078 - SSE event emitter with correlation IDs
9. T079 - Claude Agent SDK initialization

### **Phase 3: Workflow-to-UI Bridge**
**Enables visual workflow progress:**
10. T080-T086 - Workflow infrastructure with AG-UI frame emission
11. T087 - Update hotel O2C to emit frames

### **Phase 4: Complete Remaining Verticals**
**Follow established patterns:**
12. T088-T092 - Hospital, Manufacturing, Retail, Education workflows
13. Generator Service (T093-T099)
14. Frontend UI (T100-T111)
15. ERPNext Integration (T112-T121)
16. Polish (T122-T150)

---

## 📝 **Code Patterns from comment-1.md**

### **Express Server Pattern**
```typescript
// services/agent-gateway/src/server.ts
import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';

const app = express();

// Security middleware
app.use(helmet());
app.use(cors({ origin: process.env.ALLOWED_ORIGINS?.split(',') }));
app.use(express.json({ limit: '10mb' }));
app.use(rateLimit({
  windowMs: 1000, // 1 second
  max: 10 // 10 requests per second
}));

// Routes
app.use('/health', healthRouter);
app.use('/agui', aguiRouter);

// Error handler
app.use(errorHandler);

export default app;
```

### **AG-UI SSE Endpoint Pattern**
```typescript
// services/agent-gateway/src/routes/agui.ts
import { Router } from 'express';

router.post('/agui', async (req, res) => {
  res.setHeader('Content-Type', 'text/event-stream');
  res.setHeader('Cache-Control', 'no-cache');
  res.setHeader('Connection', 'keep-alive');

  // Stream AG-UI events
  const emitFrame = (frame: AGUIFrame) => {
    res.write(`data: ${JSON.stringify(frame)}\n\n`);
  };

  // Handle tool invocations, approvals, workflow progress
  // ...
});
```

### **Workflow AG-UI Frame Emission Pattern**
```python
# services/workflows/src/nodes/approve.py
def approval_node(state: WorkflowState, emit_frame: Callable) -> WorkflowState:
    # Emit AG-UI prompt frame
    emit_frame({
        "type": "ui_prompt",
        "prompt_id": uuid.uuid4(),
        "message": "Approve reservation creation?",
        "options": ["Approve", "Cancel"],
        "preview": state["reservation_data"]
    })

    # Wait for ui_response
    response = wait_for_response(timeout=300)  # 5 min

    state["approved"] = response["choice"] == "Approve"
    return state
```

### **Correlation ID Pattern**
```typescript
// services/agent-gateway/src/middleware/correlation.ts
export function correlationMiddleware(req, res, next) {
  req.correlationId = req.headers['x-correlation-id'] || uuidv4();
  res.setHeader('X-Correlation-ID', req.correlationId);

  // Attach to all logs
  req.logger = logger.child({ correlationId: req.correlationId });

  next();
}
```

---

## ✅ **Validation Checklist**

Before proceeding with implementation, verify:

- [x] Plan.md reflects Express server architecture
- [x] Plan.md shows AG-UI streaming endpoint
- [x] Plan.md includes middleware layer
- [x] Tasks.md has 6 new infrastructure tasks (T071-T076)
- [x] Tasks.md renumbered all subsequent tasks correctly
- [x] IMPLEMENTATION_GUIDE.md updated with new task count (150)
- [x] Workflow tasks specify AG-UI frame emission requirement
- [x] All changes align with comment-1.md specifications

---

## 🎯 **Next Steps**

1. **Review this document** to ensure all updates are captured
2. **Implement T071-T079** (Express server + AG-UI infrastructure)
3. **Update existing hotel/o2c.py** (T087) to emit AG-UI frames
4. **Test SSE streaming** with frontend before proceeding
5. **Continue with remaining tasks** using updated patterns

---

**Status**: Plan and tasks updated ✅ | Ready for continued implementation 🚀
