#!/bin/bash
# Deploy all services to Cloudflare Workers (Free Tier)

set -e

echo "🚀 Deploying ERPNext Coagents to Cloudflare (Free Tier)"
echo "========================================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Check if logged in
echo "📋 Checking Wrangler authentication..."
if ! pnpm dlx wrangler whoami > /dev/null 2>&1; then
    echo "❌ Not logged in. Please run: pnpm dlx wrangler login"
    exit 1
fi
echo -e "${GREEN}✅ Authenticated${NC}"
echo ""

# Deploy Agent Gateway
echo -e "${BLUE}1️⃣  Deploying Agent Gateway...${NC}"
cd services/agent-gateway
npm install --silent
pnpm dlx wrangler deploy
echo -e "${GREEN}✅ Agent Gateway deployed${NC}"
echo ""

# Note about Python workers
echo -e "${BLUE}⚠️  Note: Python Workers (Workflows & Generator)${NC}"
echo "Python support in Workers is in beta. For now, we'll deploy only the Agent Gateway."
echo "You can run Workflows and Generator locally or use Cloudflare Functions."
echo ""

# Deploy Frontend
echo -e "${BLUE}2️⃣  Deploying Frontend...${NC}"
cd ../../frontend/coagent
npm install --silent
npm run build --silent
pnpm dlx wrangler pages deploy dist --project-name=erpnext-coagent-ui
echo -e "${GREEN}✅ Frontend deployed${NC}"
echo ""

echo "=========================================="
echo "🎉 Deployment Complete!"
echo "=========================================="
echo ""
echo "📍 Your services are now live:"
echo "   Agent Gateway: https://erpnext-agent-gateway.workers.dev"
echo "   Frontend: https://erpnext-coagent-ui.pages.dev"
echo ""
echo "🧪 Test your deployment:"
echo "   curl https://erpnext-agent-gateway.workers.dev/health"
echo ""
echo "📊 Monitor in dashboard:"
echo "   https://dash.cloudflare.com/workers"
echo ""
echo "💰 Free tier limits:"
echo "   - 100,000 requests/day"
echo "   - 1GB KV storage"
echo "   - Unlimited bandwidth"
echo ""
