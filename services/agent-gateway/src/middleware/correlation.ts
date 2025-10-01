/**
 * Correlation ID Middleware
 * Generates or extracts correlation IDs for request tracking (per comment-1.md)
 */

import { Request, Response, NextFunction } from 'express';
import { randomUUID } from 'crypto';

/**
 * Correlation middleware
 * Attaches correlation_id to all requests for observability
 */
export function correlationMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Check if client provided correlation ID
  let correlationId = req.headers['x-correlation-id'] as string;

  // Generate new correlation ID if not provided
  if (!correlationId) {
    correlationId = randomUUID();
  }

  // Attach to request object
  (req as any).correlationId = correlationId;

  // Echo back in response header
  res.setHeader('X-Correlation-ID', correlationId);

  next();
}
