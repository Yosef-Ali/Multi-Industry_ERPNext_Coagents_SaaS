#!/bin/bash

# Stop Dev Servers Script

PROJECT_ROOT="/Users/mekdesyared/Multi-Industry_ERPNext_Coagents_SaaS"

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🛑 Stopping Development Servers...${NC}\n"

# Stop by saved PIDs
if [ -f "$PROJECT_ROOT/.gateway.pid" ]; then
  GATEWAY_PID=$(cat "$PROJECT_ROOT/.gateway.pid")
  if ps -p $GATEWAY_PID > /dev/null 2>&1; then
    kill $GATEWAY_PID 2>/dev/null
    echo -e "${GREEN}✓ Stopped Gateway (PID: $GATEWAY_PID)${NC}"
  fi
  rm "$PROJECT_ROOT/.gateway.pid"
fi

if [ -f "$PROJECT_ROOT/.frontend.pid" ]; then
  FRONTEND_PID=$(cat "$PROJECT_ROOT/.frontend.pid")
  if ps -p $FRONTEND_PID > /dev/null 2>&1; then
    kill $FRONTEND_PID 2>/dev/null
    echo -e "${GREEN}✓ Stopped Frontend (PID: $FRONTEND_PID)${NC}"
  fi
  rm "$PROJECT_ROOT/.frontend.pid"
fi

# Force kill any remaining processes
echo -e "${YELLOW}Cleaning up remaining processes...${NC}"
pkill -f "next dev" 2>/dev/null || true
lsof -ti :3001 | xargs kill -9 2>/dev/null || true
lsof -ti :3000 | xargs kill -9 2>/dev/null || true

sleep 1

echo -e "\n${GREEN}✅ All servers stopped${NC}"
