# T079: Anthropic Messages API Implementation Guide

**Updated**: October 1, 2025  
**Based on**: Official Anthropic SDK TypeScript Documentation

## Summary of Changes

The original task description was **too vague** and didn't reflect how the Anthropic SDK actually works. Here's what changed:

### ❌ Original (Incorrect)
```
T079 Implement Claude Agent SDK initialization in services/agent-gateway/src/agent.ts with tool registry integration
```

**Problems:**
- No "Claude Agent SDK" exists - it's the **Anthropic TypeScript SDK**
- Didn't specify the **Messages API** which is the core interface
- Missed **streaming** requirement (critical for real-time UX)
- Didn't mention **tool use loop** (required for function calling)
- No mention of **tool_result** handling
- Vague about **approval gate integration**

### ✅ Updated (Correct)
```
T079 Implement Anthropic Messages API with streaming, tool use loop, and approval gate integration in services/agent-gateway/src/agent.ts 

Uses:
- client.messages.stream() with tool definitions
- Handles tool_use blocks from Claude
- Returns tool_result blocks to continue conversation
- Integrates with AGUIStreamEmitter for real-time updates
```

## Architecture Overview

```
User Request
    ↓
[Express /agui Endpoint]
    ↓
[AGUIStreamEmitter] ← SSE Connection to Frontend
    ↓
[createCoagent()] ← Initialize with tool registry
    ↓
[executeAgent()] ← Main conversation loop
    ↓
[Anthropic Messages API]
    ├─ Stream text responses → Frontend
    ├─ Detect tool_use blocks → Execute tool
    ├─ Send tool_result back → Continue conversation
    └─ Handle approval gates → Wait for user response
```

## Key Concepts from Documentation

### 1. Messages API (Not "Agent SDK")

The correct API is `client.messages.create()` or `client.messages.stream()`:

```typescript
import Anthropic from '@anthropic-ai/sdk';

const client = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
});

// Streaming approach (recommended for real-time UX)
const stream = client.messages.stream({
  model: 'claude-sonnet-4-20250514',
  max_tokens: 1024,
  messages: [
    { role: 'user', content: 'Hello, Claude' }
  ],
  tools: [
    {
      name: 'get_weather',
      description: 'Get weather for a location',
      input_schema: {
        type: 'object',
        properties: {
          location: { type: 'string', description: 'City name' }
        },
        required: ['location']
      }
    }
  ]
});
```

### 2. Tool Use Loop

When Claude wants to use a tool, it emits a `tool_use` content block:

```typescript
// Tool use event structure (from docs)
{
  type: "tool_use",
  id: "toolu_01NRLabsLyVHZPKxbKvkfSMn",
  name: "get_weather",
  input: { location: "Paris" }
}
```

**Your responsibility:**
1. Execute the tool (call your handler)
2. Send result back to Claude as a `tool_result` block
3. Claude continues the conversation with the result

```typescript
// Send tool result back to Claude
{
  type: "tool_result",
  tool_use_id: "toolu_01NRLabsLyVHZPKxbKvkfSMn",
  content: "The weather in Paris is 22°C and sunny"
}
```

### 3. Streaming Events

The `MessageStream` object emits several events:

```typescript
stream
  .on('text', (textDelta) => {
    // Text being generated
    aguiStream.emitTextDelta(textDelta);
  })
  .on('contentBlock', (block) => {
    // New content block started (text or tool_use)
    if (block.type === 'tool_use') {
      aguiStream.emitToolCall(block.name, block.input);
    }
  })
  .on('message', (message) => {
    // Message chunk complete
  })
  .on('finalMessage', (message) => {
    // Entire message complete
  })
  .on('error', (error) => {
    // Error occurred
    aguiStream.emitError('anthropic_error', error.message);
  });
```

### 4. Tool Definitions

Tools must follow JSON Schema format:

