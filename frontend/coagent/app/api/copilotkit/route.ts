/**
 * CopilotKit API Route for Next.js
 * Integrates with LangGraph Python workflows on Render
 */

import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from '@copilotkit/runtime';
import { NextRequest } from 'next/server';
import OpenAI from 'openai';

// Environment variables
const OPENROUTER_API_KEY = process.env.OPENROUTER_API_KEY || '';
const OPENROUTER_MODEL = process.env.OPENROUTER_MODEL || 'openai/gpt-4o-mini';

/**
 * CopilotKit runtime with OpenRouter (OpenAI-compatible)
 *
 * OpenRouter provides an OpenAI-compatible API, so we can use OpenAIAdapter
 * with a custom baseURL
 */
const runtime = new CopilotRuntime();

// Create OpenAI client configured for OpenRouter
const openai = new OpenAI({
  apiKey: OPENROUTER_API_KEY,
  baseURL: 'https://openrouter.ai/api/v1',
  defaultHeaders: {
    'HTTP-Referer': process.env.OPENROUTER_HTTP_REFERER || 'http://localhost:3000',
    'X-Title': process.env.OPENROUTER_APP_TITLE || 'ERPNext CoAgent Assistant',
  },
});

/**
 * POST handler for CopilotKit requests
 * This endpoint receives messages from the frontend and streams responses
 */
export async function POST(req: NextRequest) {
  const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
    runtime,
    serviceAdapter: new OpenAIAdapter({
      model: OPENROUTER_MODEL,
      openai,
    }),
    endpoint: '/api/copilotkit',
  });

  return handleRequest(req);
}
