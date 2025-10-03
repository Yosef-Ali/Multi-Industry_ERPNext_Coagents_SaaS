/**
 * CopilotKit API Route for Next.js (Cloudflare Workers Compatible)
 * Uses OpenAI with fetch polyfill for OpenRouter
 */

import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from '@copilotkit/runtime';
import { NextRequest } from 'next/server';

// Polyfill OpenAI for Cloudflare Workers
// @ts-ignore
import OpenAI from 'openai';

/**
 * POST handler for CopilotKit requests
 */
export async function POST(req: NextRequest) {
  // Get Cloudflare context (if running on Cloudflare Workers)
  let env: any = process.env;
  try {
    // @ts-ignore - Cloudflare context API
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const cfContext = getCloudflareContext();
    if (cfContext?.env) {
      env = cfContext.env;
    }
  } catch (e) {
    // Running in Node.js, use process.env
  }

  // Get environment variables
  const OPENROUTER_API_KEY = env.OPENROUTER_API_KEY || '';
  const OPENROUTER_MODEL = env.OPENROUTER_MODEL || 'mistralai/mistral-7b-instruct';
  const OPENROUTER_HTTP_REFERER = env.OPENROUTER_HTTP_REFERER || req.headers.get('referer') || 'http://localhost:3000';
  const OPENROUTER_APP_TITLE = env.OPENROUTER_APP_TITLE || 'ERPNext CoAgent Assistant';

  try {
    // Create OpenAI client with fetch override for Workers compatibility
    const openai = new OpenAI({
      apiKey: OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': OPENROUTER_HTTP_REFERER,
        'X-Title': OPENROUTER_APP_TITLE,
      },
      // Force use of global fetch (Workers-compatible)
      fetch: globalThis.fetch,
    });

    const runtime = new CopilotRuntime();

    const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
      runtime,
      serviceAdapter: new OpenAIAdapter({
        model: OPENROUTER_MODEL,
        openai,
      }),
      endpoint: '/api/copilotkit',
    });

    return handleRequest(req);
  } catch (error: any) {
    console.error('CopilotKit runtime error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to process request' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}