```typescript
interface ToolDefinition {
  name: string;
  description: string;
  input_schema: {
    type: 'object';
    properties: Record<string, any>;
    required?: string[];
  };
}

// Example from your tool registry
const tools: ToolDefinition[] = [
  {
    name: 'search_doc',
    description: 'Search ERPNext documents by doctype and filters',
    input_schema: {
      type: 'object',
      properties: {
        doctype: { type: 'string', description: 'DocType to search (e.g., "Customer")' },
        filters: { type: 'object', description: 'Search filters' },
        limit: { type: 'number', description: 'Max results', default: 20 }
      },
      required: ['doctype']
    }
  },
  {
    name: 'create_doc',
    description: 'Create a new ERPNext document (requires approval)',
    input_schema: {
      type: 'object',
      properties: {
        doctype: { type: 'string' },
        doc: { type: 'object', description: 'Document fields' }
      },
      required: ['doctype', 'doc']
    }
  }
];
```

## Implementation Steps

### Step 1: Update Agent Class

Replace the TODO stubs with actual Anthropic API calls:

```typescript
export class Agent {
  private client: Anthropic;
  private tools: ToolDefinition[];
  private systemPrompt: string;
  private conversationHistory: Anthropic.MessageParam[] = [];

  constructor(config: {
    client: Anthropic;
    tools: ToolDefinition[];
    systemPrompt: string;
  }) {
    this.client = config.client;
    this.tools = config.tools;
    this.systemPrompt = config.systemPrompt;
  }

  async chat(
    message: string,
    stream: AGUIStreamEmitter,
    toolExecutor: ToolExecutor
  ): Promise<void> {
    // Add user message to history
    this.conversationHistory.push({
      role: 'user',
      content: message
    });

    // Main conversation loop - keep going until no more tool calls
    let continueLoop = true;

    while (continueLoop) {
      continueLoop = await this.executeOneTurn(stream, toolExecutor);
    }
  }

  private async executeOneTurn(
    stream: AGUIStreamEmitter,
    toolExecutor: ToolExecutor
  ): Promise<boolean> {
    // Start streaming from Claude
    const messageStream = this.client.messages.stream({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 4096,
      system: this.systemPrompt,
      messages: this.conversationHistory,
      tools: this.tools
    });

    // Track tool calls in this turn
    const toolCalls: Array<{ id: string; name: string; input: any }> = [];
    let assistantMessage = '';

    // Handle streaming events
    messageStream
      .on('text', (textDelta) => {
        assistantMessage += textDelta;
        stream.emitTextDelta(textDelta);
      })
      .on('contentBlock', (block) => {
        if (block.type === 'tool_use') {
          // Claude wants to use a tool
          toolCalls.push({
            id: block.id,
            name: block.name,
            input: block.input
          });
          stream.emitToolCall(block.name, block.input);
        }
      })
      .on('error', (error) => {
        stream.emitError('anthropic_error', error.message);
        throw error;
      });

    // Wait for completion
    const finalMessage = await messageStream.finalMessage();

    // Add assistant response to history
    this.conversationHistory.push({
      role: 'assistant',
      content: finalMessage.content
    });

    // If no tool calls, we're done
    if (toolCalls.length === 0) {
      stream.emitStatus('completed', 'Response complete');
      return false; // Stop loop
    }

    // Execute all tool calls and collect results
    const toolResults = await Promise.all(
      toolCalls.map(async (call) => {
        try {
          // Execute the tool
          const result = await toolExecutor.execute(
            call.name,
            call.input,
            stream
          );

          // Emit result to frontend
          stream.emitToolResult(call.id, result);

          return {
            type: 'tool_result' as const,
            tool_use_id: call.id,
            content: JSON.stringify(result)
          };
        } catch (error: any) {
          // Tool execution failed
          stream.emitToolError(call.id, error.message);

          return {
            type: 'tool_result' as const,
            tool_use_id: call.id,
            content: JSON.stringify({ error: error.message }),
            is_error: true
          };
        }
      })
    );

    // Add tool results to history
    this.conversationHistory.push({
      role: 'user',
      content: toolResults
    });

    // Continue loop to let Claude respond to tool results
    return true;
  }
}
```

### Step 2: Tool Executor Interface

Create a clean interface for executing tools:

