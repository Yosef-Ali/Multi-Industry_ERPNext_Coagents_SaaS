#!/bin/bash

# Start Dev Servers Script
# Runs both frontend and gateway servers in the background

set -e

PROJECT_ROOT="/Users/mekdesyared/Multi-Industry_ERPNext_Coagents_SaaS"
FRONTEND_DIR="$PROJECT_ROOT/frontend/coagent"
GATEWAY_DIR="$PROJECT_ROOT/services/agent-gateway"

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

echo -e "${BLUE}🚀 Starting Development Servers...${NC}\n"

# Kill existing processes
echo -e "${YELLOW}Cleaning up existing processes...${NC}"
pkill -f "next dev" 2>/dev/null || true
lsof -ti :3001 | xargs kill -9 2>/dev/null || true
sleep 2

# Start Gateway Server
echo -e "${BLUE}Starting Agent Gateway (port 3001)...${NC}"
cd "$GATEWAY_DIR"
nohup npm run dev > "$GATEWAY_DIR/dev.log" 2>&1 &
GATEWAY_PID=$!
echo -e "${GREEN}✓ Gateway started (PID: $GATEWAY_PID)${NC}"

# Wait for gateway to be ready
echo -e "${YELLOW}Waiting for gateway to start...${NC}"
for i in {1..15}; do
  if curl -sf http://localhost:3001/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Gateway is ready!${NC}\n"
    break
  fi
  if [ $i -eq 15 ]; then
    echo -e "${RED}✗ Gateway failed to start${NC}"
    echo -e "${YELLOW}Check logs: tail -50 $GATEWAY_DIR/dev.log${NC}"
    exit 1
  fi
  sleep 1
done

# Start Frontend Server
echo -e "${BLUE}Starting Frontend (port 3000)...${NC}"
cd "$FRONTEND_DIR"
nohup pnpm run dev > "$FRONTEND_DIR/dev.log" 2>&1 &
FRONTEND_PID=$!
echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"

# Wait for frontend to be ready
echo -e "${YELLOW}Waiting for frontend to start...${NC}"
for i in {1..30}; do
  if curl -sf http://localhost:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend is ready!${NC}\n"
    break
  fi
  if [ $i -eq 30 ]; then
    echo -e "${YELLOW}⚠ Frontend taking longer than expected...${NC}"
    echo -e "${YELLOW}Check logs: tail -50 $FRONTEND_DIR/dev.log${NC}\n"
    break
  fi
  sleep 1
done

# Display status
echo -e "${GREEN}================================${NC}"
echo -e "${GREEN}✅ Development Servers Running${NC}"
echo -e "${GREEN}================================${NC}"
echo ""
echo -e "${BLUE}Frontend:${NC} http://localhost:3000 (PID: $FRONTEND_PID)"
echo -e "${BLUE}Gateway:${NC}  http://localhost:3001 (PID: $GATEWAY_PID)"
echo ""
echo -e "${YELLOW}Logs:${NC}"
echo -e "  Gateway: tail -f $GATEWAY_DIR/dev.log"
echo -e "  Frontend: tail -f $FRONTEND_DIR/dev.log"
echo ""
echo -e "${YELLOW}Stop servers:${NC}"
echo -e "  kill $GATEWAY_PID $FRONTEND_PID"
echo -e "  or run: ./stop-dev.sh"
echo ""

# Save PIDs for stop script
echo "$GATEWAY_PID" > "$PROJECT_ROOT/.gateway.pid"
echo "$FRONTEND_PID" > "$PROJECT_ROOT/.frontend.pid"

echo -e "${GREEN}✓ Ready to develop!${NC}"
