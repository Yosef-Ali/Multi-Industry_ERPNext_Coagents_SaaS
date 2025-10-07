#!/bin/bash

# Test API Configuration - Both Free (Google) and Paid (OpenRouter)

echo "🔍 Testing API Configuration..."
echo ""

# Check environment variables
echo "✅ Checking environment variables..."
echo ""

if [ -f ".env.local" ]; then
    echo "📄 .env.local found"
    
    if grep -q "GOOGLE_GENERATIVE_AI_API_KEY" .env.local; then
        echo "✅ GOOGLE_GENERATIVE_AI_API_KEY configured"
    else
        echo "❌ GOOGLE_GENERATIVE_AI_API_KEY missing"
    fi
    
    if grep -q "OPENROUTER_API_KEY" .env.local; then
        echo "✅ OPENROUTER_API_KEY configured"
    else
        echo "⚠️  OPENROUTER_API_KEY missing (optional for paid models)"
    fi
else
    echo "❌ .env.local not found"
    exit 1
fi

echo ""
echo "✅ Checking dependencies..."
echo ""

# Check if @ai-sdk/google is installed
if npm list @ai-sdk/google &>/dev/null; then
    echo "✅ @ai-sdk/google installed"
else
    echo "❌ @ai-sdk/google not found"
    echo "   Run: pnpm add @ai-sdk/google"
fi

# Check if @openrouter/ai-sdk-provider is installed  
if npm list @openrouter/ai-sdk-provider &>/dev/null; then
    echo "✅ @openrouter/ai-sdk-provider installed"
else
    echo "⚠️  @openrouter/ai-sdk-provider not found (needed for paid models)"
    echo "   Run: pnpm add @openrouter/ai-sdk-provider"
fi

echo ""
echo "✅ Available Models:"
echo ""
echo "FREE (Direct Google):"
echo "  - gemini-2.0-flash-exp (default)"
echo "  - gemini-1.5-flash"
echo "  - gemini-1.5-pro"
echo ""
echo "PAID (OpenRouter):"
echo "  - openrouter/google/gemini-2.0-flash-exp:free"
echo "  - openrouter/anthropic/claude-3.5-sonnet"
echo "  - openrouter/openai/gpt-4-turbo"
echo "  - openrouter/deepseek/deepseek-chat"
echo ""
echo "🚀 Start dev server: pnpm dev"
echo "🌐 Test at: http://localhost:3000/developer"
echo ""
echo "✅ Setup complete!"
