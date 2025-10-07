#!/bin/bash
# AG-UI Integration Test Script

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
RED='\033[0;31m'
NC='\033[0m'

GATEWAY_URL="http://localhost:3001"

echo -e "${BLUE}🧪 AG-UI Integration Tests${NC}\n"

# Test 1: Health Check
echo -e "${YELLOW}Test 1: Gateway Health Check${NC}"
if curl -sf "$GATEWAY_URL/health" > /dev/null 2>&1; then
  echo -e "${GREEN}  ✓ Gateway is responding${NC}"
else
  echo -e "${RED}  ✗ Gateway is not responding${NC}"
  exit 1
fi

echo ""

# Test 2: AG-UI Endpoint (with valid token)
echo -e "${YELLOW}Test 2: AG-UI Streaming Endpoint${NC}"
echo "Sending test message..."

RESPONSE=$(curl -sS -X POST "$GATEWAY_URL/agui" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev_test_user_12345678901234567890" \
  -d '{"session_id":"test-123","user_id":"test-user","message":"Hello, can you help me?"}' \
  --max-time 10 2>&1 || true)

if echo "$RESPONSE" | grep -q "data:"; then
  echo -e "${GREEN}  ✓ AG-UI stream responding${NC}"
  echo -e "${BLUE}  First events:${NC}"
  echo "$RESPONSE" | head -5 | sed 's/^/    /'
else
  echo -e "${RED}  ✗ AG-UI stream not working${NC}"
  echo "$RESPONSE" | head -10 | sed 's/^/    /'
fi

echo ""

# Test 3: Context7 Tool (if agent responds)
echo -e "${YELLOW}Test 3: Context7 Documentation Search${NC}"
echo "Asking for documentation..."

RESPONSE=$(curl -sS -X POST "$GATEWAY_URL/agui" \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer dev_test_user_12345678901234567890" \
  -d '{"session_id":"test-456","user_id":"test-user","message":"How do I create a custom doctype in ERPNext?"}' \
  --max-time 15 2>&1 || true)

if echo "$RESPONSE" | grep -q "tool_call.*context7"; then
  echo -e "${GREEN}  ✓ Context7 tool invoked${NC}"
elif echo "$RESPONSE" | grep -q "data:"; then
  echo -e "${YELLOW}  ⚠ Stream working but Context7 tool not invoked yet${NC}"
  echo -e "${BLUE}  Response preview:${NC}"
  echo "$RESPONSE" | grep "data:" | head -3 | sed 's/^/    /'
else
  echo -e "${RED}  ✗ No stream response${NC}"
fi

echo ""

# Test 4: Frontend Environment
echo -e "${YELLOW}Test 4: Frontend Configuration${NC}"
if [ -f "frontend/coagent/.env.local" ]; then
  if grep -q "USE_AGUI=1" frontend/coagent/.env.local; then
    echo -e "${GREEN}  ✓ USE_AGUI=1 configured${NC}"
  else
    echo -e "${YELLOW}  ⚠ USE_AGUI not set to 1${NC}"
  fi
  
  if grep -q "NEXT_PUBLIC_AGENT_GATEWAY_URL" frontend/coagent/.env.local; then
    echo -e "${GREEN}  ✓ Gateway URL configured${NC}"
  else
    echo -e "${YELLOW}  ⚠ Gateway URL not configured${NC}"
  fi
else
  echo -e "${RED}  ✗ .env.local not found${NC}"
fi

echo ""

# Test 5: Check Tool Registry
echo -e "${YELLOW}Test 5: Tool Registry (Context7)${NC}"
if grep -q "mcp_context7_docs" services/agent-gateway/src/tools/registry.ts; then
  echo -e "${GREEN}  ✓ Context7 tool registered${NC}"
else
  echo -e "${RED}  ✗ Context7 tool not found in registry${NC}"
fi

echo ""

# Summary
echo -e "${BLUE}================================${NC}"
echo -e "${GREEN}✅ AG-UI Integration Tests Complete${NC}"
echo -e "${BLUE}================================${NC}"
echo ""
echo -e "${YELLOW}Next Steps:${NC}"
echo "  1. Open http://localhost:3000/developer in browser"
echo "  2. Send message: 'How do I create a custom doctype?'"
echo "  3. Check browser console for AG-UI events"
echo "  4. Check gateway logs for tool invocations"
echo ""
echo -e "${YELLOW}Dev Tools:${NC}"
echo "  - AG-UI test page: http://localhost:3000/ag-ui-gateway-test"
echo "  - Gateway logs: tail -f services/agent-gateway/dev.log"
echo "  - Frontend logs: tail -f frontend/coagent/dev.log"
