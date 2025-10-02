/**
 * Cloudflare Workers Entry Point
 * Compatible with Workers runtime (no Express)
 */

export interface Env {
  SESSIONS: KVNamespace;
  WORKFLOW_STATE: KVNamespace;
  DB: D1Database;
  OPENROUTER_API_KEY: string;
  OPENROUTER_MODEL: string;
  OPENROUTER_BASE_URL: string;
  WORKFLOW_SERVICE_URL: string;
  USE_MOCK_ERPNEXT: string;
  ERPNEXT_API_KEY?: string;
  ERPNEXT_API_SECRET?: string;
  ERPNEXT_BASE_URL?: string;
}

export default {
  async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname;

    // CORS headers
    const corsHeaders = {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    };

    // Handle OPTIONS request
    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    try {
      // Health check endpoint
      if (path === '/health' || path === '/health/') {
        return new Response(
          JSON.stringify({
            status: 'healthy',
            timestamp: new Date().toISOString(),
            service: 'erpnext-agent-gateway',
            version: '1.0.0',
            environment: 'production',
            openrouter: {
              configured: !!env.OPENROUTER_API_KEY,
              model: env.OPENROUTER_MODEL || 'not-set',
            },
            workflow_service: env.WORKFLOW_SERVICE_URL || 'not-set',
            mock_mode: env.USE_MOCK_ERPNEXT === 'true',
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // Root endpoint
      if (path === '/' || path === '') {
        return new Response(
          JSON.stringify({
            service: 'ERPNext Coagents - Agent Gateway',
            version: '1.0.0',
            status: 'running',
            endpoints: {
              health: 'GET /health',
              agui: 'POST /agui (coming soon)',
            },
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // AG-UI endpoint (placeholder for now)
      if (path === '/agui' && request.method === 'POST') {
        const body = await request.json();

        return new Response(
          JSON.stringify({
            message: 'AG-UI endpoint (Workers version)',
            received: body,
            note: 'Full implementation coming soon',
          }),
          {
            status: 200,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
          }
        );
      }

      // 404 for other routes
      return new Response(
        JSON.stringify({
          error: 'not_found',
          message: `Path ${path} not found`,
          available_endpoints: ['/', '/health', '/agui'],
        }),
        {
          status: 404,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    } catch (error: any) {
      return new Response(
        JSON.stringify({
          error: 'internal_error',
          message: error.message || 'An error occurred',
          timestamp: new Date().toISOString(),
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }
  },
};
