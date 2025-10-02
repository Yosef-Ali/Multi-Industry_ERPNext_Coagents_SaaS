#!/bin/bash
# Complete Cloudflare Free Tier Deployment Script
# Deploys: Frontend (Pages) + Agent Gateway (Workers) + Setup D1/KV
# Cost: $0/month

set -e  # Exit on error

echo "🚀 ERPNext CoAgents - Cloudflare Free Tier Deployment"
echo "======================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# ============================================================================
# Step 1: Prerequisites Check
# ============================================================================

echo -e "${BLUE}Step 1: Checking prerequisites...${NC}"

# Check if wrangler is installed
if ! command -v wrangler &> /dev/null; then
    echo -e "${YELLOW}⚠️  Wrangler not found. Installing...${NC}"
    npm install -g wrangler
fi

# Check if logged in
if ! wrangler whoami &> /dev/null; then
    echo -e "${YELLOW}⚠️  Not logged in to Cloudflare. Please login...${NC}"
    wrangler login
fi

echo -e "${GREEN}✅ Prerequisites checked${NC}"
echo ""

# ============================================================================
# Step 2: Create Cloudflare Resources
# ============================================================================

echo -e "${BLUE}Step 2: Creating Cloudflare resources (KV, D1)...${NC}"

# Create KV namespaces
echo "Creating KV namespace: SESSIONS..."
SESSIONS_ID=$(wrangler kv:namespace create SESSIONS --preview=false 2>&1 | grep -o 'id = "[^"]*"' | cut -d'"' -f2)
echo -e "${GREEN}✅ SESSIONS KV created: ${SESSIONS_ID}${NC}"

echo "Creating KV namespace: WORKFLOW_STATE..."
WORKFLOW_STATE_ID=$(wrangler kv:namespace create WORKFLOW_STATE --preview=false 2>&1 | grep -o 'id = "[^"]*"' | cut -d'"' -f2)
echo -e "${GREEN}✅ WORKFLOW_STATE KV created: ${WORKFLOW_STATE_ID}${NC}"

# Create D1 database
echo "Creating D1 database: erpnext-workflows-db..."
D1_DB_ID=$(wrangler d1 create erpnext-workflows-db 2>&1 | grep -o 'database_id = "[^"]*"' | cut -d'"' -f2 || echo "")

if [ -z "$D1_DB_ID" ]; then
    echo -e "${YELLOW}⚠️  Database might already exist. Fetching existing ID...${NC}"
    D1_DB_ID=$(wrangler d1 list 2>&1 | grep "erpnext-workflows-db" | awk '{print $1}' || echo "UNKNOWN")
fi

echo -e "${GREEN}✅ D1 database created/found: ${D1_DB_ID}${NC}"

# Initialize D1 schema
if [ -f "setup/schema.sql" ]; then
    echo "Initializing D1 schema..."
    wrangler d1 execute erpnext-workflows-db --file=setup/schema.sql
    echo -e "${GREEN}✅ D1 schema initialized${NC}"
else
    echo -e "${YELLOW}⚠️  schema.sql not found, skipping schema initialization${NC}"
fi

echo ""

# ============================================================================
# Step 3: Update Configuration Files
# ============================================================================

echo -e "${BLUE}Step 3: Updating wrangler.toml files...${NC}"

# Update agent-gateway wrangler.toml
AGENT_GATEWAY_TOML="services/agent-gateway/wrangler.toml"
if [ -f "$AGENT_GATEWAY_TOML" ]; then
    echo "Updating $AGENT_GATEWAY_TOML with KV and D1 IDs..."

    # Backup original
    cp "$AGENT_GATEWAY_TOML" "$AGENT_GATEWAY_TOML.backup"

    # Update KV namespace ID
    sed -i.bak "s/id = \"eec1ac4c36d14839a7574b41c0ffa339\"/id = \"$SESSIONS_ID\"/" "$AGENT_GATEWAY_TOML"

    # Add D1 binding if not exists
    if ! grep -q "d1_databases" "$AGENT_GATEWAY_TOML"; then
        cat >> "$AGENT_GATEWAY_TOML" << EOF

# D1 Database
[[d1_databases]]
binding = "DB"
database_name = "erpnext-workflows-db"
database_id = "$D1_DB_ID"
EOF
    fi

    echo -e "${GREEN}✅ Agent gateway config updated${NC}"
fi

echo ""

# ============================================================================
# Step 4: Set Secrets
# ============================================================================

echo -e "${BLUE}Step 4: Setting secrets...${NC}"
echo -e "${YELLOW}You'll need to enter these manually:${NC}"
echo ""

cd services/agent-gateway

# ANTHROPIC_API_KEY
echo -e "${YELLOW}Enter ANTHROPIC_API_KEY (from console.anthropic.com):${NC}"
wrangler secret put ANTHROPIC_API_KEY

