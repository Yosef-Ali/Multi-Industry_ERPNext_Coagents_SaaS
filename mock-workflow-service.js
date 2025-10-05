#!/usr/bin/env node
/**
 * Mock Workflow Service for Testing SSE Streaming
 * Simulates the workflow service to test gateway → frontend flow
 */

const http = require('http');

const PORT = 8000;

// Test SSE events to stream
const mockEvents = [
  { event: 'workflow_initialized', data: { workflowId: 'test-123', graph: 'hotel_o2c', prompt: 'test' } },
  { event: 'step_started', data: { step: 'create_reservation', status: 'running' } },
  { event: 'step_progress', data: { step: 'create_reservation', progress: 50 } },
  { event: 'step_completed', data: { step: 'create_reservation', result: { id: 'RES-001' } } },
  { event: 'workflow_complete', data: { status: 'success', duration: 2500 } }
];

const server = http.createServer((req, res) => {
  // CORS headers
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'GET, POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type, Accept');

  // Handle OPTIONS
  if (req.method === 'OPTIONS') {
    res.writeHead(200);
    res.end();
    return;
  }

  // Health endpoint
  if (req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'healthy', service: 'mock-workflow-service' }));
    return;
  }

  // SSE streaming endpoint
  if (req.url === '/execute' && req.method === 'POST') {
    let body = '';
    req.on('data', chunk => { body += chunk; });
    req.on('end', () => {
      const payload = JSON.parse(body || '{}');
      console.log('📥 Received workflow request:', payload);

      // Set SSE headers
      res.writeHead(200, {
        'Content-Type': 'text/event-stream',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive'
      });

      // Stream mock events with delays
      let index = 0;
      const streamEvent = () => {
        if (index < mockEvents.length) {
          const { event, data } = mockEvents[index];
          const message = `event: ${event}\ndata: ${JSON.stringify(data)}\n\n`;
          res.write(message);
          console.log(`📤 Sent event: ${event}`);
          index++;
          setTimeout(streamEvent, 800); // 800ms between events
        } else {
          res.end();
          console.log('✅ Workflow stream complete\n');
        }
      };

      // Start streaming after 500ms
      setTimeout(streamEvent, 500);
    });
    return;
  }

  // 404 for other routes
  res.writeHead(404, { 'Content-Type': 'application/json' });
  res.end(JSON.stringify({ error: 'Not found', available: ['/health', '/execute'] }));
});

server.listen(PORT, () => {
  console.log(`\n🚀 Mock Workflow Service running on http://localhost:${PORT}`);
  console.log(`   Health: http://localhost:${PORT}/health`);
  console.log(`   Execute: POST http://localhost:${PORT}/execute`);
  console.log(`\n   Press Ctrl+C to stop\n`);
});
