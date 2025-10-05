#!/bin/bash

# 🔑 Cloudflare Secrets Setup Script
# Run this to set all required secrets for deployment

echo "=================================================="
echo "🔑 Setting Cloudflare Worker Secrets"
echo "=================================================="
echo ""
echo "You'll be prompted to enter each secret value."
echo "Copy the values from your .env file when prompted."
echo ""

cd services/agent-gateway

echo "1️⃣ Setting OPENROUTER_API_KEY..."
echo "   (Copy from .env file: OPENROUTER_API_KEY=...)"
npx wrangler@latest secret put OPENROUTER_API_KEY

echo ""
echo "2️⃣ Setting OPENROUTER_MODEL..."
echo "   (Enter: zhipu/glm-4-9b-chat)"
npx wrangler@latest secret put OPENROUTER_MODEL

echo ""
echo "3️⃣ Setting OPENROUTER_BASE_URL..."
echo "   (Enter: https://openrouter.ai/api/v1)"
npx wrangler@latest secret put OPENROUTER_BASE_URL

echo ""
echo "4️⃣ Setting WORKFLOW_SERVICE_URL..."
echo "   (Enter: https://erpnext-workflows.onrender.com or your Render URL)"
npx wrangler@latest secret put WORKFLOW_SERVICE_URL

echo ""
echo "5️⃣ Setting USE_MOCK_ERPNEXT..."
echo "   (Enter: true for testing without ERPNext)"
npx wrangler@latest secret put USE_MOCK_ERPNEXT

echo ""
echo "=================================================="
echo "✅ All secrets set!"
echo "=================================================="
echo ""
echo "Next step: Deploy the agent gateway"
echo "Run: npm run build && npx wrangler@latest deploy"
echo ""
