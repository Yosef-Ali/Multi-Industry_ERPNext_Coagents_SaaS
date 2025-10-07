#!/bin/bash
# Smoke test for agent gateway
# Tests health endpoints and basic chat functionality

set -e  # Exit on error

echo "🧪 Running Agent Gateway Smoke Tests..."
echo ""

# Colors for output
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Test 1: Health endpoint
echo -n "1. Testing /health endpoint... "
if curl -sf http://localhost:3001/health > /dev/null; then
  echo -e "${GREEN}✓ PASS${NC}"
else
  echo -e "${RED}✗ FAIL${NC}"
  exit 1
fi

# Test 2: Chat health endpoint
echo -n "2. Testing /api/chat/health endpoint... "
if curl -sf http://localhost:3001/api/chat/health > /dev/null; then
  echo -e "${GREEN}✓ PASS${NC}"
else
  echo -e "${RED}✗ FAIL${NC}"
  exit 1
fi

# Test 3: Chat endpoint with basic prompt (checks for streamed response)
echo -n "3. Testing /api/chat with basic prompt... "
response=$(curl -sN -H "Content-Type: application/json" \
  -d '{"messages":[{"role":"user","content":"Hello"}],"model":"gemini-2.5-pro"}' \
  http://localhost:3001/api/chat | head -n 20)

if [ ! -z "$response" ]; then
  echo -e "${GREEN}✓ PASS${NC}"
  echo -e "   ${YELLOW}Response preview:${NC}"
  echo "$response" | head -n 3 | sed 's/^/   /'
else
  echo -e "${RED}✗ FAIL - No response received${NC}"
  exit 1
fi

echo ""
echo -e "${GREEN}🎉 All smoke tests passed!${NC}"
