/**
 * CopilotKit Runtime Endpoint
 *
 * Integrates LangGraph workflows with CopilotKit CoAgents
 * Provides state sharing and human-in-the-loop approval gates
 */

import { CopilotRuntime, langGraphPlatformEndpoint } from '@copilotkit/runtime';

// ============================================================================
// Configuration
// ============================================================================

const WORKFLOW_SERVICE_URL = process.env.WORKFLOW_SERVICE_URL || 'http://localhost:8001';

// ============================================================================
// CopilotKit Runtime Setup
// ============================================================================

/**
 * Create CopilotKit runtime with LangGraph workflow agents
 */
const runtime = new CopilotRuntime({
  agents: [
    // LangGraph workflow endpoints
    langGraphPlatformEndpoint({
      deploymentUrl: WORKFLOW_SERVICE_URL,
      agents: [
        {
          name: 'hotel_o2c',
          description: 'Hotel Order-to-Cash workflow: Check-in → Folio → Check-out → Invoice',
        },
        {
          name: 'hospital_admissions',
          description: 'Hospital admissions workflow with patient intake and care planning',
        },
        {
          name: 'manufacturing_production',
          description: 'Manufacturing production workflow with BOM and quality inspection',
        },
        {
          name: 'retail_fulfillment',
          description: 'Retail order fulfillment workflow with inventory validation',
        },
        {
          name: 'education_admissions',
          description: 'Education admissions workflow with interview scheduling and scoring',
        },
      ],
    }),
  ],
});

// ============================================================================
// Request Handler
// ============================================================================

/**
 * Handle CopilotKit requests
 *
 * This endpoint:
 * 1. Receives requests from CopilotKit frontend
 * 2. Routes to appropriate LangGraph workflow
 * 3. Streams state updates back to frontend
 * 4. Handles interrupt() for approval gates
 */
export async function POST(req: Request): Promise<Response> {
  try {
    const { handleRequest } = runtime;
    return await handleRequest(req);
  } catch (error: any) {
    console.error('CopilotKit runtime error:', error);
    return new Response(
      JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
      {
        status: 500,
        headers: { 'Content-Type': 'application/json' },
      }
    );
  }
}

/**
 * Health check endpoint
 */
export async function GET(): Promise<Response> {
  return new Response(
    JSON.stringify({
      status: 'ok',
      service: 'copilotkit-runtime',
      workflowServiceUrl: WORKFLOW_SERVICE_URL,
      agents: [
        'hotel_o2c',
        'hospital_admissions',
        'manufacturing_production',
        'retail_fulfillment',
        'education_admissions',
      ],
    }),
    {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    }
  );
}
