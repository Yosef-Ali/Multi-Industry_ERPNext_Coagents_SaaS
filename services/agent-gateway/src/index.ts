/**
 * Entry point for agent gateway server
 */

import app from './server.js';
import { logConfiguration } from './config/environment.js';

const PORT = process.env.GATEWAY_PORT || 3001;
const HOST = process.env.GATEWAY_HOST || '0.0.0.0';

// Log configuration (with secrets masked)
logConfiguration();

const port = parseInt(PORT.toString(), 10);
app.listen(port, HOST, () => {
  console.log(`🚀 Agent Gateway running on http://${HOST}:${port}`);
  console.log(`📊 Health check: http://${HOST}:${port}/health`);
  console.log(`🤖 AG-UI endpoint: http://${HOST}:${port}/agui`);
  console.log(`📋 Models API: http://${HOST}:${port}/api/models`);
  console.log(`🔧 Tools API: http://${HOST}:${port}/api/tools`);
  console.log(`💬 Chat API: http://${HOST}:${port}/api/chat`);
});
