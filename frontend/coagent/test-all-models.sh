#!/bin/bash

# Test All AI Models Configuration Script
# This script tests all configured models to verify they work correctly

set -e

API_URL="http://localhost:3000/developer/api/chat"
TEST_MESSAGE="Hello, this is a test message. Please respond with 'OK'."

echo "=========================================="
echo "Testing All AI Models Configuration"
echo "=========================================="
echo ""

# Check if server is running
echo "Checking if dev server is running on port 3000..."
if ! curl -s http://localhost:3000 > /dev/null; then
    echo "❌ Error: Dev server is not running on port 3000"
    echo "Please start the server with: pnpm run dev"
    exit 1
fi
echo "✅ Dev server is running"
echo ""

# Array of all models to test
declare -a models=(
    "gemini-2.5-pro"
    "meta-llama/llama-3.3-70b-instruct:free"
    "z-ai/glm-4.6"
    "google/gemini-2.5-flash-lite-preview-09-2025"
    "mistralai/mistral-small-3.2-24b-instruct"
    "mistralai/mixtral-8x7b-instruct"
)

declare -a model_names=(
    "Gemini 2.5 Pro (FREE - Google API)"
    "Llama 3.3 70B Instruct (FREE - OpenRouter)"
    "Z-AI GLM-4.6 (Paid - OpenRouter)"
    "Gemini 2.5 Flash Lite Preview (Paid - OpenRouter)"
    "Mistral Small 3.2 24B (Paid - OpenRouter)"
    "Mixtral 8x7B Instruct (Paid - OpenRouter)"
)

success_count=0
fail_count=0
failed_models=()

# Test each model
for i in "${!models[@]}"; do
    model="${models[$i]}"
    model_name="${model_names[$i]}"
    
    echo "=========================================="
    echo "Testing: $model_name"
    echo "Model ID: $model"
    echo "=========================================="
    
    # Create request payload
    payload=$(cat <<EOF
{
    "messages": [
        {
            "role": "user",
            "content": "$TEST_MESSAGE"
        }
    ],
    "selectedChatModel": "$model"
}
EOF
)
    
    # Make API request and capture response
    echo "Sending test request..."
    response=$(curl -s -w "\n%{http_code}" -X POST "$API_URL" \
        -H "Content-Type: application/json" \
        -d "$payload" 2>&1 || echo "000")
    
    # Extract HTTP status code (last line)
    http_code=$(echo "$response" | tail -n1)
    
    # Check if request was successful
    if [ "$http_code" = "200" ]; then
        echo "✅ SUCCESS - Model responded correctly (HTTP 200)"
        ((success_count++))
    else
        echo "❌ FAILED - HTTP Status: $http_code"
        if [ "$http_code" != "000" ]; then
            echo "Response preview:"
            echo "$response" | head -n 20
        else
            echo "Connection error - could not reach API"
        fi
        ((fail_count++))
        failed_models+=("$model_name")
    fi
    
    echo ""
    sleep 2  # Brief pause between requests
done

# Summary
echo "=========================================="
echo "TEST SUMMARY"
echo "=========================================="
echo "Total Models Tested: ${#models[@]}"
echo "✅ Successful: $success_count"
echo "❌ Failed: $fail_count"
echo ""

if [ $fail_count -gt 0 ]; then
    echo "Failed Models:"
    for failed_model in "${failed_models[@]}"; do
        echo "  - $failed_model"
    done
    echo ""
fi

# Environment check
echo "=========================================="
echo "ENVIRONMENT CHECK"
echo "=========================================="

if [ -f .env.local ]; then
    echo "✅ .env.local exists"
    
    if grep -q "GOOGLE_GENERATIVE_AI_API_KEY=AIza" .env.local; then
        echo "✅ GOOGLE_GENERATIVE_AI_API_KEY is set"
    else
        echo "⚠️  GOOGLE_GENERATIVE_AI_API_KEY might not be set correctly"
    fi
    
    if grep -q "OPENROUTER_API_KEY=sk-or-v1-" .env.local; then
        echo "✅ OPENROUTER_API_KEY is set"
    else
        echo "⚠️  OPENROUTER_API_KEY might not be set correctly"
    fi
else
    echo "⚠️  .env.local not found"
fi

echo ""
echo "=========================================="
echo "Test completed!"
if [ $fail_count -eq 0 ]; then
    echo "🎉 All models working correctly!"
    exit 0
else
    echo "⚠️  Some models failed. Check logs above."
    exit 1
fi
