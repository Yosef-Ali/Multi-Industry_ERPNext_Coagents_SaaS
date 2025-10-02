#!/bin/bash
# Setup all required Cloudflare resources for future implementations

set -e

echo "🔧 Setting up Cloudflare Resources for Next Implementations"
echo "============================================================"
echo ""

# Colors
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check authentication
echo "📋 Checking Wrangler authentication..."
if ! pnpm dlx wrangler whoami > /dev/null 2>&1; then
    echo "❌ Not logged in. Please run: pnpm dlx wrangler login"
    exit 1
fi
echo -e "${GREEN}✅ Authenticated${NC}"
echo ""

# Create KV Namespaces
echo -e "${BLUE}1️⃣  Creating KV Namespaces...${NC}"

echo "Creating WORKFLOW_STATE namespace..."
WORKFLOW_KV=$(pnpm dlx wrangler kv namespace create WORKFLOW_STATE 2>&1 | grep 'id = ' | cut -d'"' -f2)
if [ -n "$WORKFLOW_KV" ]; then
    echo -e "${GREEN}✅ WORKFLOW_STATE: $WORKFLOW_KV${NC}"
else
    echo -e "${YELLOW}⚠️  WORKFLOW_STATE might already exist${NC}"
fi

echo "Creating APPROVALS namespace..."
APPROVALS_KV=$(pnpm dlx wrangler kv namespace create APPROVALS 2>&1 | grep 'id = ' | cut -d'"' -f2)
if [ -n "$APPROVALS_KV" ]; then
    echo -e "${GREEN}✅ APPROVALS: $APPROVALS_KV${NC}"
else
    echo -e "${YELLOW}⚠️  APPROVALS might already exist${NC}"
fi
echo ""

# Create R2 Buckets
echo -e "${BLUE}2️⃣  Creating R2 Buckets...${NC}"

echo "Creating erpnext-generated-apps bucket..."
if pnpm dlx wrangler r2 bucket create erpnext-generated-apps 2>&1 | grep -q "Created"; then
    echo -e "${GREEN}✅ erpnext-generated-apps bucket created${NC}"
else
    echo -e "${YELLOW}⚠️  Bucket might already exist${NC}"
fi

echo "Creating erpnext-uploads bucket..."
if pnpm dlx wrangler r2 bucket create erpnext-uploads 2>&1 | grep -q "Created"; then
    echo -e "${GREEN}✅ erpnext-uploads bucket created${NC}"
else
    echo -e "${YELLOW}⚠️  Bucket might already exist${NC}"
fi
echo ""

# Summary
echo "=========================================="
echo -e "${GREEN}✅ Resource Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "📋 Created Resources:"
echo "   KV Namespaces:"
echo "   - SESSIONS (already created)"
echo "   - WORKFLOW_STATE"
echo "   - APPROVALS"
echo ""
echo "   R2 Buckets:"
echo "   - erpnext-generated-apps"
echo "   - erpnext-uploads"
echo ""
echo "📝 Next Steps:"
echo "   1. Update wrangler.toml files with new KV namespace IDs"
echo "   2. Set API secrets: pnpm dlx wrangler secret put <NAME>"
echo "   3. Deploy services: ./deploy-free.sh"
echo ""
echo "📚 View all resources in dashboard:"
echo "   https://dash.cloudflare.com/"
echo ""
