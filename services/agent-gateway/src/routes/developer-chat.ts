/**
 * Developer Chat Route with LangGraph HITL Integration
 *
 * Implements interrupt() pattern for human-in-the-loop approval gates
 */

import { Router, Request, Response } from 'express';
import { createDeveloperChatGraph, DeveloperChatStateType } from '../coagents/developer-workflow';
import { createAppropriateCheckpointer } from '../coagents/checkpointer';
import { v4 as uuidv4 } from 'uuid';

const router = Router();

// Create graph with checkpointer
const checkpointer = createAppropriateCheckpointer();
const graph = createDeveloperChatGraph(checkpointer);

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

    // Stream workflow execution
    for await (const state of graph.stream(initialState, config)) {
      const stateData = state as DeveloperChatStateType;

      // Check if waiting for approval
      if (stateData.approved === null && stateData.approvalNeeded) {
        // INTERRUPT - send approval request to client
        const approvalMessage = stateData.messages.find(
          m => m.role === 'assistant' && m.content.includes('approval_request')
        );

        if (approvalMessage) {
          const approvalData = JSON.parse(approvalMessage.content);
          const event = {
            type: 'interrupt',
            subtype: 'approval_request',
            data: approvalData.data,
            chatId,
          };

          res.write(`data: ${JSON.stringify(event)}\n\n`);
          console.log(`[Developer Chat] ⏸️  INTERRUPT - Waiting for approval on chat: ${chatId}`);

          // End stream - client must resume with approval decision
          res.write(`data: ${JSON.stringify({ type: 'end', chatId })}\n\n`);
          return res.end();
        }
      }

      // Stream state updates
      const event = {
        type: 'state_update',
        data: {
          chatId: stateData.chatId,
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

    // Get current state
    const currentState = await checkpointer.getTuple(config);

    if (!currentState) {
      return res.status(404).json({
        error: 'Conversation not found',
        chatId
      });
    }

    // Resume with approval decision
    const resumeState: Partial<DeveloperChatStateType> = {
      approved: approved === true,
    };

    // Set SSE headers
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache');
    res.setHeader('Connection', 'keep-alive');

    console.log(`[Developer Chat] Resuming workflow for chat: ${chatId} with approved=${approved}`);

    // Continue workflow from where it paused
    for await (const state of graph.stream(resumeState, config)) {
      const stateData = state as DeveloperChatStateType;

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
 */
router.get('/:chatId/history', async (req: Request, res: Response) => {
  try {
    const { chatId } = req.params;

    const config = {
      configurable: {
        thread_id: chatId
      }
    };

    const checkpoints = await checkpointer.list(config, 10);

    res.json({
      chatId,
      checkpoints: checkpoints.map(([checkpoint, metadata]) => ({
        id: checkpoint.id,
        createdAt: metadata.createdAt,
        state: checkpoint.channel_values,
      }))
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
