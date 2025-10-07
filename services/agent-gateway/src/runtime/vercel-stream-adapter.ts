/**
 * Vercel AI Stream Adapter
 *
 * Converts Agent SDK streaming output to Vercel AI Chat protocol format
 * Enables frontend compatibility with existing Chat UI components
 */

import type { MessageStream } from '@anthropic-ai/sdk/lib/MessageStream';

export interface VercelStreamChunk {
  type:
    | 'text-delta'
    | 'tool-call'
    | 'tool-result'
    | 'error'
    | 'finish'
    | 'data-usage';
  content?: string;
  toolCallId?: string;
  toolName?: string;
  args?: any;
  result?: any;
  error?: string;
  usage?: any;
}

/**
 * Convert Agent SDK message stream to Vercel AI format
 *
 * Listens to Agent SDK events and yields Vercel-compatible chunks
 */
export async function* adaptAgentStreamToVercel(
  stream: MessageStream
): AsyncGenerator<VercelStreamChunk> {
  try {
    // Track tool calls for result mapping
    const toolCallMap = new Map<string, { name: string; input: any }>();

    // Handle text deltas
    stream.on('text', (textDelta: string) => {
      yield {
        type: 'text-delta',
        content: textDelta,
      };
    });

    // Handle content blocks (includes tool_use)
    stream.on('contentBlock', (block: any) => {
      if (block.type === 'tool_use') {
        // Tool call initiated
        const toolCallId = block.id;
        const toolName = block.name;
        const args = block.input;

        toolCallMap.set(toolCallId, { name: toolName, input: args });

        yield {
          type: 'tool-call',
          toolCallId,
          toolName,
          args,
        };
      }
    });

    // Handle errors
    stream.on('error', (error: Error) => {
      yield {
        type: 'error',
        error: error.message || 'Unknown error occurred',
      };
    });

    // Wait for final message
    const finalMessage = await stream.finalMessage();

    // Extract usage information
    if (finalMessage.usage) {
      yield {
        type: 'data-usage',
        usage: {
          promptTokens: finalMessage.usage.input_tokens,
          completionTokens: finalMessage.usage.output_tokens,
          totalTokens: finalMessage.usage.input_tokens + finalMessage.usage.output_tokens,
        },
      };
    }

    // Signal completion
    yield {
      type: 'finish',
    };

  } catch (error) {
    yield {
      type: 'error',
      error: error instanceof Error ? error.message : 'Stream processing error',
    };
  }
}

/**
 * Convert Vercel stream chunk to SSE format
 *
 * Formats chunks for Server-Sent Events transmission
 */
export function formatChunkAsSSE(chunk: VercelStreamChunk): string {
  return `data: ${JSON.stringify(chunk)}\n\n`;
}

/**
 * Create SSE stream from Agent SDK stream
 *
 * Combines adaptation and SSE formatting
 */
export async function* createSSEStream(
  stream: MessageStream
): AsyncGenerator<string> {
  for await (const chunk of adaptAgentStreamToVercel(stream)) {
    yield formatChunkAsSSE(chunk);
  }
}

/**
 * Tool result formatter for Vercel AI
 *
 * Formats tool execution results for frontend consumption
 */
export function formatToolResult(
  toolCallId: string,
  toolName: string,
  result: any,
  isError: boolean = false
): VercelStreamChunk {
  return {
    type: 'tool-result',
    toolCallId,
    toolName,
    result: isError ? undefined : result,
    error: isError ? (typeof result === 'string' ? result : JSON.stringify(result)) : undefined,
  };
}
