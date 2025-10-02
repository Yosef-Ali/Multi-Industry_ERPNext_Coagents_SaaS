#!/bin/bash

# Multi-Industry ERPNext Coagents SaaS - Quick Setup Script
# This script will set up your development environment

set -e

echo "🚀 ERPNext Coagents SaaS - Development Setup"
echo "=============================================="
echo ""

# Colors for output
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
RED='\033[0;31m'
NC='\033[0m' # No Color

# Check prerequisites
echo "📋 Checking prerequisites..."
echo ""

# Check Node.js
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "${GREEN}✓${NC} Node.js: $NODE_VERSION"
else
    echo -e "${RED}✗${NC} Node.js not found. Please install Node.js 18+ from https://nodejs.org/"
    exit 1
fi

# Check npm
if command -v npm &> /dev/null; then
    NPM_VERSION=$(npm --version)
    echo -e "${GREEN}✓${NC} npm: v$NPM_VERSION"
else
    echo -e "${RED}✗${NC} npm not found"
    exit 1
fi

# Check Python
if command -v python3 &> /dev/null; then
    PYTHON_VERSION=$(python3 --version)
    echo -e "${GREEN}✓${NC} Python: $PYTHON_VERSION"
else
    echo -e "${RED}✗${NC} Python 3 not found. Please install Python 3.11+ from https://python.org/"
    exit 1
fi

# Check Poetry
if command -v poetry &> /dev/null; then
    POETRY_VERSION=$(poetry --version)
    echo -e "${GREEN}✓${NC} $POETRY_VERSION"
else
    echo -e "${YELLOW}!${NC} Poetry not found. Installing..."
    pip3 install poetry
fi

# Check Docker
if command -v docker &> /dev/null; then
    DOCKER_VERSION=$(docker --version)
    echo -e "${GREEN}✓${NC} $DOCKER_VERSION"
else
    echo -e "${YELLOW}!${NC} Docker not found (optional for Redis)"
fi

# Check Docker Compose
if command -v docker-compose &> /dev/null; then
    COMPOSE_VERSION=$(docker-compose --version)
    echo -e "${GREEN}✓${NC} $COMPOSE_VERSION"
else
    echo -e "${YELLOW}!${NC} Docker Compose not found (optional)"
fi

echo ""
echo "=============================================="
echo ""

# Create .env if it doesn't exist
if [ ! -f .env ]; then
    echo "📝 Creating .env file from .env.example..."
    cp .env.example .env
    echo -e "${GREEN}✓${NC} .env file created"
    echo -e "${YELLOW}!${NC} Please edit .env and add your API keys"
else
    echo -e "${GREEN}✓${NC} .env file already exists"
fi

echo ""

# Install dependencies
read -p "📦 Install dependencies? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Installing Agent Gateway dependencies..."
    cd services/agent-gateway
    npm install
    echo -e "${GREEN}✓${NC} Agent Gateway dependencies installed"
    cd ../..

    echo ""
    echo "Installing Workflows Service dependencies..."
    cd services/workflows
    poetry install
    echo -e "${GREEN}✓${NC} Workflows Service dependencies installed"
    cd ../..

    echo ""
    echo "Installing Generator Service dependencies..."
    cd services/generator
    poetry install
    echo -e "${GREEN}✓${NC} Generator Service dependencies installed"
    cd ../..

    echo ""
    echo "Installing Frontend dependencies..."
    cd frontend/coagent
    npm install
    echo -e "${GREEN}✓${NC} Frontend dependencies installed"
    cd ../..
fi

echo ""
echo "=============================================="
echo ""

# Build TypeScript
read -p "🔨 Build TypeScript code? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Building Agent Gateway..."
    cd services/agent-gateway
    npm run build
    echo -e "${GREEN}✓${NC} TypeScript compiled successfully"
    cd ../..
fi

echo ""
echo "=============================================="
echo ""

# Start Redis
read -p "🚀 Start Redis with Docker? (y/n) " -n 1 -r
echo
if [[ $REPLY =~ ^[Yy]$ ]]; then
    echo ""
    echo "Starting Redis container..."
    docker run -d -p 6379:6379 --name erpnext-redis redis:7-alpine 2>/dev/null || echo -e "${YELLOW}!${NC} Redis container already running or Docker not available"
    sleep 2
    if docker ps | grep -q erpnext-redis; then
        echo -e "${GREEN}✓${NC} Redis running on port 6379"
    fi
fi

echo ""
echo "=============================================="
echo -e "${GREEN}✨ Setup Complete!${NC}"
echo "=============================================="
echo ""
echo "📚 Next Steps:"
echo ""
echo "1. Edit .env file with your API keys:"
echo "   - ANTHROPIC_API_KEY (required)"
echo "   - ERPNEXT_API_KEY and ERPNEXT_API_SECRET (required)"
echo ""
echo "2. Start all services:"
echo "   Option A (Docker): docker-compose up -d"
echo "   Option B (Manual):"
echo "     Terminal 1: cd services/agent-gateway && npm run dev"
echo "     Terminal 2: cd services/workflows && poetry run uvicorn src.main:app --reload --port 8000"
echo "     Terminal 3: cd services/generator && poetry run uvicorn src.main:app --reload --port 8001"
echo "     Terminal 4: cd frontend/coagent && npm run dev"
echo ""
echo "3. Verify health endpoints:"
echo "   - Agent Gateway: http://localhost:3000/health"
echo "   - Workflows: http://localhost:8000/health"
echo "   - Generator: http://localhost:8001/health"
echo "   - Frontend: http://localhost:5173"
echo ""
echo "4. Read DEV_SETUP.md for detailed documentation"
echo ""
echo "=============================================="
