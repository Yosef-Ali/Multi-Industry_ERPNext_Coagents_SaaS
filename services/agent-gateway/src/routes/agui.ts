/**
 * T073: AG-UI SSE Streaming Endpoint
 * POST /agui - Server-Sent Events endpoint for CopilotKit AG-UI
 * Per comment-1.md: Stream chat messages, tool invocations, UI prompts, results
 */

import { Router, Request, Response } from 'express';
import { authMiddleware } from '../middleware/auth';
import { validateRequest } from '../middleware/validation';
import { z } from 'zod';
import { getSessionFromRequest } from '../session';
import { createAGUIStream, KeepAliveManager } from '../streaming';
import { createCoagent, executeAgent, handleApprovalResponse } from '../agent';

const router = Router();

// Request schema
const AGUIRequestSchema = z.object({
  session_id: z.string().optional(),
  user_id: z.string(),
  message: z.string().optional(),
  doctype: z.string().optional(),
  doc_name: z.string().optional(),
  enabled_industries: z.array(z.string()).optional(),
});

type AGUIRequest = z.infer<typeof AGUIRequestSchema>;

/**
 * POST /agui
 * Streaming endpoint for AG-UI events
 * Uses Server-Sent Events (SSE) to push real-time updates to frontend
 */
router.post(
  '/',
  authMiddleware, // Require bearer token
  validateRequest(AGUIRequestSchema), // Validate request body
  async (req: Request, res: Response) => {
    const request: AGUIRequest = req.body;
    const correlationId = (req as any).correlationId;
    const token = (req as any).token;

    // Create or get session
    const session = getSessionFromRequest(req, {
      session_id: request.session_id,
      user_id: request.user_id,
      doctype: request.doctype,
      doc_name: request.doc_name,
      enabled_industries: request.enabled_industries,
    });

    // Create AG-UI stream emitter
    const stream = createAGUIStream(res, correlationId);

    // Send initial connection frame
    stream.emitStatus('connected', `AG-UI stream established for session ${session.session_id}`);

    // Setup keep-alive manager
    const keepAlive = new KeepAliveManager(stream, 30000);
    keepAlive.start();

    // Cleanup on client disconnect
    req.on('close', () => {
      keepAlive.stop();
      console.log(`[${correlationId}] Client disconnected from AG-UI stream`);
    });

    try {
      // Get ERPNext credentials from environment
      const erpApiKey = process.env.ERPNEXT_API_KEY || '';
      const erpApiSecret = process.env.ERPNEXT_API_SECRET || '';
      const erpBaseUrl = process.env.ERPNEXT_BASE_URL || 'http://localhost:8080';

      if (!erpApiKey || !erpApiSecret) {
        stream.emitError(
          'configuration_error',
          'ERPNext API credentials not configured. Please contact administrator.'
        );
        stream.close();
        return;
      }

      // Create Claude Agent with tools
      const agent = await createCoagent({
        session,
        stream,
        erpApiKey,
        erpApiSecret,
        erpBaseUrl,
      });

      // If message provided, execute agent
      if (request.message && request.message.trim()) {
        await executeAgent(agent, request.message, stream);
      } else {
        // No message - just send welcome
        stream.emitMessage(
          'assistant',
          session.doctype
            ? `I'm ready to assist with ${session.doctype}${
                session.doc_name ? ` "${session.doc_name}"` : ''
              }. What would you like to do?`
            : "Hello! I'm your ERPNext coagent assistant. How can I help you today?"
        );
      }

      // Complete the stream
      stream.close();
    } catch (error: any) {
      console.error(`[${correlationId}] AG-UI stream error:`, error);

      // Stream error to client (sanitized)
      if (!stream.isClosed()) {
        stream.emitError(
          'internal_error',
          'An error occurred while processing your request. Please try again.'
        );
        stream.close();
      }
    } finally {
      keepAlive.stop();
    }
  }
);

export default router;
