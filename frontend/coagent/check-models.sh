#!/bin/bash

clear
echo ""
echo "╔═══════════════════════════════════════════╗"
echo "║   AI MODELS - SIMPLE STATUS CHECK        ║"
echo "╔═══════════════════════════════════════════╗"
echo ""

# Step 1: Check if server is running
echo "📡 Step 1: Checking if dev server is running..."
if curl -s http://localhost:3000 > /dev/null 2>&1; then
    echo "   ✅ Server is RUNNING on port 3000"
    SERVER_OK=true
else
    echo "   ❌ Server is NOT running"
    echo ""
    echo "   👉 TO FIX: Open a terminal and run:"
    echo "      cd /Users/mekdesyared/Multi-Industry_ERPNext_Coagents_SaaS/frontend/coagent"
    echo "      pnpm run dev"
    echo ""
    exit 1
fi

echo ""

# Step 2: Check environment variables
echo "🔑 Step 2: Checking API keys..."

if [ -f .env.local ]; then
    if grep -q "GOOGLE_GENERATIVE_AI_API_KEY=AIza" .env.local; then
        echo "   ✅ Google API key found"
    else
        echo "   ⚠️  Google API key missing or incorrect"
    fi
    
    if grep -q "OPENROUTER_API_KEY=sk-or-v1-" .env.local; then
        echo "   ✅ OpenRouter API key found"
    else
        echo "   ⚠️  OpenRouter API key missing or incorrect"
    fi
else
    echo "   ⚠️  .env.local file not found"
fi

echo ""

# Step 3: Quick model tests
echo "🧪 Step 3: Testing models (this takes ~20 seconds)..."
echo ""

test_one() {
    local id="$1"
    local name="$2"
    
    printf "   Testing %-45s ... " "$name"
    
    result=$(curl -s -X POST http://localhost:3000/developer/api/chat \
        -H "Content-Type: application/json" \
        -d "{\"messages\":[{\"role\":\"user\",\"content\":\"test\"}],\"selectedChatModel\":\"$id\"}" \
        2>&1 | head -c 50)
    
    if echo "$result" | grep -q "error" || echo "$result" | grep -q "Error"; then
        echo "❌ FAILED"
        return 1
    else
        echo "✅ OK"
        return 0
    fi
}

success=0
failed=0

# Test free models
test_one "gemini-2.5-pro" "Gemini 2.5 Pro (FREE)" && ((success++)) || ((failed++))
test_one "meta-llama/llama-3.3-70b-instruct:free" "Llama 3.3 70B (FREE)" && ((success++)) || ((failed++))

# Test paid models
test_one "mistralai/mistral-small-3.2-24b-instruct" "Mistral Small 3.2 (PAID)" && ((success++)) || ((failed++))
test_one "mistralai/mixtral-8x7b-instruct" "Mixtral 8x7B (PAID)" && ((success++)) || ((failed++))

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
echo "📊 RESULTS:"
echo "   ✅ Working: $success models"
echo "   ❌ Failed:  $failed models"
echo ""

if [ $failed -eq 0 ]; then
    echo "🎉 SUCCESS! All tested models are working!"
    echo ""
    echo "You can now use the app at: http://localhost:3000/developer"
else
    echo "⚠️  Some models failed. This could be due to:"
    echo "   - API keys not set correctly"
    echo "   - Network connection issues"
    echo "   - Rate limiting from the API providers"
fi

echo ""
echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
echo ""
