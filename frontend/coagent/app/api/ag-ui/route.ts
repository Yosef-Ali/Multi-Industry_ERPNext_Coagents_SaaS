/**
 * AG-UI Protocol Endpoint
 * Implements the Agent-User Interaction Protocol specification
 *
 * Streams AG-UI events via Server-Sent Events (SSE)
 * Compatible with AG-UI client SDK
 */

import { NextRequest } from 'next/server';
import OpenAI from 'openai';

interface AGUIRequest {
  messages: Array<{
    role: 'user' | 'assistant' | 'system';
    content: string;
  }>;
  context?: Record<string, any>;
  state?: Record<string, any>;
  tools?: Array<{
    name: string;
    description: string;
    parameters: Record<string, any>;
  }>;
}

/**
 * Create an SSE response stream
 */
function createSSEStream(encoder: TextEncoder) {
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  const send = async (event: any) => {
    const data = `data: ${JSON.stringify(event)}\n\n`;
    await writer.write(encoder.encode(data));
  };

  const close = async () => {
    await writer.close();
  };

  return { readable: stream.readable, send, close };
}

/**
 * POST handler - AG-UI protocol endpoint
 */
export async function POST(req: NextRequest) {
  // Get environment variables
  let env: any = process.env;
  try {
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const cfContext = getCloudflareContext();
    if (cfContext?.env) {
      env = cfContext.env;
    }
  } catch (e) {
    // Running in Node.js
  }

  const OPENROUTER_API_KEY = env.OPENROUTER_API_KEY || '';
  const OPENROUTER_MODEL = env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet';

  try {
    const body: AGUIRequest = await req.json();
    const { messages, context, state, tools } = body;

    // Create SSE stream
    const encoder = new TextEncoder();
    const { readable, send, close } = createSSEStream(encoder);

    // Start streaming in background
    (async () => {
      try {
        // Send agent state change event
        await send({
          type: 'agent_state_change',
          state: 'thinking',
          timestamp: new Date().toISOString(),
        });

        // Create OpenAI client pointing to OpenRouter
        const openai = new OpenAI({
          apiKey: OPENROUTER_API_KEY,
          baseURL: 'https://openrouter.ai/api/v1',
          defaultHeaders: {
            'HTTP-Referer': req.headers.get('referer') || 'http://localhost:3000',
            'X-Title': 'ERPNext AG-UI CoAgent',
          },
        });

        // Build system message with context
        const systemMessage = `You are a helpful AI assistant integrated into an ERPNext application.

${context ? `Current Context:\n${JSON.stringify(context, null, 2)}` : ''}

${state ? `Application State:\n${JSON.stringify(state, null, 2)}` : ''}

You can use AG-UI protocol to:
1. Stream text messages
2. Call tools
3. Render dynamic UI components
4. Update shared state

Respond naturally and use tools when appropriate.`;

        const fullMessages = [
          { role: 'system' as const, content: systemMessage },
          ...messages,
        ];

        // Send text message start event
        const messageId = `msg_${Date.now()}`;
        await send({
          type: 'text_message_start',
          id: messageId,
          timestamp: new Date().toISOString(),
        });

        // Stream response from OpenRouter
        const stream = await openai.chat.completions.create({
          model: OPENROUTER_MODEL,
          messages: fullMessages,
          stream: true,
          temperature: 0.7,
          max_tokens: 2000,
        });

        for await (const chunk of stream) {
          const content = chunk.choices[0]?.delta?.content;

          if (content) {
            // Send text content event
            await send({
              type: 'text_message_content',
              id: messageId,
              content,
              timestamp: new Date().toISOString(),
            });
          }

          // Check for tool calls (if model supports it)
          const toolCalls = chunk.choices[0]?.delta?.tool_calls;
          if (toolCalls) {
            for (const toolCall of toolCalls) {
              if (toolCall.function) {
                // Send tool call events
                await send({
                  type: 'tool_call_start',
                  id: toolCall.id || `tool_${Date.now()}`,
                  name: toolCall.function.name,
                  timestamp: new Date().toISOString(),
                });

                // In a real implementation, execute the tool here
                // For now, just send a mock result
                await send({
                  type: 'tool_call_result',
                  id: toolCall.id,
                  result: { success: true, message: 'Tool executed successfully' },
                  timestamp: new Date().toISOString(),
                });
              }
            }
          }
        }

        // Send text message end event
        await send({
          type: 'text_message_end',
          id: messageId,
          timestamp: new Date().toISOString(),
        });

        // Send agent state change event
        await send({
          type: 'agent_state_change',
          state: 'idle',
          timestamp: new Date().toISOString(),
        });

        // Send done event
        await send({
          type: 'done',
          timestamp: new Date().toISOString(),
        });
      } catch (error: any) {
        console.error('AG-UI streaming error:', error);

        // Send error event
        await send({
          type: 'error',
          message: error.message || 'An error occurred during streaming',
          code: error.code || 'UNKNOWN_ERROR',
          timestamp: new Date().toISOString(),
        });
      } finally {
        await close();
      }
    })();

    // Return SSE response
    return new Response(readable, {
      headers: {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        Connection: 'keep-alive',
      },
    });
  } catch (error: any) {
    console.error('AG-UI request error:', error);
    return new Response(
      JSON.stringify({
        error: error.message || 'Failed to process AG-UI request',
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * OPTIONS handler - Support CORS preflight
 */
export async function OPTIONS(req: NextRequest) {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type',
    },
  });
}
