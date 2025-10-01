/**
 * T074: Bearer Token Authentication Middleware
 * Validates bearer tokens for UI -> gateway requests (per comment-1.md)
 */

import { Request, Response, NextFunction } from 'express';

/**
 * Authentication middleware
 * Validates bearer token from Authorization header
 */
export function authMiddleware(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    res.status(401).json({
      error: 'unauthorized',
      message: 'Missing Authorization header',
      correlation_id: (req as any).correlationId,
    });
    return;
  }

  const parts = authHeader.split(' ');

  if (parts.length !== 2 || parts[0] !== 'Bearer') {
    res.status(401).json({
      error: 'unauthorized',
      message: 'Invalid Authorization format. Expected: Bearer <token>',
      correlation_id: (req as any).correlationId,
    });
    return;
  }

  const token = parts[1];

  // Validate token
  if (!isValidToken(token)) {
    res.status(401).json({
      error: 'unauthorized',
      message: 'Invalid or expired token',
      correlation_id: (req as any).correlationId,
    });
    return;
  }

  // Extract user info from token and attach to request
  try {
    const userInfo = decodeToken(token);
    (req as any).user = userInfo;
    (req as any).token = token;
    next();
  } catch (error) {
    res.status(401).json({
      error: 'unauthorized',
      message: 'Token validation failed',
      correlation_id: (req as any).correlationId,
    });
  }
}

/**
 * Validate bearer token
 * For MVP: Simple token validation
 * Production: Should validate against ERPNext session or JWT
 */
function isValidToken(token: string): boolean {
  // TODO: Implement actual token validation
  // Options:
  // 1. Validate against ERPNext session API
  // 2. Validate JWT if using JWT-based auth
  // 3. Validate against Redis session store

  // For now: Accept non-empty tokens
  // In production, this MUST be replaced with real validation
  if (!token || token.length < 10) {
    return false;
  }

  // Temporary: Allow development tokens
  if (process.env.NODE_ENV === 'development') {
    return token.startsWith('dev_') || token.length >= 32;
  }

  return true;
}

/**
 * Decode token to extract user information
 */
function decodeToken(token: string): {
  user_id: string;
  email?: string;
  roles?: string[];
} {
  // TODO: Implement actual token decoding
  // For JWT: Use jsonwebtoken library
  // For ERPNext session: Call ERPNext API to get user info

  // For now: Return mock user info
  // In production, this MUST decode real tokens
  if (process.env.NODE_ENV === 'development' && token.startsWith('dev_')) {
    return {
      user_id: 'dev_user',
      email: 'dev@example.com',
      roles: ['System Manager'],
    };
  }

  // Placeholder: Extract user_id from token
  // Real implementation should decode JWT or validate with ERPNext
  return {
    user_id: 'user_' + token.substring(0, 8),
  };
}

/**
 * Optional middleware: Extract ERPNext session token
 * For ERPNext-integrated deployments
 */
export function erpnextSessionMiddleware(req: Request, res: Response, next: NextFunction): void {
  // Check if request includes ERPNext session cookie
  const sid = req.cookies?.sid;

  if (sid) {
    // Validate ERPNext session
    // TODO: Call ERPNext API to validate session
    (req as any).erpnextSession = sid;
  }

  next();
}
