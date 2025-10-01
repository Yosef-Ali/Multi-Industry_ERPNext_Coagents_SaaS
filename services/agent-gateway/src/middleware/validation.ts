/**
 * T075: Zod Request Validation Middleware
 * Validates request payloads using Zod schemas (per comment-1.md)
 */

import { Request, Response, NextFunction } from 'express';
import { z, ZodError, ZodSchema } from 'zod';

/**
 * Create validation middleware for a Zod schema
 * @param schema - Zod schema to validate against
 * @param source - Which part of request to validate ('body' | 'query' | 'params')
 */
export function validateRequest(
  schema: ZodSchema,
  source: 'body' | 'query' | 'params' = 'body'
) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      // Get data from specified source
      const data = req[source];

      // Validate and parse
      const validated = schema.parse(data);

      // Replace original data with validated/parsed data
      req[source] = validated;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Format Zod validation errors for client
        const errors = error.errors.map(err => ({
          path: err.path.join('.'),
          message: err.message,
          code: err.code,
        }));

        res.status(400).json({
          error: 'validation_error',
          message: 'Request validation failed',
          validation_errors: errors,
          correlation_id: (req as any).correlationId,
        });
      } else {
        // Unexpected error during validation
        res.status(500).json({
          error: 'internal_error',
          message: 'Validation processing failed',
          correlation_id: (req as any).correlationId,
        });
      }
    }
  };
}

/**
 * Combine multiple validation middlewares
 * Useful for validating multiple parts of request
 */
export function validateMultiple(validations: {
  body?: ZodSchema;
  query?: ZodSchema;
  params?: ZodSchema;
}) {
  const middlewares: ReturnType<typeof validateRequest>[] = [];

  if (validations.params) {
    middlewares.push(validateRequest(validations.params, 'params'));
  }
  if (validations.query) {
    middlewares.push(validateRequest(validations.query, 'query'));
  }
  if (validations.body) {
    middlewares.push(validateRequest(validations.body, 'body'));
  }

  return middlewares;
}

/**
 * Common validation schemas
 * Reusable across multiple endpoints
 */
export const CommonSchemas = {
  // Pagination
  pagination: z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().positive().max(100).optional().default(20),
  }),

  // Date range
  dateRange: z.object({
    from_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
    to_date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  }),

  // DocType reference
  docRef: z.object({
    doctype: z.string().min(1),
    name: z.string().min(1),
  }),

  // Session context
  sessionContext: z.object({
    session_id: z.string().optional(),
    user_id: z.string(),
    doctype: z.string().optional(),
    doc_name: z.string().optional(),
  }),
};

/**
 * Validate tool input schemas
 * Tools must have input/output contracts (per comment-1.md)
 */
export function validateToolInput(toolName: string, schema: ZodSchema) {
  return (req: Request, res: Response, next: NextFunction): void => {
    try {
      const input = req.body.input || req.body;
      const validated = schema.parse(input);

      // Attach validated input to request
      (req as any).toolInput = validated;
      (req as any).toolName = toolName;

      next();
    } catch (error) {
      if (error instanceof ZodError) {
        res.status(400).json({
          error: 'tool_input_invalid',
          message: `Invalid input for tool: ${toolName}`,
          validation_errors: error.errors.map(err => ({
            path: err.path.join('.'),
            message: err.message,
          })),
          correlation_id: (req as any).correlationId,
        });
      } else {
        res.status(500).json({
          error: 'internal_error',
          message: 'Tool input validation failed',
          correlation_id: (req as any).correlationId,
        });
      }
    }
  };
}
