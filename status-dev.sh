#!/bin/bash

# Check Dev Servers Status

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}📊 Development Servers Status${NC}\n"

# Check Gateway
echo -e "${YELLOW}Gateway (port 3001):${NC}"
if curl -sf http://localhost:3001/health > /dev/null 2>&1; then
  echo -e "${GREEN}  ✓ Running${NC}"
  GATEWAY_PID=$(lsof -ti :3001)
  echo -e "  PID: $GATEWAY_PID"
else
  echo -e "${RED}  ✗ Not running${NC}"
fi

echo ""

# Check Frontend
echo -e "${YELLOW}Frontend (port 3000):${NC}"
if lsof -i :3000 > /dev/null 2>&1; then
  echo -e "${GREEN}  ✓ Running${NC}"
  FRONTEND_PID=$(lsof -ti :3000)
  echo -e "  PID: $FRONTEND_PID"
  echo -e "  URL: http://localhost:3000"
else
  echo -e "${RED}  ✗ Not running${NC}"
fi

echo ""

# Show all node processes
echo -e "${YELLOW}Active Node processes:${NC}"
ps aux | grep -E "(next dev|tsx.*index\.ts)" | grep -v grep | awk '{print "  PID " $2 ": " $11 " " $12 " " $13 " " $14}'