```typescript
export interface ToolExecutor {
  execute(
    toolName: string,
    input: any,
    stream: AGUIStreamEmitter
  ): Promise<any>;
}

export class ERPNextToolExecutor implements ToolExecutor {
  constructor(
    private toolRegistry: ToolRegistry,
    private erpApiClient: FrappeAPIClient,
    private riskClassifier: RiskClassifier
  ) {}

  async execute(
    toolName: string,
    input: any,
    stream: AGUIStreamEmitter
  ): Promise<any> {
    // Get tool handler
    const handler = this.toolRegistry.getHandler(toolName);
    if (!handler) {
      throw new Error(`Unknown tool: ${toolName}`);
    }

    // Check if tool requires approval
    const risk = this.riskClassifier.classify(toolName, input);
    
    if (risk === 'high') {
      // Emit approval prompt to frontend
      const approved = await this.waitForApproval(
        toolName,
        input,
        stream
      );

      if (!approved) {
        throw new Error('User cancelled the operation');
      }
    }

    // Execute the tool handler
    return await handler.execute(input, this.erpApiClient);
  }

  private async waitForApproval(
    toolName: string,
    input: any,
    stream: AGUIStreamEmitter
  ): Promise<boolean> {
    // Generate unique prompt ID
    const promptId = randomUUID();

    // Emit approval prompt to frontend
    stream.emitApprovalPrompt(promptId, {
      operation: toolName,
      details: input,
      preview: this.generatePreview(toolName, input)
    });

    // Wait for user response (stored in session state)
    // This would be resolved by handleApprovalResponse()
    return new Promise((resolve) => {
      // Store resolver in session for handleApprovalResponse to call
      // Implementation depends on your session management
      stream.setApprovalResolver(promptId, resolve);
    });
  }

  private generatePreview(toolName: string, input: any): string {
    // Generate human-readable preview of the action
    switch (toolName) {
      case 'create_doc':
        return `Create new ${input.doctype}: ${JSON.stringify(input.doc, null, 2)}`;
      case 'update_doc':
        return `Update ${input.doctype} ${input.name}: ${JSON.stringify(input.doc, null, 2)}`;
      case 'submit_doc':
        return `Submit ${input.doctype}: ${input.name}`;
      case 'cancel_doc':
        return `Cancel ${input.doctype}: ${input.name}`;
      default:
        return JSON.stringify(input, null, 2);
    }
  }
}
```

### Step 3: Update executeAgent Function

```typescript
export async function executeAgent(
  agent: Agent,
  message: string,
  stream: AGUIStreamEmitter,
  config: CoagentConfig
): Promise<void> {
  try {
    // Emit processing status
    stream.emitStatus('processing', 'Processing your request...');

    // Create tool executor
    const toolExecutor = new ERPNextToolExecutor(
      new ToolRegistry(config.session.enabled_industries),
      createFrappeClientWithAPIKey(
        config.erpBaseUrl,
        config.erpApiKey,
        config.erpApiSecret
      ),
      new RiskClassifier()
    );

    // Execute agent (handles tool loop internally)
    await agent.chat(message, stream, toolExecutor);

    // Emit completion status
    stream.emitStatus('completed', 'Request completed successfully');
  } catch (error: any) {
    console.error('[Agent] Execution error:', error);

    // Emit error to stream
    stream.emitError(
      'agent_execution_error',
      'Failed to process your request. Please try again.',
      {
        message: error.message,
      }
    );

    throw error;
  }
}
```

### Step 4: Tool Registry Updates

Ensure ToolRegistry returns tools in Anthropic's format:

```typescript
export class ToolRegistry {
  getAllTools(): ToolDefinition[] {
    const tools: ToolDefinition[] = [];

    // Common tools (always available)
    tools.push(...this.getCommonTools());

    // Industry-specific tools
    for (const industry of this.enabledIndustries) {
      tools.push(...this.getIndustryTools(industry));
    }

    return tools;
  }

  private getCommonTools(): ToolDefinition[] {
    return [
      {
        name: 'search_doc',
        description: 'Search for ERPNext documents by doctype and filters. Returns matching documents with their details.',
        input_schema: {
          type: 'object',
          properties: {
            doctype: { 
              type: 'string', 
              description: 'The DocType to search (e.g., "Customer", "Sales Order", "Item")' 
            },
            filters: { 
              type: 'object', 
              description: 'Search filters as key-value pairs. Example: {"status": "Open", "customer": "ABC Corp"}' 
            },
            fields: { 
              type: 'array', 
              items: { type: 'string' },
              description: 'Fields to return. Default: all fields' 
            },
            limit: { 
              type: 'number', 
              description: 'Maximum number of results. Default: 20' 
            }
          },
          required: ['doctype']
        }
      },
      {
        name: 'get_doc',
        description: 'Get a specific ERPNext document by doctype and name. Returns full document details.',
        input_schema: {
          type: 'object',
          properties: {
            doctype: { type: 'string', description: 'The DocType' },
            name: { type: 'string', description: 'The document name/ID' }
          },
          required: ['doctype', 'name']
        }
      },
      {
        name: 'create_doc',
        description: 'Create a new ERPNext document. **Requires user approval**. Provide the doctype and all required fields.',
        input_schema: {
          type: 'object',
          properties: {
            doctype: { type: 'string', description: 'The DocType to create' },
            doc: { 
              type: 'object', 
              description: 'Document fields as key-value pairs. Must include all required fields for the doctype.' 
            }
          },
          required: ['doctype', 'doc']
        }
      },
      // ... other tools
    ];
  }
}
```

