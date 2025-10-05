#!/bin/bash

# Helper script to start services manually
# Usage: ./start-services.sh [service-name]
# No args = show menu

set -e

GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m'

export PATH="$HOME/.local/bin:$PATH"

show_menu() {
    echo ""
    echo -e "${BLUE}🚀 ERPNext Coagents - Service Starter${NC}"
    echo "======================================"
    echo ""
    echo "Available services:"
    echo "  1) redis          - Redis server (Docker)"
    echo "  2) agent-gateway  - Agent Gateway (Port 3000)"
    echo "  3) workflows      - Workflows Service (Port 8000)"
    echo "  4) generator      - Generator Service (Port 8001)"
    echo "  5) frontend       - Frontend (Port 5173)"
    echo "  6) all            - Start all services"
    echo "  7) status         - Check service status"
    echo "  q) quit"
    echo ""
    read -p "Select service (1-7 or q): " choice
    echo ""
    
    case $choice in
        1) start_redis ;;
        2) start_agent_gateway ;;
        3) start_workflows ;;
        4) start_generator ;;
        5) start_frontend ;;
        6) start_all ;;
        7) check_status ;;
        q) exit 0 ;;
        *) echo "Invalid choice"; show_menu ;;
    esac
}

start_redis() {
    echo -e "${YELLOW}Starting Redis...${NC}"
    if docker ps | grep -q erpnext-redis; then
        echo -e "${GREEN}✓ Redis already running${NC}"
    else
        docker run -d -p 6379:6379 --name erpnext-redis redis:7-alpine || {
            echo -e "${YELLOW}Note: Docker might not be running. Start Docker Desktop and try again.${NC}"
            return 1
        }
        sleep 2
        echo -e "${GREEN}✓ Redis started on port 6379${NC}"
    fi
}

start_agent_gateway() {
    echo -e "${YELLOW}Starting Agent Gateway...${NC}"
    cd services/agent-gateway
    echo "Running on http://localhost:3000"
    npm run dev
}

start_workflows() {
    echo -e "${YELLOW}Starting Workflows Service...${NC}"
    cd services/workflows
    echo "Running on http://localhost:8000"
    poetry run uvicorn src.main:app --reload --port 8000
}

start_generator() {
    echo -e "${YELLOW}Starting Generator Service...${NC}"
    cd services/generator
    echo "Running on http://localhost:8001"
    poetry run uvicorn src.main:app --reload --port 8001
}

start_frontend() {
    echo -e "${YELLOW}Starting Frontend...${NC}"
    cd frontend/coagent
    echo "Running on http://localhost:5173"
    npm run dev
}

start_all() {
    echo -e "${BLUE}Starting all services...${NC}"
    echo ""
    echo "This will open 5 terminal windows."
    echo "Make sure you have:"
    echo "  1. Docker Desktop running (for Redis)"
    echo "  2. API keys configured in .env"
    echo ""
    read -p "Continue? (y/n) " -n 1 -r
    echo ""
    
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        return 0
    fi
    
    # Start Redis first
    start_redis
    
    # Open new terminal windows for each service
    if [[ "$OSTYPE" == "darwin"* ]]; then
        # macOS
        osascript -e 'tell application "Terminal" to do script "cd \"'$(pwd)'\" && cd services/agent-gateway && npm run dev"'
        sleep 1
        osascript -e 'tell application "Terminal" to do script "cd \"'$(pwd)'\" && export PATH=\"$HOME/.local/bin:$PATH\" && cd services/workflows && poetry run uvicorn src.main:app --reload --port 8000"'
        sleep 1
        osascript -e 'tell application "Terminal" to do script "cd \"'$(pwd)'\" && export PATH=\"$HOME/.local/bin:$PATH\" && cd services/generator && poetry run uvicorn src.main:app --reload --port 8001"'
        sleep 1
        osascript -e 'tell application "Terminal" to do script "cd \"'$(pwd)'\" && cd frontend/coagent && npm run dev"'
        
        echo ""
        echo -e "${GREEN}✓ All services started in new terminal windows${NC}"
        echo ""
        echo "Check health endpoints:"
        echo "  - http://localhost:3000/health"
        echo "  - http://localhost:8000/health"
        echo "  - http://localhost:8001/health"
        echo "  - http://localhost:5173"
    else
        echo "Auto-start only supported on macOS."
        echo "Please start services manually in separate terminals."
    fi
}

check_status() {
    echo -e "${BLUE}Checking service status...${NC}"
    echo ""
    
    # Check Redis
    if docker ps | grep -q erpnext-redis; then
        echo -e "${GREEN}✓ Redis${NC} - Running"
    else
        echo -e "${YELLOW}✗ Redis${NC} - Not running"
    fi
    
    # Check ports
    check_port "Agent Gateway" 3000
    check_port "Workflows" 8000
    check_port "Generator" 8001
    check_port "Frontend" 5173
    
    echo ""
    echo "Health checks:"
    echo ""
    
    curl -s http://localhost:3000/health > /dev/null 2>&1 && \
        echo -e "${GREEN}✓${NC} Agent Gateway: http://localhost:3000/health" || \
        echo -e "${YELLOW}✗${NC} Agent Gateway: Not responding"
    
    curl -s http://localhost:8000/health > /dev/null 2>&1 && \
        echo -e "${GREEN}✓${NC} Workflows: http://localhost:8000/health" || \
        echo -e "${YELLOW}✗${NC} Workflows: Not responding"
    
    curl -s http://localhost:8001/health > /dev/null 2>&1 && \
        echo -e "${GREEN}✓${NC} Generator: http://localhost:8001/health" || \
        echo -e "${YELLOW}✗${NC} Generator: Not responding"
    
    curl -s http://localhost:5173 > /dev/null 2>&1 && \
        echo -e "${GREEN}✓${NC} Frontend: http://localhost:5173" || \
        echo -e "${YELLOW}✗${NC} Frontend: Not responding"
}

check_port() {
    local name=$1
    local port=$2
    
    if lsof -Pi :$port -sTCP:LISTEN -t >/dev/null 2>&1; then
        echo -e "${GREEN}✓ $name${NC} - Port $port in use"
    else
        echo -e "${YELLOW}✗ $name${NC} - Port $port available"
    fi
}

# Main execution
if [ $# -eq 0 ]; then
    show_menu
else
    case $1 in
        redis) start_redis ;;
        agent-gateway) start_agent_gateway ;;
        workflows) start_workflows ;;
        generator) start_generator ;;
        frontend) start_frontend ;;
        all) start_all ;;
        status) check_status ;;
        *) echo "Unknown service: $1"; echo "Usage: $0 [redis|agent-gateway|workflows|generator|frontend|all|status]" ;;
    esac
fi
