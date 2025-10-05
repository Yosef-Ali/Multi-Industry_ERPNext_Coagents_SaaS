 install
npm run build
npm test
npm run lint

# Full integration
docker-compose up -d
```

---

## Common Patterns & Anti-Patterns

### ✅ DO

1. **Always use Zod for validation**
   ```typescript
   const validated = InputSchema.parse(input);
   ```

2. **Use Frappe official APIs**
   ```typescript
   await client.call({
     method: 'frappe.client.get_list',
     params: { doctype: 'Item', fields: ['name', 'item_name'] }
   });
   ```

3. **Track execution time**
   ```typescript
   const startTime = Date.now();
   // ... operation ...
   return { execution_time_ms: Date.now() - startTime };
   ```

4. **Handle errors gracefully**
   ```typescript
   try {
     // operation
   } catch (error: any) {
     throw new Error(`Descriptive context: ${error.message}`);
   }
   ```

5. **Return structured results**
   ```typescript
   interface Result {
     success: boolean;
     data?: any;
     message?: string;
     execution_time_ms: number;
   }
   ```

### ❌ DON'T

1. **Never use raw SQL**
   ```typescript
   // ❌ WRONG
   await db.query('SELECT * FROM tabItem');
   
   // ✅ RIGHT
   await client.call({ method: 'frappe.client.get_list', params: {...} });
   ```

2. **Don't expose internal errors to client**
   ```typescript
   // ❌ WRONG
   res.status(500).json({ error: error.stack });
   
   // ✅ RIGHT
   logger.error('Internal error', { correlationId, stack: error.stack });
   res.status(500).json({ error: 'Internal server error', correlationId });
   ```

3. **Don't skip input validation**
   ```typescript
   // ❌ WRONG
   const { doctype, name } = req.body; // Unvalidated
   
   // ✅ RIGHT
   const validated = RequestSchema.parse(req.body);
   ```

4. **Don't hardcode credentials**
   ```typescript
   // ❌ WRONG
   const apiKey = 'abc123';
   
   // ✅ RIGHT
   const apiKey = process.env.ERPNEXT_API_KEY;
   ```

5. **Don't create massive tools**
   ```typescript
   // ❌ WRONG: One tool does everything
   
   // ✅ RIGHT: Separate focused tools
   // - material_availability (check stock)
   // - bom_explosion (explode BOM)
   // - create_work_order (create production order)
   ```

---

## Workflow Implementation Pattern

Follow the Hotel O2C workflow as reference:

```python
from langgraph.graph import StateGraph
from typing import TypedDict

class WorkflowState(TypedDict):
    # Define state fields
    customer: str
    items: list
    status: str
    # ...

def node_function(state: WorkflowState) -> dict:
    """Execute one operation"""
    # Call tool
    result = tool_handler(state)
    
    # Return state updates
    return {"status": "completed", "result": result}

# Build graph
graph = StateGraph(WorkflowState)
graph.add_node("step1", node_function)
graph.add_node("step2", another_function)
graph.add_edge("step1", "step2")
graph.set_entry_point("step1")

# Compile
workflow = graph.compile()
```

---

## AG-UI Frame Protocol

The agent gateway streams these frame types:

### 1. Chat Message
```json
{
  "type": "chat_message",
  "role": "assistant",
  "content": "I'll check room availability for you..."
}
```

### 2. Tool Call
```json
{
  "type": "tool_call",
  "tool_name": "room_availability",
  "input": {
    "room_type": "Deluxe",
    "check_in": "2025-10-15",
    "check_out": "2025-10-17"
  }
}
```

### 3. Tool Result
```json
{
  "type": "tool_result",
  "tool_name": "room_availability",
  "output": {
    "available_rooms": 5,
    "rooms": [...]
  }
}
```

### 4. UI Prompt (HITL Approval)
```json
{
  "type": "ui_prompt",
  "prompt_type": "approval",
  "summary": {
    "action": "Create Invoice",
    "doctype": "Sales Invoice",
    "data": {...}
  }
}
```

### 5. Status Update
```json
{
  "type": "status",
  "status": "processing",
  "message": "Analyzing hotel occupancy..."
}
```

---

## Troubleshooting Guide

### Tool Not Loading
1. Check tool file exports function correctly
2. Verify registry import path
3. Check industry is enabled in config
4. Review console logs for import errors

### API Connection Failed
1. Verify ERPNext is running
2. Check API credentials in .env
3. Test API manually: `curl -H "Authorization: token api_key:api_secret" http://localhost:8080/api/resource/Item`
4. Check network/firewall rules