# WORKFLOW_SERVICE_URL
echo -e "${YELLOW}Enter WORKFLOW_SERVICE_URL:${NC}"
echo -e "${YELLOW}(Example: https://erpnext-workflows.onrender.com)${NC}"
wrangler secret put WORKFLOW_SERVICE_URL

# Optional: ERPNext credentials
read -p "Do you have ERPNext credentials to add? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo -e "${YELLOW}Enter ERPNEXT_API_KEY:${NC}"
    wrangler secret put ERPNEXT_API_KEY

    echo -e "${YELLOW}Enter ERPNEXT_API_SECRET:${NC}"
    wrangler secret put ERPNEXT_API_SECRET

    echo -e "${YELLOW}Enter ERPNEXT_BASE_URL:${NC}"
    wrangler secret put ERPNEXT_BASE_URL
fi

cd ../..

echo -e "${GREEN}✅ Secrets configured${NC}"
echo ""

# ============================================================================
# Step 5: Deploy Agent Gateway
# ============================================================================

echo -e "${BLUE}Step 5: Deploying Agent Gateway to Cloudflare Workers...${NC}"

cd services/agent-gateway

# Install dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Build
echo "Building agent gateway..."
npm run build

# Deploy
echo "Deploying to Cloudflare Workers..."
wrangler deploy

GATEWAY_URL=$(wrangler deployments list 2>&1 | grep -o 'https://[^[:space:]]*workers.dev' | head -1)
echo -e "${GREEN}✅ Agent Gateway deployed to: ${GATEWAY_URL}${NC}"

cd ../..

echo ""

# ============================================================================
# Step 6: Deploy Frontend
# ============================================================================

echo -e "${BLUE}Step 6: Deploying Frontend to Cloudflare Pages...${NC}"

cd frontend/coagent

# Install dependencies
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Update environment variable
echo "Updating environment with gateway URL..."
cat > .env.production << EOF
VITE_GATEWAY_URL=$GATEWAY_URL
EOF

# Build
echo "Building frontend..."
npm run build

# Deploy to Pages
echo "Deploying to Cloudflare Pages..."
wrangler pages deploy dist --project-name=erpnext-coagent-ui

FRONTEND_URL=$(wrangler pages deployment list --project-name=erpnext-coagent-ui 2>&1 | grep -o 'https://[^[:space:]]*pages.dev' | head -1)
echo -e "${GREEN}✅ Frontend deployed to: ${FRONTEND_URL}${NC}"

cd ../..

echo ""

# ============================================================================
# Step 7: Summary
# ============================================================================

echo ""
echo "======================================================"
echo -e "${GREEN}🎉 Deployment Complete!${NC}"
echo "======================================================"
echo ""
echo "📊 Resources Created:"
echo "  • KV SESSIONS:       $SESSIONS_ID"
echo "  • KV WORKFLOW_STATE: $WORKFLOW_STATE_ID"
echo "  • D1 Database:       $D1_DB_ID"
echo ""
echo "🌐 Deployed Services:"
echo "  • Frontend:       $FRONTEND_URL"
echo "  • Agent Gateway:  $GATEWAY_URL"
echo ""
echo "📝 Next Steps:"
echo "  1. Deploy workflow service to Render (see CLOUDFLARE_FREE_TIER_DEPLOY.md)"
echo "  2. Test end-to-end: Visit $FRONTEND_URL"
echo "  3. Monitor usage: https://dash.cloudflare.com"
echo ""
echo "💰 Monthly Cost: \$0 (Free Tier)"
echo ""
echo "======================================================"

# Save deployment info
cat > DEPLOYMENT_INFO.txt << EOF
ERPNext CoAgents - Deployment Information
Generated: $(date)

Cloudflare Resources:
- KV SESSIONS ID:       $SESSIONS_ID
- KV WORKFLOW_STATE ID: $WORKFLOW_STATE_ID
- D1 Database ID:       $D1_DB_ID
- D1 Database Name:     erpnext-workflows-db

Deployed URLs:
- Frontend:             $FRONTEND_URL
- Agent Gateway:        $GATEWAY_URL

Configuration Files:
- Agent Gateway:        services/agent-gateway/wrangler.toml
- Frontend:             frontend/coagent/wrangler.toml

Secrets Set (in Cloudflare):
- ANTHROPIC_API_KEY
- WORKFLOW_SERVICE_URL
(+ Optional ERPNext credentials)

Next: Deploy Python workflow service to Render
See: CLOUDFLARE_FREE_TIER_DEPLOY.md
EOF

echo -e "${GREEN}✅ Deployment info saved to: DEPLOYMENT_INFO.txt${NC}"
echo ""
