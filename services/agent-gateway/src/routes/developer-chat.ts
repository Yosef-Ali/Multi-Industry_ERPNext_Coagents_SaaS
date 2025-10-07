/**
 * Developer Chat Route with LangGraph HITL Integration
 *
 * Implements interrupt() pattern for human-in-the-loop approval gates
 */

import { Router, Request, Response } from 'express';
import { createDeveloperChatGraph, DeveloperChatStateType } from '../coagents/developer-workflow-fixed';
import { Command } from '@langchain/langgraph';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Create graph with built-in MemorySaver (local dev)
const graph = createDeveloperChatGraph(true);

/**
 * POST /developer-chat
 * Start or continue a developer chat conversation
 */
router.post('/', async (req: Request, res: Response) => {
  try {
    const {
      chatId = uuidv4(),
      userId,
      message,
      approved, // User's approval decision (for resume)
    } = req.body;

    if (!userId || !message) {
      return res.status(400).json({
        error: 'Missing required fields: userId, message'
      });
    }

    // Configuration with thread_id for checkpointing
    const config = {
      configurable: {
        thread_id: chatId
      }
    };

    // Initial state
    const initialState: Partial<DeveloperChatStateType> = {
      chatId,
      userId,
      userMessage: message,
      messages: [{
        role: 'user',
        content: message
      }]
    };

    // If resuming with approval decision
    if (approved !== undefined) {
      initialState.approved = approved;
    }

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    console.log(`[Developer Chat] Starting workflow for chat: ${chatId}`);

    // Stream workflow execution (correct API for LangGraph 0.2+)
    for await (const chunk of await graph.stream(initialState, config)) {
      // Check for interrupt event
      if ('__interrupt__' in chunk) {
        const interruptData = (chunk as any).__interrupt__[0];
        const interruptValue = interruptData.value;

        console.log(`[Developer Chat] ⏸️  INTERRUPT detected - Waiting for approval on chat: ${chatId}`);
        console.log('[Developer Chat] Interrupt data:', interruptValue);

        // Send interrupt event to client
        const event = {
          type: 'interrupt',
          subtype: interruptValue.type || 'approval_request',
          data: interruptValue,
          chatId,
        };

        res.write(`data: ${JSON.stringify(event)}\n\n`);

        // End stream - client must resume with approval decision
        res.write(`data: ${JSON.stringify({ type: 'end', chatId })}\n\n`);
        return res.end();
      }

      // Regular state update
      const stateData = chunk as DeveloperChatStateType;
      const event = {
        type: 'state_update',
        data: {
          chatId: stateData.chatId || chatId,
          riskLevel: stateData.riskLevel,
          approved: stateData.approved,
          response: stateData.response,
          error: stateData.error,
        }
      };

      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }

    // Workflow complete
    res.write(`data: ${JSON.stringify({ type: 'complete', chatId })}\n\n`);
    res.end();

  } catch (error) {
    console.error('[Developer Chat] Error:', error);
    res.status(500).json({
      error: 'Internal server error',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * POST /developer-chat/resume
 * Resume a paused workflow after user approval
 */
router.post('/resume', async (req: Request, res: Response) => {
  try {
    const { chatId, approved } = req.body;

    if (!chatId || approved === undefined) {
      return res.status(400).json({
        error: 'Missing required fields: chatId, approved'
      });
    }

    const config = {
      configurable: {
        thread_id: chatId
      }
    };

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    console.log(`[Developer Chat] Resuming workflow for chat: ${chatId} with approved=${approved}`);

    // Resume with Command pattern (LangGraph 0.2+)
    // LangGraph rejects false/null as empty, so we use strings for both cases
    const resumeValue = approved ? "APPROVED" : "REJECTED";
    console.log(`[Developer Chat] Resuming with value: ${resumeValue}`);

    const resumeCommand = new Command({ resume: resumeValue });

    // Continue workflow from where it paused
    for await (const chunk of await graph.stream(resumeCommand, config)) {
      const stateData = chunk as DeveloperChatStateType;

      const event = {
        type: 'state_update',
        data: {
          chatId: stateData.chatId,
          response: stateData.response,
          error: stateData.error,
          toolResults: stateData.toolResults,
        }
      };

      res.write(`data: ${JSON.stringify(event)}\n\n`);
    }

    res.write(`data: ${JSON.stringify({ type: 'complete', chatId })}\n\n`);
    res.end();

  } catch (error) {
    console.error('[Developer Chat] Resume error:', error);
    res.status(500).json({
      error: 'Failed to resume conversation',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

/**
 * GET /developer-chat/:chatId/history
 * Get conversation history
 * TODO: Implement with checkpointer access
 */
router.get('/:chatId/history', async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;

    res.json({
      chatId,
      checkpoints: [],
      message: 'History endpoint not yet implemented'
    });

  } catch (error) {
    console.error('[Developer Chat] History error:', error);
    res.status(500).json({
      error: 'Failed to fetch history',
      message: error instanceof Error ? error.message : 'Unknown error'
    });
  }
});

export default router;
