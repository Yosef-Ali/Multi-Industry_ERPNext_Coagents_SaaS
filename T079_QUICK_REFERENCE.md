# T079 Quick Reference Card

## ⚡ TL;DR

**Wrong**: "Implement Claude Agent SDK initialization"  
**Right**: "Implement Anthropic Messages API with streaming and tool use loop"

## 📦 Package & Imports

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});
```

## 🔄 Main Pattern: Tool Use Loop

```typescript
async function chat(message: string) {
  // Add user message to history
  conversationHistory.push({ role: 'user', content: message });

  let continueLoop = true;
  while (continueLoop) {
    // 1. Send to Claude
    const stream = client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      messages: conversationHistory,
      tools: toolDefinitions  // ← From registry
    });

    // 2. Handle streaming events
    const toolCalls = [];
    stream
      .on('text', (delta) => emitToFrontend(delta))
      .on('contentBlock', (block) => {
        if (block.type === 'tool_use') {
          toolCalls.push(block);
        }
      });

    await stream.finalMessage();

    // 3. Execute tools if any
    if (toolCalls.length === 0) {
      continueLoop = false; // Done!
      break;
    }

    // 4. Execute each tool
    const results = await Promise.all(
      toolCalls.map(async (call) => {
        const result = await executeTool(call.name, call.input);
        return {
          type: 'tool_result',
          tool_use_id: call.id,
          content: JSON.stringify(result)
        };
      })
    );

    // 5. Send results back to Claude
    conversationHistory.push({ role: 'user', content: results });
    
    // Loop continues...
  }
}
```

## 🛠️ Tool Definition Format

```typescript
{
  name: 'search_doc',
  description: 'Search ERPNext documents',
  input_schema: {
    type: 'object',
    properties: {
      doctype: { 
        type: 'string', 
        description: 'DocType name' 
      },
      filters: { 
        type: 'object' 
      }
    },
    required: ['doctype']
  }
}
```

## 🎯 Approval Gate Pattern

```typescript
async function executeTool(name: string, input: any) {
  // Check risk
  const risk = riskClassifier.classify(name, input);
  
  if (risk === 'high') {
    // Emit approval prompt to frontend
    aguiStream.emitApprovalPrompt(promptId, {
      operation: name,
      details: input
    });
    
    // Wait for user response
    const approved = await waitForUserApproval(promptId);
    if (!approved) {
      throw new Error('User cancelled');
    }
  }
  
  // Execute the tool
  return await toolHandler.execute(input);
}
```

## 📡 SSE Integration

```typescript
// In your streaming events handler
stream
  .on('text', (delta) => {
    aguiStream.emitTextDelta(delta);
  })
  .on('contentBlock', (block) => {
    if (block.type === 'tool_use') {
      aguiStream.emitToolCall(block.name, block.input);
    }
  })
  .on('error', (error) => {
    aguiStream.emitError('anthropic_error', error.message);
  });
```

## 🧪 Testing Checklist

- [ ] Tool definitions match JSON Schema format
- [ ] Tool loop executes multiple times
- [ ] Streaming events emit correctly
- [ ] Approval gates trigger for high-risk ops
- [ ] Tool results sent back to Claude
- [ ] Conversation history maintained
- [ ] Error handling for tool failures
- [ ] First token < 400ms
- [ ] Full response < 2.5s

## 📁 Files to Update

1. **`services/agent-gateway/src/agent.ts`**
   - `Agent` class: Add tool loop
   - `executeAgent()`: Add tool executor
   - `createCoagent()`: Already correct

2. **`services/agent-gateway/src/streaming.ts`**
   - Add `emitTextDelta()`
   - Add `emitToolCall()`
   - Add `emitToolResult()`
   - Add `emitApprovalPrompt()`

3. **`services/agent-gateway/src/tools/registry.ts`**
   - Ensure tools return JSON Schema format
   - Add type: `ToolDefinition`

## 🚀 Quick Start

```bash
# 1. Install package (should already be in package.json)
npm install @anthropic-ai/sdk

# 2. Set API key
export ANTHROPIC_API_KEY=sk-ant-...

# 3. Test basic streaming
npx tsx src/agent.ts

# 4. Run integration test
npm test src/agent.test.ts
```

## 🔗 Documentation

- **Implementation Guide**: `T079_IMPLEMENTATION_GUIDE.md` (detailed)
- **Review Summary**: `T079_REVIEW_SUMMARY.md` (what changed)
- **This Card**: Quick reference

## ⚠️ Common Mistakes

1. ❌ Using `client.messages.create()` without streaming
2. ❌ Not looping for multi-turn tool use
3. ❌ Wrong tool definition format
4. ❌ Not sending `tool_result` back to Claude
5. ❌ Not integrating with AGUIStreamEmitter
6. ❌ Not handling approval gates

## ✅ Success Criteria

- Claude can use multiple tools in sequence
- Frontend sees streaming text in real-time
- Approval dialogs appear for high-risk ops
- Tool results feed back into conversation
- Error messages are user-friendly
- Performance meets <400ms first token target

---

**Save this**: Print it, bookmark it, or keep it open while coding!
