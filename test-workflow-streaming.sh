#!/bin/bash
# Comprehensive Test Script for Workflow Streaming
# Tests the complete flow: Frontend -> Gateway -> Workflow Service

set -e

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# Configuration
GATEWAY_URL="${GATEWAY_URL:-http://localhost:3000}"
WORKFLOW_SERVICE_URL="${WORKFLOW_SERVICE_URL:-http://localhost:8000}"

echo -e "${BLUE}=== Workflow Streaming Test Suite ===${NC}\n"

# Test 1: Gateway Health Check
echo -e "${YELLOW}[1/5] Testing Gateway Health...${NC}"
HEALTH_RESPONSE=$(curl -s "${GATEWAY_URL}/health")
WORKFLOW_URL_CONFIG=$(echo "$HEALTH_RESPONSE" | jq -r '.workflow_service')

if [ "$WORKFLOW_URL_CONFIG" = "not-set" ]; then
  echo -e "${RED}✗ WORKFLOW_SERVICE_URL not configured in gateway${NC}"
  echo -e "${YELLOW}  Fix: Set WORKFLOW_SERVICE_URL in .dev.vars or as Cloudflare secret${NC}"
  exit 1
else
  echo -e "${GREEN}✓ Gateway healthy${NC}"
  echo -e "  Workflow service: $WORKFLOW_URL_CONFIG"
fi

# Test 2: Workflow Service Health Check
echo -e "\n${YELLOW}[2/5] Testing Workflow Service...${NC}"
WORKFLOW_HEALTH=$(curl -s "${WORKFLOW_SERVICE_URL}/health" || echo '{"status":"error"}')
WORKFLOW_STATUS=$(echo "$WORKFLOW_HEALTH" | jq -r '.status')

if [ "$WORKFLOW_STATUS" != "healthy" ]; then
  echo -e "${RED}✗ Workflow service not accessible at ${WORKFLOW_SERVICE_URL}${NC}"
  echo -e "${YELLOW}  Fix: Start workflow service or update WORKFLOW_SERVICE_URL${NC}"
  exit 1
else
  echo -e "${GREEN}✓ Workflow service healthy${NC}"
fi

# Test 3: Test /agui SSE Streaming (with timeout)
echo -e "\n${YELLOW}[3/5] Testing /agui SSE Streaming...${NC}"

# Create test payload
TEST_PAYLOAD=$(cat <<EOF
{
  "graph_name": "hotel_o2c",
  "initial_state": {
    "prompt": "Test workflow streaming",
    "app_context": {
      "appType": "hotel",
      "currentPage": "test",
      "userRole": "admin"
    }
  }
}
EOF
)

# Test streaming with timeout (10 seconds)
STREAM_OUTPUT=$(timeout 10 curl -s -N \
  -H "Content-Type: application/json" \
  -H "Accept: text/event-stream" \
  -d "$TEST_PAYLOAD" \
  "${GATEWAY_URL}/agui" 2>&1 || echo "")

if echo "$STREAM_OUTPUT" | grep -q "event:"; then
  echo -e "${GREEN}✓ SSE streaming working${NC}"
  echo -e "  Sample events:"
  echo "$STREAM_OUTPUT" | head -5 | sed 's/^/  /'
else
  echo -e "${RED}✗ No SSE events received${NC}"
  echo -e "  Response: $STREAM_OUTPUT" | head -3
  exit 1
fi

# Test 4: Frontend Environment Check
echo -e "\n${YELLOW}[4/5] Testing Frontend Configuration...${NC}"

if [ -f "frontend/coagent/.env.local" ]; then
  if grep -q "NEXT_PUBLIC_GATEWAY_URL" frontend/coagent/.env.local; then
    GATEWAY_URL_ENV=$(grep "NEXT_PUBLIC_GATEWAY_URL" frontend/coagent/.env.local | cut -d'=' -f2)
    echo -e "${GREEN}✓ NEXT_PUBLIC_GATEWAY_URL configured${NC}"
    echo -e "  Value: $GATEWAY_URL_ENV"
  else
    echo -e "${RED}✗ NEXT_PUBLIC_GATEWAY_URL not set in .env.local${NC}"
    echo -e "${YELLOW}  Fix: Add NEXT_PUBLIC_GATEWAY_URL to frontend/coagent/.env.local${NC}"
    exit 1
  fi
else
  echo -e "${RED}✗ frontend/coagent/.env.local not found${NC}"
  echo -e "${YELLOW}  Fix: Copy .env.example to .env.local and configure${NC}"
  exit 1
fi

# Test 5: Verify Gateway .dev.vars
echo -e "\n${YELLOW}[5/5] Testing Gateway Local Configuration...${NC}"

if [ -f "services/agent-gateway/.dev.vars" ]; then
  if grep -q "WORKFLOW_SERVICE_URL" services/agent-gateway/.dev.vars; then
    echo -e "${GREEN}✓ Gateway .dev.vars configured${NC}"
  else
    echo -e "${YELLOW}⚠ WORKFLOW_SERVICE_URL not in .dev.vars (may be using secret)${NC}"
  fi
else
  echo -e "${YELLOW}⚠ .dev.vars not found (may be using secrets)${NC}"
  echo -e "  For local dev: Copy .dev.vars.example to .dev.vars"
fi

# Summary
echo -e "\n${BLUE}=== Test Summary ===${NC}"
echo -e "${GREEN}✓ All critical tests passed!${NC}"
echo -e "\n${BLUE}Next Steps:${NC}"
echo -e "1. Start services:"
echo -e "   ${YELLOW}# Terminal 1: Gateway${NC}"
echo -e "   cd services/agent-gateway && pnpm run dev"
echo -e "\n   ${YELLOW}# Terminal 2: Workflow Service${NC}"
echo -e "   cd services/workflows && poetry run uvicorn src.main:app --reload"
echo -e "\n   ${YELLOW}# Terminal 3: Frontend${NC}"
echo -e "   cd frontend/coagent && pnpm run dev"
echo -e "\n2. Open http://localhost:3001 (or your Next.js port)"
echo -e "3. Open CopilotKit sidebar and test workflow:"
echo -e "   ${YELLOW}\"Create a hotel reservation for John Doe\"${NC}"
echo -e "4. Check console for workflow events and stream panel in UI"
echo -e "\n${GREEN}Happy Testing! 🚀${NC}"
