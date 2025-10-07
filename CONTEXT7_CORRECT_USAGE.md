# Context7 MCP Tool - Correct Usage Guide

## What Context7 Actually Is

**Context7 is a generic MCP server that provides up-to-date documentation for ANY library/framework**, not just ERPNext. It's already installed in your VS Code MCP configuration.

## Correct Use Cases

### 1. **CopilotKit AG-UI Protocol Documentation**
```typescript
// When AI needs to understand how to emit AG-UI events properly
await context7.searchDocs({
  query: "AG-UI protocol event types message tool_call tool_result ui_state_update",
  libraryId: "/copilotkit/copilotkit",
  limit: 5
});
```

### 2. **LangGraph Agent Patterns**
```typescript
// When building agent workflows
await context7.searchDocs({
  query: "langgraph agent state management checkpointing human in the loop",
  libraryId: "/langchain-ai/langgraph",
  limit: 5
});
```

### 3. **React/Next.js APIs**
```typescript
// When implementing features
await context7.searchDocs({
  query: "next.js server actions streaming response",
  libraryId: "/vercel/next.js",
  limit: 5
});
```

### 4. **ERPNext/Frappe (One of Many Use Cases)**
```typescript
// ERPNext is just ONE library Context7 can query
await context7.searchDocs({
  query: "frappe doctype creation custom fields",
  libraryId: "/frappe/frappe",
  limit: 5
});
```

### 5. **Any npm Library**
```typescript
// Query documentation for any library
await context7.searchDocs({
  query: "prisma schema migrations",
  libraryId: "/prisma/prisma",
  limit: 5
});
```

## Why This Matters

### ❌ Wrong Understanding
> "Context7 is for ERPNext documentation"

### ✅ Correct Understanding
> "Context7 is a generic documentation MCP that can query ANY library's docs - including CopilotKit AG-UI protocol, LangGraph patterns, React APIs, ERPNext, or any npm package"

## How the AI Should Use It

### Scenario 1: Implementing AG-UI Events
**User asks**: "How do I emit a tool_result event properly?"

**AI should**:
```typescript
// 1. Query Context7 for AG-UI protocol docs
const aguiDocs = await mcp_context7_docs_search({
  query: "AG-UI tool_result event format structure",
  libraryId: "/copilotkit/copilotkit"
});

// 2. Use the docs to implement correctly
stream.emit('tool_result', {
  tool_call_id: toolId,
  tool_name: 'search_doc',
  result: { /* based on docs */ }
});
```

### Scenario 2: Building LangGraph Workflow
**User asks**: "Create an agent with approval gates"

**AI should**:
```typescript
// Query LangGraph patterns
const langgraphDocs = await mcp_context7_docs_search({
  query: "langgraph interrupt approval human in the loop",
  libraryId: "/langchain-ai/langgraph"
});

// Implement based on latest patterns from docs
```

### Scenario 3: ERPNext Development
**User asks**: "How do I create a custom doctype?"

**AI should**:
```typescript
// Query Frappe docs (one of many libraries)
const frappeDocs = await mcp_context7_docs_search({
  query: "frappe custom doctype creation fields",
  libraryId: "/frappe/frappe"
});
```

## Current Tool Implementation

The tool is **already generic** - no changes needed:

```typescript
// services/agent-gateway/src/tools/common/mcp_context7_docs.ts
export const mcp_context7_docs_search_tool: ToolDefinition = {
  name: 'mcp_context7_docs_search',
  description: 'Search Context7 for library documentation (CopilotKit, LangGraph, React, ERPNext/Frappe, etc.) to ground planning/code with latest APIs and best practices. Use libraryId to target specific libraries (e.g., "/copilotkit/copilotkit" for AG-UI protocol docs).',
  inputSchema: Context7SearchInput,
  // ... handler queries any library via Context7 MCP
};
```

## VS Code MCP Configuration

Context7 is already installed in your VS Code:

```json
// .vscode/mcp-config.json (or similar)
{
  "mcpServers": {
    "context7": {
      "command": "context7-mcp-server",
      "args": [],
      "env": {
        "CONTEXT7_API_KEY": "your-key-here"
      }
    }
  }
}
```

## Documentation Corrections Made

Fixed these files to reflect generic usage:
- ✅ `AGUI_NATIVE_INTEGRATION.md` - Updated Context7 description
- ✅ `AGUI_INTEGRATION_READY.md` - Updated Context7 description
- ✅ `IMPLEMENTATION_COMPLETE.md` - Updated Context7 description and MCP clients section
- ✅ `PHASE_8_READY_TO_BUILD.md` - Updated Context7 description

## Key Takeaway

**Context7 = Generic documentation MCP for ANY library**

Not just ERPNext. Use it to query:
- ✅ CopilotKit AG-UI protocol (event formats, best practices)
- ✅ LangGraph patterns (agent workflows, state management)
- ✅ React/Next.js APIs (server actions, streaming, etc.)
- ✅ ERPNext/Frappe (custom doctypes, workflows, etc.)
- ✅ Any npm library (Prisma, Tailwind, etc.)

The tool stays generic - the AI chooses which library to query based on the task!

