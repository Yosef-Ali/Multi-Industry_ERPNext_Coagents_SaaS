#!/bin/bash

# ============================================================================
# ERPNext Coagents - Chat Setup Diagnostics
# ============================================================================

echo "🔍 ERPNext Coagents Chat Diagnostics"
echo "======================================"
echo ""

# Colors
GREEN='\033[0;32m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Check markers
CHECK_OK="${GREEN}✅${NC}"
CHECK_FAIL="${RED}❌${NC}"
CHECK_WARN="${YELLOW}⚠️${NC}"

# ============================================================================
# 1. Check Frontend Directory
# ============================================================================
echo "📁 Checking Frontend Directory..."
if [ -d "frontend/coagent" ]; then
    echo -e "$CHECK_OK Frontend directory exists"
else
    echo -e "$CHECK_FAIL Frontend directory not found!"
    exit 1
fi
echo ""

# ============================================================================
# 2. Check .env File
# ============================================================================
echo "⚙️ Checking Environment Configuration..."
if [ -f "frontend/coagent/.env" ]; then
    echo -e "$CHECK_OK .env file exists"
    
    # Check for API key
    if grep -q "OPENROUTER_API_KEY=sk-or-v1-" frontend/coagent/.env; then
        echo -e "$CHECK_OK OpenRouter API key is set"
    else
        echo -e "$CHECK_FAIL OpenRouter API key is missing or invalid!"
        echo ""
        echo "🔧 How to fix:"
        echo "1. Get API key from: https://openrouter.ai/keys"
        echo "2. Add to frontend/coagent/.env:"
        echo "   OPENROUTER_API_KEY=sk-or-v1-YOUR_KEY_HERE"
        echo ""
        exit 1
    fi
    
    # Check model setting
    if grep -q "OPENROUTER_MODEL=" frontend/coagent/.env; then
        MODEL=$(grep "OPENROUTER_MODEL=" frontend/coagent/.env | cut -d'=' -f2)
        echo -e "$CHECK_OK Model configured: $MODEL"
    else
        echo -e "$CHECK_WARN Model not set, will use default"
    fi
else
    echo -e "$CHECK_FAIL .env file not found!"
    echo ""
    echo "🔧 How to fix:"
    echo "cd frontend/coagent"
    echo "cp .env.example .env"
    echo "# Then edit .env and add your OPENROUTER_API_KEY"
    echo ""
    exit 1
fi
echo ""

# ============================================================================
# 3. Check Node.js and pnpm
# ============================================================================
echo "📦 Checking Dependencies..."
if command -v node &> /dev/null; then
    NODE_VERSION=$(node --version)
    echo -e "$CHECK_OK Node.js installed: $NODE_VERSION"
else
    echo -e "$CHECK_FAIL Node.js not found!"
    exit 1
fi

if command -v pnpm &> /dev/null; then
    PNPM_VERSION=$(pnpm --version)
    echo -e "$CHECK_OK pnpm installed: $PNPM_VERSION"
else
    echo -e "$CHECK_FAIL pnpm not found!"
    echo ""
    echo "🔧 How to fix:"
    echo "npm install -g pnpm"
    echo ""
    exit 1
fi

if [ -d "frontend/coagent/node_modules" ]; then
    echo -e "$CHECK_OK node_modules exists"
else
    echo -e "$CHECK_WARN node_modules not found"
    echo "   Run: cd frontend/coagent && pnpm install"
fi
echo ""

# ============================================================================
# 4. Check Backend Services (Optional)
# ============================================================================
echo "🌐 Checking Backend Services..."
if curl -s http://localhost:3000/health &> /dev/null; then
    echo -e "$CHECK_OK Agent Gateway running (port 3000)"
else
    echo -e "$CHECK_WARN Agent Gateway not running (port 3000)"
    echo "   Optional: Start with 'docker-compose up -d' in project root"
fi

if curl -s http://localhost:8001/health &> /dev/null; then
    echo -e "$CHECK_OK Workflow Service running (port 8001)"
else
    echo -e "$CHECK_WARN Workflow Service not running (port 8001)"
fi

if curl -s http://localhost:8002/health &> /dev/null; then
    echo -e "$CHECK_OK Generator Service running (port 8002)"
else
    echo -e "$CHECK_WARN Generator Service not running (port 8002)"
fi
echo ""

# ============================================================================
# 5. Test OpenRouter Connection
# ============================================================================
echo "🔌 Testing OpenRouter Connection..."
API_KEY=$(grep "OPENROUTER_API_KEY=" frontend/coagent/.env | cut -d'=' -f2)

if [ ! -z "$API_KEY" ]; then
    RESPONSE=$(curl -s -o /dev/null -w "%{http_code}" https://openrouter.ai/api/v1/models \
        -H "Authorization: Bearer $API_KEY")
    
    if [ "$RESPONSE" = "200" ]; then
        echo -e "$CHECK_OK OpenRouter API is accessible"
        
        # Check credits
        CREDIT_INFO=$(curl -s https://openrouter.ai/api/v1/auth/key \
            -H "Authorization: Bearer $API_KEY")
        
        if echo "$CREDIT_INFO" | grep -q "rate_limit"; then
            echo -e "$CHECK_OK API key is valid and active"
        fi
    else
        echo -e "$CHECK_FAIL Cannot connect to OpenRouter (HTTP $RESPONSE)"
        echo "   Check your API key or add credits at: https://openrouter.ai/"
    fi
fi
echo ""

# ============================================================================
# 6. Check Port Availability
# ============================================================================
echo "🔍 Checking Port Availability..."
if lsof -Pi :3000 -sTCP:LISTEN -t &> /dev/null; then
    PROCESS=$(lsof -Pi :3000 -sTCP:LISTEN | tail -n 1 | awk '{print $1}')
    echo -e "$CHECK_WARN Port 3000 is in use by: $PROCESS"
    echo "   Stop it or use a different port"
else
    echo -e "$CHECK_OK Port 3000 is available"
fi
echo ""

# ============================================================================
# Summary
# ============================================================================
echo "📊 Summary"
echo "==========="
echo ""
echo "To start the frontend:"
echo "  cd frontend/coagent"
echo "  pnpm dev"
echo ""
echo "Then open: http://localhost:3000/developer"
echo ""

if [ -f "frontend/coagent/.env" ] && grep -q "OPENROUTER_API_KEY=sk-or-v1-" frontend/coagent/.env; then
    echo -e "${GREEN}🎉 Setup looks good! You should be able to chat now.${NC}"
else
    echo -e "${RED}⚠️ Please fix the issues above before starting.${NC}"
fi
