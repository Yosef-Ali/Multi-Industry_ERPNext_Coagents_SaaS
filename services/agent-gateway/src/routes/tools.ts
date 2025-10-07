/**
 * Tools API Route
 *
 * Exposes tool registry via HTTP endpoints for frontend consumption
 * Enables dynamic tool loading and documentation display
 */

import { Router, Request, Response } from 'express';
import { z } from 'zod';
import { ToolRegistry, createToolRegistry } from '../tools/registry';

const router = Router();

// ============================================
// REQUEST SCHEMAS
// ============================================

const ListToolsQuerySchema = z.object({
  industries: z.string().optional(), // Comma-separated list
  includeDescription: z.enum(['true', 'false']).optional().default('true'),
});

// ============================================
// ENDPOINTS
// ============================================

/**
 * GET /api/tools
 * List available tools with optional industry filtering
 */
router.get('/', async (req: Request, res: Response) => {
  try {
    const query = ListToolsQuerySchema.parse(req.query);

    // Parse industries
    const industries = query.industries
      ? query.industries.split(',').map(i => i.trim())
      : [];

    // Create registry with requested industries
    const registry = createToolRegistry(industries);

    // Get all tools
    const allTools = registry.getAllTools();

    // Format tools for frontend
    const tools = allTools.map(tool => ({
      name: tool.name,
      description: query.includeDescription === 'true' ? tool.description : undefined,
      operationType: tool.operation_type,
      requiresApproval: tool.requires_approval,
      industry: tool.industry,
      // Simplify schema for frontend (Zod schema is too complex to serialize)
      inputSchema: {
        type: 'object',
        description: `Input schema for ${tool.name}`,
      },
    }));

    // Get registry stats
    const stats = registry.getStats();

    res.json({
      tools,
      meta: {
        total: tools.length,
        industries: industries.length > 0 ? industries : stats.enabled_industries,
        stats,
      },
    });

  } catch (error) {
    console.error('[ToolsAPI] Error listing tools:', error);

    if (error instanceof z.ZodError) {
      return res.status(400).json({
        error: 'Invalid query parameters',
        details: error.errors,
      });
    }

    res.status(500).json({
      error: 'Failed to fetch tools',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/tools/:name
 * Get specific tool details
 */
router.get('/:name', async (req: Request, res: Response) => {
  try {
    const toolName = req.params.name;

    if (!toolName) {
      return res.status(400).json({
        error: 'Tool name is required',
      });
    }

    // Create registry (need to know which industries to load)
    // For now, load all common tools
    const registry = createToolRegistry([]);

    const tool = registry.getTool(toolName);

    if (!tool) {
      return res.status(404).json({
        error: 'Tool not found',
        toolName,
      });
    }

    // Format tool for frontend
    res.json({
      tool: {
        name: tool.name,
        description: tool.description,
        operationType: tool.operation_type,
        requiresApproval: tool.requires_approval,
        industry: tool.industry,
        inputSchema: {
          type: 'object',
          description: `Input schema for ${tool.name}`,
        },
      },
    });

  } catch (error) {
    console.error('[ToolsAPI] Error fetching tool:', error);

    res.status(500).json({
      error: 'Failed to fetch tool',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

/**
 * GET /api/tools/stats
 * Get tool registry statistics
 */
router.get('/stats', async (req: Request, res: Response) => {
  try {
    // Create registry with no industries (common tools only)
    const registry = createToolRegistry([]);
    const stats = registry.getStats();

    res.json({
      stats,
    });

  } catch (error) {
    console.error('[ToolsAPI] Error fetching stats:', error);

    res.status(500).json({
      error: 'Failed to fetch stats',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
});

export default router;
