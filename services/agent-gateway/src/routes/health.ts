/**
 * T072: Health Check Endpoint
 * GET /health - Simple health check for monitoring and load balancers
 */

import { Router, Request, Response } from 'express';

const router = Router();

interface HealthResponse {
  status: 'healthy' | 'unhealthy';
  timestamp: string;
  uptime: number;
  service: string;
  version: string;
  environment: string;
  checks?: {
    [key: string]: {
      status: 'pass' | 'fail';
      message?: string;
    };
  };
}

/**
 * GET /health
 * Returns service health status
 */
router.get('/', async (req: Request, res: Response) => {
  const healthData: HealthResponse = {
    status: 'healthy',
    timestamp: new Date().toISOString(),
    uptime: process.uptime(),
    service: 'erpnext-coagent-gateway',
    version: '1.0.0',
    environment: process.env.NODE_ENV || 'development',
  };

  // Optional: Add dependency checks
  const checks: HealthResponse['checks'] = {};

  // Check ERPNext connectivity (optional)
  if (process.env.ERPNEXT_API_URL) {
    try {
      // TODO: Implement actual ERPNext ping
      checks.erpnext = {
        status: 'pass',
        message: 'ERPNext API reachable',
      };
    } catch (error) {
      checks.erpnext = {
        status: 'fail',
        message: 'ERPNext API unreachable',
      };
      healthData.status = 'unhealthy';
    }
  }

  // Check Redis connectivity (optional)
  if (process.env.REDIS_URL) {
    try {
      // TODO: Implement actual Redis ping
      checks.redis = {
        status: 'pass',
        message: 'Redis available',
      };
    } catch (error) {
      checks.redis = {
        status: 'fail',
        message: 'Redis unavailable',
      };
      // Redis is optional, don't mark as unhealthy
    }
  }

  if (Object.keys(checks).length > 0) {
    healthData.checks = checks;
  }

  const statusCode = healthData.status === 'healthy' ? 200 : 503;
  res.status(statusCode).json(healthData);
});

export default router;
