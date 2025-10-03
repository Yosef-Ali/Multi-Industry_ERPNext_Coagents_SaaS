/**
 * Developer CopilotKit API Route
 * Provides v0-style 3-variant generation for ERPNext artifacts
 */

import {
  CopilotRuntime,
  OpenAIAdapter,
  copilotRuntimeNextJSAppRouterEndpoint,
} from '@copilotkit/runtime';
import { NextRequest } from 'next/server';
import OpenAI from 'openai';

/**
 * POST handler for Developer CopilotKit requests
 */
export async function POST(req: NextRequest) {
  // Get Cloudflare context (if running on Cloudflare Workers)
  let env: any = process.env;
  try {
    // @ts-ignore
    const { getCloudflareContext } = await import('@opennextjs/cloudflare');
    const cfContext = getCloudflareContext();
    if (cfContext?.env) {
      env = cfContext.env;
    }
  } catch (e) {
    // Running in Node.js, use process.env
  }

  // Environment variables
  const OPENROUTER_API_KEY = env.OPENROUTER_API_KEY || '';
  const OPENROUTER_MODEL =
    env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet';
  const OPENROUTER_HTTP_REFERER =
    env.OPENROUTER_HTTP_REFERER ||
    req.headers.get('referer') ||
    'http://localhost:3000';
  const OPENROUTER_APP_TITLE =
    env.OPENROUTER_APP_TITLE || 'ERPNext Developer Assistant';

  try {
    // Create OpenAI client pointing to OpenRouter
    const openai = new OpenAI({
      apiKey: OPENROUTER_API_KEY,
      baseURL: 'https://openrouter.ai/api/v1',
      defaultHeaders: {
        'HTTP-Referer': OPENROUTER_HTTP_REFERER,
        'X-Title': OPENROUTER_APP_TITLE,
      },
      fetch: globalThis.fetch,
    });

    // Create CopilotRuntime with developer actions
    const runtime = new CopilotRuntime({
      actions: [
        // Action 1: Analyze Requirements
        {
          name: 'analyze_requirements',
          description:
            'Analyze user requirements and determine what ERPNext components to generate',
          parameters: [
            {
              name: 'description',
              type: 'string',
              description: 'User description of what they want to build',
              required: true,
            },
          ],
          handler: async ({ description }) => {
            // This will be called by the AI to analyze requirements
            // For now, return a structured analysis
            const analysis = {
              description,
              primaryType: 'doctype',
              components: [],
              workflows: [],
              requirements: {
                functional: [],
                technical: [],
              },
            };

            // The AI will populate this based on the description
            return JSON.stringify(analysis);
          },
        },

        // Action 2: Generate 3 Variants
        {
          name: 'generate_variants',
          description:
            'Generate 3 variants (minimal, balanced, advanced) for the analyzed requirements',
          parameters: [
            {
              name: 'analysis',
              type: 'string',
              description: 'JSON string of the requirements analysis',
              required: true,
            },
          ],
          handler: async ({ analysis }) => {
            // Parse the analysis
            const parsedAnalysis = JSON.parse(analysis);

            // Generate 3 variants using the AI
            // The AI will create DocType/Workflow definitions for each variant
            const variants = {
              variant1: {
                variant: 1,
                title: 'Minimal',
                description: 'Basic implementation with core features',
                complexity: 'low',
              },
              variant2: {
                variant: 2,
                title: 'Balanced',
                description: 'Standard implementation with recommended features',
                complexity: 'medium',
              },
              variant3: {
                variant: 3,
                title: 'Advanced',
                description: 'Full-featured implementation with all capabilities',
                complexity: 'high',
              },
            };

            return JSON.stringify(variants);
          },
        },

        // Action 3: Refine Variant
        {
          name: 'refine_variant',
          description: 'Refine a selected variant based on user feedback',
          parameters: [
            {
              name: 'variantId',
              type: 'string',
              description: 'ID of the variant to refine',
              required: true,
            },
            {
              name: 'refinementPrompt',
              type: 'string',
              description: 'User request for refinement',
              required: true,
            },
            {
              name: 'currentCode',
              type: 'string',
              description: 'Current code of the variant',
              required: true,
            },
          ],
          handler: async ({ variantId, refinementPrompt, currentCode }) => {
            // Refine the variant based on user feedback
            // The AI will modify the code according to the refinement prompt
            return JSON.stringify({
              variantId,
              refinementApplied: refinementPrompt,
              updatedCode: currentCode, // AI will modify this
            });
          },
        },

        // Action 4: Deploy to ERPNext
        {
          name: 'deploy_to_erpnext',
          description: 'Deploy the artifact to ERPNext instance',
          parameters: [
            {
              name: 'artifactId',
              type: 'string',
              description: 'ID of the artifact to deploy',
              required: true,
            },
            {
              name: 'code',
              type: 'string',
              description: 'Code/definition to deploy',
              required: true,
            },
            {
              name: 'environment',
              type: 'string',
              description: 'Target environment (local, staging, production)',
              required: true,
            },
          ],
          handler: async ({ artifactId, code, environment }) => {
            // This would call the ERPNext API to deploy
            // For now, return a mock response
            return JSON.stringify({
              success: true,
              artifactId,
              environment,
              message: 'Deployment initiated. Awaiting approval.',
            });
          },
        },
      ],
    });

    const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
      runtime,
      serviceAdapter: new OpenAIAdapter({
        model: OPENROUTER_MODEL,
        openai,
      }),
      endpoint: '/api/copilot/developer',
    });

    return handleRequest(req);
  } catch (error: any) {
    console.error('Developer CopilotKit runtime error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'Failed to process request' }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}
