/**
 * T076: Error Sanitization Handler
 * Sanitizes errors to prevent internal stack traces from reaching client (per comment-1.md)
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Error object structure
 */
interface AppError extends Error {
  statusCode?: number;
  code?: string;
  isOperational?: boolean;
}

/**
 * Global error handling middleware
 * Must be registered LAST in middleware chain
 */
export function errorHandler(
  err: AppError,
  req: Request,
  res: Response,
  next: NextFunction
): void {
  // Extract correlation ID for tracking
  const correlationId = (req as any).correlationId || 'unknown';

  // Log full error details internally (with stack trace)
  console.error(`[${correlationId}] Error occurred:`, {
    message: err.message,
    stack: err.stack,
    code: err.code,
    statusCode: err.statusCode,
    url: req.url,
    method: req.method,
    ip: req.ip,
    userAgent: req.headers['user-agent'],
  });

  // Determine status code
  const statusCode = err.statusCode || 500;

  // Determine if error is operational (expected) or programming error
  const isOperational = err.isOperational !== false;

  // Sanitized error response for client
  // NEVER expose stack traces, internal paths, or sensitive details
  const sanitizedError = {
    error: err.code || getErrorCode(statusCode),
    message: isOperational ? err.message : 'An internal error occurred',
    correlation_id: correlationId,
    timestamp: new Date().toISOString(),
  };

  // Additional context for specific error types (safe to expose)
  if (statusCode === 400) {
    sanitizedError.message = err.message || 'Invalid request';
  } else if (statusCode === 401) {
    sanitizedError.message = err.message || 'Authentication required';
  } else if (statusCode === 403) {
    sanitizedError.message = err.message || 'Access denied';
  } else if (statusCode === 404) {
    sanitizedError.message = err.message || 'Resource not found';
  } else if (statusCode === 429) {
    sanitizedError.message = err.message || 'Rate limit exceeded';
  } else if (statusCode >= 500) {
    // Never expose internal error details
    sanitizedError.message = 'An internal error occurred. Please contact support.';
  }

  res.status(statusCode).json(sanitizedError);
}

/**
 * Get standard error code from HTTP status
 */
function getErrorCode(statusCode: number): string {
  switch (statusCode) {
    case 400:
      return 'bad_request';
    case 401:
      return 'unauthorized';
    case 403:
      return 'forbidden';
    case 404:
      return 'not_found';
    case 409:
      return 'conflict';
    case 422:
      return 'validation_error';
    case 429:
      return 'rate_limit_exceeded';
    case 500:
      return 'internal_error';
    case 502:
      return 'bad_gateway';
    case 503:
      return 'service_unavailable';
    case 504:
      return 'gateway_timeout';
    default:
      return 'error';
  }
}

/**
 * Create operational error (safe to expose message)
 */
export class OperationalError extends Error {
  statusCode: number;
  code: string;
  isOperational: boolean;

  constructor(message: string, statusCode: number = 500, code?: string) {
    super(message);
    this.statusCode = statusCode;
    this.code = code || getErrorCode(statusCode);
    this.isOperational = true;
    this.name = 'OperationalError';

    // Capture stack trace
    Error.captureStackTrace(this, this.constructor);
  }
}

/**
 * Handle unhandled rejections
 * Should be registered at application level
 */
export function handleUnhandledRejection(reason: any, promise: Promise<any>): void {
  console.error('Unhandled Promise Rejection:', {
    reason: reason?.message || reason,
    stack: reason?.stack,
    promise,
  });

  // In production, you might want to:
  // 1. Send alert to monitoring service
  // 2. Gracefully shutdown if critical
  // 3. Log to external error tracking (Sentry, etc.)
}

/**
 * Handle uncaught exceptions
 * Should be registered at application level
 */
export function handleUncaughtException(error: Error): void {
  console.error('Uncaught Exception:', {
    message: error.message,
    stack: error.stack,
  });

  // Critical: uncaught exceptions can leave app in undefined state
  // Best practice: log, alert, and gracefully shutdown
  console.error('Server shutting down due to uncaught exception');
  process.exit(1);
}
