#!/bin/bash
# Start Python Workflow Service for Development

set -e

echo "=========================================="
echo "ERPNext Workflow Service Startup"
echo "=========================================="
echo ""

# Check if we're in the right directory
if [ ! -d "services/workflows" ]; then
    echo "❌ Error: Must run from project root directory"
    echo "   Current directory: $(pwd)"
    echo "   Expected: .../Multi-Industry_ERPNext_Coagents_SaaS"
    exit 1
fi

# Check Python version
echo "🔍 Checking Python version..."
python_version=$(python3 --version 2>&1 | awk '{print $2}')
echo "   Python version: $python_version"

# Check if dependencies are installed
echo ""
echo "🔍 Checking dependencies..."
if python3 -c "import langgraph" 2>/dev/null; then
    echo "   ✅ langgraph installed"
else
    echo "   ❌ langgraph not found"
    echo ""
    echo "Installing dependencies..."
    cd services/workflows
    pip3 install -r requirements.txt
    cd ../..
fi

if python3 -c "import fastapi" 2>/dev/null; then
    echo "   ✅ fastapi installed"
else
    echo "   ❌ fastapi not found"
    echo ""
    echo "Installing dependencies..."
    cd services/workflows
    pip3 install -r requirements.txt
    cd ../..
fi

# Test workflow registry
echo ""
echo "🔍 Testing workflow registry..."
cd services/workflows
if python3 test_registry.py > /dev/null 2>&1; then
    echo "   ✅ All workflows loaded successfully"
else
    echo "   ⚠️  Warning: Some workflows may have issues"
    echo "   Run 'python3 test_registry.py' for details"
fi
cd ../..

# Start the service
echo ""
echo "=========================================="
echo "🚀 Starting Workflow Service"
echo "=========================================="
echo ""
echo "Service will start on: http://localhost:8001"
echo ""
echo "Available endpoints:"
echo "  GET  /                 - Health check"
echo "  GET  /workflows        - List workflows"
echo "  GET  /workflows/{name} - Get workflow info"
echo "  POST /execute          - Execute workflow"
echo "  POST /resume           - Resume paused workflow"
echo ""
echo "Press Ctrl+C to stop"
echo ""
echo "=========================================="
echo ""

cd services/workflows/src
python3 server.py
