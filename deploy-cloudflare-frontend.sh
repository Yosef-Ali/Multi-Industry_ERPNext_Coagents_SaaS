#!/bin/bash
set -e

# ==============================================================================
# Deploy Next.js Frontend to Cloudflare Pages
# ==============================================================================
# This script builds and deploys the ERPNext CoAgent frontend to Cloudflare Pages
# Usage: ./deploy-cloudflare.sh [--production]
# ==============================================================================

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Configuration
PROJECT_NAME="erpnext-coagent-ui"
FRONTEND_DIR="frontend/coagent"
BRANCH=${1:-preview}

echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${BLUE}  Cloudflare Pages Deployment Script${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo ""

# Check if we're in the right directory
if [ ! -d "$FRONTEND_DIR" ]; then
    echo -e "${RED}❌ Error: Frontend directory not found!${NC}"
    echo "Please run this script from the project root directory."
    exit 1
fi

# Navigate to frontend directory
cd "$FRONTEND_DIR"

echo -e "${YELLOW}📦 Installing dependencies...${NC}"
npm install

echo ""
echo -e "${YELLOW}🔨 Building Next.js application...${NC}"
npm run build

if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed! Please fix errors and try again.${NC}"
    exit 1
fi

echo ""
echo -e "${GREEN}✅ Build successful!${NC}"
echo ""

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo -e "${YELLOW}⚠️  Wrangler CLI not found. Installing...${NC}"
    npm install -g wrangler
fi

echo -e "${YELLOW}🚀 Deploying to Cloudflare Pages...${NC}"

if [ "$BRANCH" = "production" ]; then
    echo -e "${BLUE}📍 Deploying to PRODUCTION${NC}"
    npx wrangler pages deploy .next --project-name=$PROJECT_NAME --branch=main
else
    echo -e "${BLUE}📍 Deploying to PREVIEW${NC}"
    npx wrangler pages deploy .next --project-name=$PROJECT_NAME
fi

if [ $? -eq 0 ]; then
    echo ""
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}  ✅ Deployment Successful!${NC}"
    echo -e "${GREEN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${BLUE}📋 Next Steps:${NC}"
    echo "1. Set environment variables in Cloudflare Pages dashboard:"
    echo "   - OPENROUTER_API_KEY"
    echo "   - OPENROUTER_MODEL (default: mistralai/mistral-7b-instruct)"
    echo "   - OPENROUTER_HTTP_REFERER"
    echo ""
    echo "2. View your deployment at:"
    echo "   https://$PROJECT_NAME.pages.dev"
    echo ""
else
    echo -e "${RED}❌ Deployment failed!${NC}"
    exit 1
fi
