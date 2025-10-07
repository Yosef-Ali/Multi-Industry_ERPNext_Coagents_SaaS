#!/bin/bash

# Quick Model Test Script
# Run this after starting the dev server with: pnpm run dev

echo "🚀 Quick Model Test"
echo "===================="
echo ""

# Test a single model
test_model() {
    local model_id="$1"
    local model_name="$2"
    
    echo -n "Testing $model_name... "
    
    response=$(curl -s -w "%{http_code}" -X POST http://localhost:3000/developer/api/chat \
        -H "Content-Type: application/json" \
        -d "{
            \"messages\": [{\"role\": \"user\", \"content\": \"Hi\"}],
            \"selectedChatModel\": \"$model_id\"
        }" -o /dev/null 2>&1)
    
    if [ "$response" = "200" ]; then
        echo "✅ OK"
    else
        echo "❌ Failed (HTTP $response)"
    fi
}

# Quick test of key models
test_model "gemini-2.5-pro" "Gemini 2.5 Pro"
test_model "meta-llama/llama-3.3-70b-instruct:free" "Llama 3.3 70B"
test_model "mistralai/mistral-small-3.2-24b-instruct" "Mistral Small 3.2"

echo ""
echo "✨ Quick test complete!"