### HITL Approval Not Showing
1. Verify risk assessment returns requires_approval: true
2. Check AG-UI stream emits ui_prompt frame
3. Verify frontend listens for ui_prompt type
4. Check browser console for errors

### Performance Issues
1. Check if batching is used for multiple records
2. Verify database indices exist
3. Review API call count (should be minimal)
4. Check network latency to ERPNext

---

## Security Checklist

Before deploying any code:

- [ ] Input validated with Zod schemas
- [ ] No raw SQL queries
- [ ] API credentials from environment only
- [ ] Errors sanitized before sending to client
- [ ] CORS configured with allowlist (not *)
- [ ] Rate limiting enabled
- [ ] Bearer token authentication required
- [ ] Audit logging implemented
- [ ] HITL approval for high-risk operations
- [ ] No sensitive data in logs

---

## Code Review Checklist

Before merging:

- [ ] Follows established patterns (see create_doc.ts)
- [ ] TypeScript types defined
- [ ] Zod schemas for validation
- [ ] Error handling implemented
- [ ] Execution time tracked
- [ ] JSDoc comments added
- [ ] No lint errors
- [ ] Tests written (unit + integration)
- [ ] Works with Hotel vertical (reference)
- [ ] Documented in PR description

---

## Quick Reference: Key Files

```
services/agent-gateway/src/
├── api.ts              # FrappeAPIClient wrapper
├── agent.ts            # Claude agent creation
├── server.ts           # Express app entry
├── streaming.ts        # AG-UI SSE implementation
├── session.ts          # Session management
├── routes/
│   ├── agui.ts         # Main AG-UI endpoint
│   └── health.ts       # Health check
├── middleware/
│   ├── auth.ts         # Bearer token validation
│   ├── validation.ts   # Zod validation middleware
│   └── logging.ts      # Request logging
└── tools/
    ├── registry.ts     # Dynamic tool registry
    ├── common/         # Common tools (8)
    ├── hotel/          # Hotel tools (2)
    ├── hospital/       # Hospital tools (3)
    ├── manufacturing/  # Manufacturing tools (2)
    ├── retail/         # Retail tools (2)
    └── education/      # Education tools (2)

apps/common/
└── risk_classifier.py  # Risk assessment logic

services/workflows/
├── hotel/
│   └── o2c.py         # Order-to-Cash workflow
└── hospital/
    └── admissions.py  # (Planned)

frontend/coagent/
└── app/
    └── page.tsx       # CopilotKit integration
```

---

## Tips for AI Agents

1. **Always read existing implementations first** before creating new code
2. **Follow the Hotel vertical** as the reference implementation
3. **Use TypeScript strictly** - no any types without good reason
4. **Test incrementally** - don't write 500 lines without testing
5. **Ask for clarification** if requirements are ambiguous
6. **Document decisions** in code comments
7. **Keep it simple** - don't over-engineer
8. **Security first** - validate, sanitize, log
9. **Performance matters** - batch, stream, cache
10. **User experience** - clear messages, fast responses

---

If the agent (Claude, Cursor, Codex or other) adheres to these rules when generating or modifying code, it will maintain architectural integrity, security, and forward flexibility. **Use this file as a guardrail.**

---

**Last Updated**: October 1, 2025  
**Version**: 1.1.0  
**Maintainer**: Project Team
