#!/bin/bash
# Start all services for workflow streaming testing

set -e

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

echo -e "${BLUE}🚀 Starting Workflow Streaming Services${NC}\n"

# Kill existing processes on these ports
echo -e "${YELLOW}Cleaning up existing processes...${NC}"
lsof -ti:8000 | xargs kill -9 2>/dev/null || true
lsof -ti:3000 | xargs kill -9 2>/dev/null || true
lsof -ti:3001 | xargs kill -9 2>/dev/null || true

# Create log directory
mkdir -p logs

# Start Workflow Service
echo -e "\n${YELLOW}[1/3] Starting Workflow Service (port 8000)...${NC}"
cd services/workflows
poetry run uvicorn src.main:app --reload --port 8000 > ../../logs/workflow.log 2>&1 &
WORKFLOW_PID=$!
cd ../..
echo -e "${GREEN}✓ Workflow Service started (PID: $WORKFLOW_PID)${NC}"

# Wait for workflow service
sleep 3

# Start Agent Gateway
echo -e "\n${YELLOW}[2/3] Starting Agent Gateway (port 3000)...${NC}"
cd services/agent-gateway
pnpm run dev > ../../logs/gateway.log 2>&1 &
GATEWAY_PID=$!
cd ../..
echo -e "${GREEN}✓ Agent Gateway started (PID: $GATEWAY_PID)${NC}"

# Wait for gateway
sleep 3

# Start Frontend
echo -e "\n${YELLOW}[3/3] Starting Frontend (port 3001)...${NC}"
cd frontend/coagent
pnpm run dev > ../../logs/frontend.log 2>&1 &
FRONTEND_PID=$!
cd ../..
echo -e "${GREEN}✓ Frontend started (PID: $FRONTEND_PID)${NC}"

# Wait for all services to fully start
echo -e "\n${YELLOW}Waiting for services to initialize...${NC}"
sleep 5

# Health checks
echo -e "\n${BLUE}Health Checks:${NC}"

# Check Workflow Service
if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Workflow Service: http://localhost:8000${NC}"
else
    echo -e "${YELLOW}⚠ Workflow Service: Starting... (check logs/workflow.log)${NC}"
fi

# Check Gateway
if curl -s http://localhost:3000/health > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Agent Gateway: http://localhost:3000${NC}"
else
    echo -e "${YELLOW}⚠ Agent Gateway: Starting... (check logs/gateway.log)${NC}"
fi

# Check Frontend
if curl -s http://localhost:3001 > /dev/null 2>&1; then
    echo -e "${GREEN}✓ Frontend: http://localhost:3001${NC}"
else
    echo -e "${YELLOW}⚠ Frontend: Starting... (check logs/frontend.log)${NC}"
fi

# Save PIDs
echo "$WORKFLOW_PID $GATEWAY_PID $FRONTEND_PID" > .service-pids

echo -e "\n${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
echo -e "${GREEN}✓ All services started!${NC}"
echo -e "${BLUE}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}\n"

echo -e "${YELLOW}📋 Next Steps:${NC}"
echo -e "1. Run automated tests:"
echo -e "   ${GREEN}./test-workflow-streaming.sh${NC}"
echo -e ""
echo -e "2. Test in browser:"
echo -e "   ${GREEN}Open http://localhost:3001${NC}"
echo -e "   - Click CopilotKit sidebar"
echo -e "   - Type: \"Create a hotel reservation\""
echo -e "   - Watch WorkflowStreamPanel appear"
echo -e ""
echo -e "3. View logs:"
echo -e "   ${GREEN}tail -f logs/workflow.log${NC}"
echo -e "   ${GREEN}tail -f logs/gateway.log${NC}"
echo -e "   ${GREEN}tail -f logs/frontend.log${NC}"
echo -e ""
echo -e "4. Stop all services:"
echo -e "   ${GREEN}./stop-all-services.sh${NC}"
echo -e ""

echo -e "${BLUE}Happy Testing! 🚀${NC}\n"
