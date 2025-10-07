#!/bin/bash

# Simple Model Test - Easy to see results
echo ""
echo "=================================="
echo "   TESTING AI MODELS"
echo "=================================="
echo ""

# Function to test one model
test_model() {
    MODEL_ID="$1"
    MODEL_NAME="$2"
    
    echo "Testing: $MODEL_NAME"
    echo "Model ID: $MODEL_ID"
    echo -n "Result: "
    
    HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" -X POST http://localhost:3000/developer/api/chat \
        -H "Content-Type: application/json" \
        -d "{\"messages\":[{\"role\":\"user\",\"content\":\"Hi\"}],\"selectedChatModel\":\"$MODEL_ID\"}" 2>&1)
    
    if [ "$HTTP_CODE" = "200" ]; then
        echo "✅ WORKING"
    else
        echo "❌ FAILED (HTTP: $HTTP_CODE)"
    fi
    echo ""
}

# Check if server is running
echo "Checking server..."
SERVER_STATUS=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000 2>&1)

if [ "$SERVER_STATUS" != "200" ]; then
    echo "❌ Server not running on port 3000!"
    echo ""
    echo "Start the server first:"
    echo "  cd /Users/mekdesyared/Multi-Industry_ERPNext_Coagents_SaaS/frontend/coagent"
    echo "  pnpm run dev"
    exit 1
fi

echo "✅ Server is running"
echo ""
echo "=================================="
echo "   TESTING FREE MODELS"
echo "=================================="
echo ""

test_model "gemini-2.5-pro" "Gemini 2.5 Pro (FREE - Google)"
test_model "meta-llama/llama-3.3-70b-instruct:free" "Llama 3.3 70B (FREE)"

echo "=================================="
echo "   TESTING PAID MODELS"
echo "=================================="
echo ""

test_model "mistralai/mistral-small-3.2-24b-instruct" "Mistral Small 3.2"
test_model "mistralai/mixtral-8x7b-instruct" "Mixtral 8x7B"
test_model "z-ai/glm-4.6" "Z-AI GLM-4.6"
test_model "google/gemini-2.5-flash-lite-preview-09-2025" "Gemini Flash Lite"

echo "=================================="
echo "   TEST COMPLETE!"
echo "=================================="