## Integration with AGUIStreamEmitter

Update AGUIStreamEmitter to support tool-specific events:

```typescript
export class AGUIStreamEmitter {
  // ... existing methods

  emitTextDelta(text: string): void {
    this.emit('message', {
      delta: { type: 'text_delta', text }
    });
  }

  emitToolCall(toolName: string, input: any): void {
    this.emit('tool_call', {
      tool_name: toolName,
      input
    });
  }

  emitToolResult(toolUseId: string, result: any): void {
    this.emit('tool_result', {
      tool_use_id: toolUseId,
      result
    });
  }

  emitToolError(toolUseId: string, error: string): void {
    this.emit('tool_result', {
      tool_use_id: toolUseId,
      error,
      is_error: true
    });
  }

  emitApprovalPrompt(promptId: string, details: any): void {
    this.emit('ui_prompt', {
      prompt_id: promptId,
      type: 'approval',
      details
    });
  }

  setApprovalResolver(promptId: string, resolver: (approved: boolean) => void): void {
    // Store in session or in-memory map
    // Will be called by handleApprovalResponse()
    this.approvalResolvers.set(promptId, resolver);
  }
}
```

## Testing Strategy

1. **Unit Tests**: Test tool execution without Claude
2. **Integration Tests**: Test full conversation loop with mocked Anthropic responses
3. **Contract Tests**: Verify tool definitions match tool handlers
4. **Performance Tests**: Ensure first token < 400ms, tool execution < 2.5s

```typescript
// Example test
describe('Agent Tool Use Loop', () => {
  it('should execute tool and continue conversation', async () => {
    const mockStream = new MockStreamEmitter();
    const mockClient = mockAnthropicClient({
      responses: [
        {
          content: [
            { type: 'tool_use', id: 'tool_1', name: 'search_doc', input: { doctype: 'Customer' } }
          ]
        },
        {
          content: [
            { type: 'text', text: 'Found 3 customers matching your search.' }
          ]
        }
      ]
    });

    const agent = new Agent({ client: mockClient, tools: [], systemPrompt: '' });
    await agent.chat('Show me all customers', mockStream, mockToolExecutor);

    expect(mockStream.events).toContainEqual(
      expect.objectContaining({ type: 'tool_call', tool_name: 'search_doc' })
    );
    expect(mockStream.events).toContainEqual(
      expect.objectContaining({ type: 'tool_result' })
    );
    expect(mockStream.events).toContainEqual(
      expect.objectContaining({ type: 'message', text: expect.stringContaining('Found 3 customers') })
    );
  });
});
```

## Key Takeaways

1. **Use Messages API**, not "Agent SDK"
2. **Stream responses** for real-time UX (`client.messages.stream()`)
3. **Handle tool_use blocks** by executing tools and returning `tool_result`
4. **Loop until no tools** are called (multi-turn tool use)
5. **Integrate approval gates** into tool executor
6. **Emit events** to AGUIStreamEmitter for frontend updates
7. **Follow JSON Schema** for tool definitions
8. **Test thoroughly** at multiple levels

## References

- [Anthropic SDK TypeScript](https://github.com/anthropics/anthropic-sdk-typescript)
- [Messages API Documentation](https://docs.anthropic.com/en/api/messages)
- [Tool Use Guide](https://docs.anthropic.com/en/docs/tool-use)
- [Streaming Responses](https://docs.anthropic.com/en/api/streaming)
