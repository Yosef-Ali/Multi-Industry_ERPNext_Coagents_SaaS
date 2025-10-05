#!/bin/bash
# Start TypeScript Agent Gateway for Development

set -e

echo "=========================================="
echo "ERPNext Agent Gateway Startup"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -d "services/agent-gateway" ]; then
    echo "❌ Error: Must run from project root directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected: .../Multi-Industry_ERPNext_Coagents_SaaS"
    exit 1
fi

# Check Node version
echo "🔍 Checking Node version..."
node_version=$(node --version 2>&1)
echo "   Node version: $node_version"

# Check if dependencies are installed
echo ""
echo "🔍 Checking dependencies..."
cd services/agent-gateway
if [ ! -d "node_modules" ]; then
    echo "   ❌ node_modules not found"
    echo ""
    echo "Installing dependencies..."
    npm install
else
    echo "   ✅ node_modules found"
fi
cd ../..

# Check environment variables
echo ""
echo "🔍 Checking environment variables..."
if [ -z "$OPENROUTER_API_KEY" ]; then
    echo "   ⚠️  Warning: OPENROUTER_API_KEY not set"
    echo "   Set it with: export OPENROUTER_API_KEY=sk-or-v1-..."
else
    echo "   ✅ OPENROUTER_API_KEY is set"
fi

if [ -z "$WORKFLOW_SERVICE_URL" ]; then
    echo "   ℹ️  WORKFLOW_SERVICE_URL not set (using default: http://localhost:8001)"
    export WORKFLOW_SERVICE_URL="http://localhost:8001"
else
    echo "   ✅ WORKFLOW_SERVICE_URL: $WORKFLOW_SERVICE_URL"
fi

# Check if workflow service is running
echo ""
echo "🔍 Checking workflow service..."
if curl -s http://localhost:8001/ > /dev/null 2>&1; then
    echo "   ✅ Workflow service is running"
else
    echo "   ⚠️  Warning: Workflow service not reachable at http://localhost:8001"
    echo "   Start it with: ./start-workflows.sh (in another terminal)"
fi

# Start the service
echo ""
echo "=========================================="
echo "🚀 Starting Agent Gateway"
echo "=========================================="
echo ""
echo "Service will start on: http://localhost:3000"
echo ""
echo "Available endpoints:"
echo "  POST /api/chat         - Chat with agent"
echo "  GET  /health           - Health check"
echo ""
echo "Press Ctrl+C to stop"
echo ""
echo "=========================================="
echo ""

cd services/agent-gateway
npm run dev
