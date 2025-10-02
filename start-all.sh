#!/bin/bash
# Start both Workflow Service and Agent Gateway concurrently

set -e

echo "=========================================="
echo "ERPNext Multi-Industry SaaS - Full Stack"
echo "=========================================="
echo ""
echo "Starting both services:"
echo "  1. Python Workflow Service (port 8001)"
echo "  2. TypeScript Agent Gateway (port 3000)"
echo ""
echo "Press Ctrl+C to stop all services"
echo ""
echo "=========================================="
echo ""

# Function to cleanup on exit
cleanup() {
    echo ""
    echo "Shutting down services..."
    kill 0
}

trap cleanup EXIT

# Start workflow service in background
echo "🚀 Starting Workflow Service..."
./start-workflows.sh > logs/workflows.log 2>&1 &
WORKFLOW_PID=$!

# Wait a bit for workflow service to start
sleep 3

# Check if workflow service started successfully
if curl -s http://localhost:8001/ > /dev/null 2>&1; then
    echo "   ✅ Workflow Service running (PID: $WORKFLOW_PID)"
else
    echo "   ❌ Workflow Service failed to start"
    echo "   Check logs/workflows.log for details"
    kill $WORKFLOW_PID 2>/dev/null || true
    exit 1
fi

# Start agent gateway in background
echo "🚀 Starting Agent Gateway..."
./start-agent-gateway.sh > logs/agent-gateway.log 2>&1 &
AGENT_PID=$!

# Wait a bit for agent gateway to start
sleep 3

# Check if agent gateway started successfully
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo "   ✅ Agent Gateway running (PID: $AGENT_PID)"
else
    echo "   ⚠️  Agent Gateway may still be starting..."
    echo "   Check logs/agent-gateway.log if issues persist"
fi

echo ""
echo "=========================================="
echo "✅ All Services Running"
echo "=========================================="
echo ""
echo "📋 Service Status:"
echo "  • Workflow Service:  http://localhost:8001"
echo "  • Agent Gateway:     http://localhost:3000"
echo ""
echo "📝 Logs:"
echo "  • Workflow Service:  tail -f logs/workflows.log"
echo "  • Agent Gateway:     tail -f logs/agent-gateway.log"
echo ""
echo "🧪 Quick Test:"
echo "  curl http://localhost:8001/workflows"
echo "  curl http://localhost:3000/health"
echo ""
echo "Press Ctrl+C to stop all services"
echo "=========================================="
echo ""

# Wait for both processes
wait
