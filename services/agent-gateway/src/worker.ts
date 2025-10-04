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
            service: 'multi-industry-coagents-gateway',
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

      // AG-UI endpoint (Workers streaming proxy to Workflow Service)
      if (path === '/agui' && request.method === 'POST') {
        const body = await request.json().catch(() => ({} as any));
        const graph_name = body?.graph_name || body?.graphName || 'hotel_o2c';
        const initial_state = body?.initial_state || body?.initialState || {};

        if (!env.WORKFLOW_SERVICE_URL) {
          return new Response(
            JSON.stringify({
              error: 'configuration_error',
              message: 'WORKFLOW_SERVICE_URL is not configured in the Worker environment.',
            }),
            { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Forward to workflow service /execute with SSE streaming
        const upstream = await fetch(new URL('/execute', env.WORKFLOW_SERVICE_URL).toString(), {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Accept': 'text/event-stream',
          },
          body: JSON.stringify({ graph_name, initial_state, stream: true }),
        });

        if (!upstream.ok || !upstream.body) {
          const text = await upstream.text().catch(() => '');
          return new Response(
            JSON.stringify({ error: 'upstream_error', status: upstream.status, detail: text }),
            { status: 502, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
          );
        }

        // Pipe upstream SSE directly to client
        const { readable, writable } = new TransformStream();
        const upstreamReader = upstream.body.getReader();
        const downstreamWriter = writable.getWriter();

        // Optional: heartbeat to keep connection alive
        let heartbeatTimer: number | undefined;
        const encoder = new TextEncoder();

        const pump = async () => {
          try {
            while (true) {
              const { done, value } = await upstreamReader.read();
              if (done) break;
              if (value) {
                await downstreamWriter.write(value);
              }
            }
          } finally {
            try { await downstreamWriter.close(); } catch { }
            if (heartbeatTimer) clearInterval(heartbeatTimer as any);
          }
        };
        pump();

        // Send a heartbeat every 30s
        heartbeatTimer = setInterval(() => {
          downstreamWriter.write(encoder.encode(': ping\n\n'));
        }, 30000) as any;

        return new Response(readable, {
          status: 200,
          headers: {
            ...corsHeaders,
            'Content-Type': 'text/event-stream',
            'Cache-Control': 'no-cache',
            Connection: 'keep-alive',
          },
        });
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
