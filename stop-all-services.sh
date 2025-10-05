#!/bin/bash
# Stop all workflow streaming services

# Colors
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

echo -e "${YELLOW}🛑 Stopping Workflow Streaming Services${NC}\n"

# Stop by PIDs if available
if [ -f .service-pids ]; then
    read -r WORKFLOW_PID GATEWAY_PID FRONTEND_PID < .service-pids
    echo -e "${YELLOW}Stopping services by PID...${NC}"
    kill $WORKFLOW_PID 2>/dev/null && echo -e "${GREEN}✓ Stopped Workflow Service${NC}" || true
    kill $GATEWAY_PID 2>/dev/null && echo -e "${GREEN}✓ Stopped Agent Gateway${NC}" || true
    kill $FRONTEND_PID 2>/dev/null && echo -e "${GREEN}✓ Stopped Frontend${NC}" || true
    rm .service-pids
fi

# Stop by port as backup
echo -e "\n${YELLOW}Cleaning up ports...${NC}"
lsof -ti:8000 | xargs kill -9 2>/dev/null && echo -e "${GREEN}✓ Cleaned port 8000${NC}" || echo -e "  Port 8000 already free"
lsof -ti:3000 | xargs kill -9 2>/dev/null && echo -e "${GREEN}✓ Cleaned port 3000${NC}" || echo -e "  Port 3000 already free"
lsof -ti:3001 | xargs kill -9 2>/dev/null && echo -e "${GREEN}✓ Cleaned port 3001${NC}" || echo -e "  Port 3001 already free"

echo -e "\n${GREEN}✓ All services stopped${NC}\n"
