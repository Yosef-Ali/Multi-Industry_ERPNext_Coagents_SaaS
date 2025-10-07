/**
 * Gateway Chat API Route
 *
 * Unified chat endpoint using Agent SDK with tool registry integration
 * Streams responses in Vercel AI Chat protocol format
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { createUniversalCoagent, executeUniversalAgent } from '../agent-universal';
import { CoagentSession } from '../session';
import { createAGUIStream, KeepAliveManager } from '../streaming';
import { getModelRegistry } from '../registry/model-registry';
import { getGlobalProvider } from '../ai/universal-provider';

const router = Router();

// ============================================
// REQUEST SCHEMAS
// ============================================

const ChatMessageSchema = z.object({
  role: z.enum(['user', 'assistant']),
  content: z.string(),
  id: z.string().optional(),
});

const ChatRequestSchema = z.object({
  messages: z.array(ChatMessageSchema),
  model: z.string().default('gemini-2.5-pro'),
  industries: z.array(z.string()).optional().default([]),
  sessionId: z.string().optional(),
  userId: z.string().optional(),
});

type ChatRequest = z.infer<typeof ChatRequestSchema>;

// ============================================
// ENDPOINTS
// ============================================

/**
 * POST /api/chat
 * Stream chat responses using Agent SDK
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    // Parse and validate request
    const body = ChatRequestSchema.parse(req.body);

    const { messages, model, industries, sessionId, userId } = body;

    // Validate model
    const registry = getModelRegistry();
    const modelInfo = registry.getModel(model);

    if (!modelInfo || !modelInfo.available) {
      return res.status(400).json({
        error: 'Invalid model',
        message: `Model '${model}' is not available`,
        suggestedModel: 'gemini-2.5-pro',
      });
    }

    // Create session
    const session: CoagentSession = {
      session_id: sessionId || `session-${Date.now()}`,
      user_id: userId || 'anonymous',
      enabled_industries: industries,
      doctype: undefined,
      doc_name: undefined,
      context: {},
    };

    // Create stream emitter (handles SSE headers)
    const correlationId = (req.headers['x-correlation-id'] as string) || `chat-${Date.now()}`;
    const stream = createAGUIStream(res, correlationId);
    const keepAlive = new KeepAliveManager(stream, 30000);
    keepAlive.start();

    // Emit initial connected status so clients see immediate SSE
    stream.emitStatus('connected', 'SSE connection established');

    try {
      // Create universal AI provider
      const aiProvider = await getGlobalProvider();

      // Create agent with tools (universal provider)
      const { agent, toolExecutor } = await createUniversalCoagent({
        session,
        stream,
        erpApiKey: process.env.ERPNEXT_API_KEY || '',
        erpApiSecret: process.env.ERPNEXT_API_SECRET || '',
        erpBaseUrl: process.env.ERPNEXT_API_URL || 'http://localhost:8000',
        aiProvider,
      });

      // Get last user message
      const lastUserMessage = messages.filter(m => m.role === 'user').pop();

      if (!lastUserMessage) {
        throw new Error('No user message found in request');
      }

      // Execute agent (this handles tool use loop internally)
      await executeUniversalAgent(agent, toolExecutor, lastUserMessage.content, stream);

      // Stream completed successfully
      keepAlive.stop();
      stream.close();

    } catch (error) {
      console.error('[Chat] Agent execution error:', error);

      // Send error event and close stream
      const message = error instanceof Error ? error.message : 'Unknown error';
      stream.emitError('agent_execution_error', message);
      keepAlive.stop();
      stream.close();
    }

  } catch (error) {
    console.error('[Chat] Request handling error:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid request',
        details: error.errors,
      });
    }

    return res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/chat/health
 * Health check for chat endpoint
 */
router.get('/health', (req: Request, res: Response) => {
  res.json({
    status: 'healthy',
    endpoint: '/api/chat',
    timestamp: new Date().toISOString(),
  });
});

export default router;
