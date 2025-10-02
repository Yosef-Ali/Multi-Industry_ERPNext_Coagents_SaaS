# 🚀 Development Environment Setup Guide

**Project**: Multi-Industry ERPNext Coagents SaaS  
**Last Updated**: October 1, 2025  
**Estimated Setup Time**: 20-30 minutes

---

## 📋 Prerequisites

### Required Software

| Tool | Version | Check Command | Install Link |
|------|---------|---------------|--------------|
| **Node.js** | 18.x or 20.x | `node --version` | https://nodejs.org/ |
| **npm** | 9.x+ | `npm --version` | (comes with Node.js) |
| **Python** | 3.11+ | `python3 --version` | https://www.python.org/ |
| **Poetry** | 1.5+ | `poetry --version` | `pip install poetry` |
| **Docker** | 20.x+ | `docker --version` | https://www.docker.com/ |
| **Docker Compose** | 2.x+ | `docker-compose --version` | (comes with Docker Desktop) |
| **Git** | 2.x+ | `git --version` | https://git-scm.com/ |

### Optional but Recommended

- **Redis CLI** (for debugging): `brew install redis` (macOS) or `apt-get install redis-tools` (Linux)
- **Postman** or **Thunder Client** (for API testing)
- **VS Code Extensions**:
  - ESLint
  - Prettier
  - Python
  - Docker
  - REST Client

---

## 🔧 Quick Start (3 Steps)

### Step 1: Clone and Configure

```bash
# If not already cloned
git clone https://github.com/Yosef-Ali/Multi-Industry_ERPNext_Coagents_SaaS.git
cd Multi-Industry_ERPNext_Coagents_SaaS

# Create environment file
cp .env.example .env

# Edit .env with your settings (see Configuration section below)
nano .env  # or use your preferred editor
```

### Step 2: Install Dependencies

```bash
# Agent Gateway (TypeScript)
cd services/agent-gateway
npm install
npm run build
cd ../..

# Workflows Service (Python)
cd services/workflows
poetry install
cd ../..

# Generator Service (Python)
cd services/generator
poetry install
cd ../..

# Frontend (React + Vite)
cd frontend/coagent
npm install
cd ../..
```

### Step 3: Start Services

**Option A: Using Docker (Recommended)**
```bash
# Start all services with Docker Compose
docker-compose up -d

# Check status
docker-compose ps

# View logs
docker-compose logs -f
```

**Option B: Manual Start (for development)**
```bash
# Terminal 1: Redis
docker run -d -p 6379:6379 --name redis redis:7-alpine

# Terminal 2: Agent Gateway
cd services/agent-gateway
npm run dev

# Terminal 3: Workflows Service
cd services/workflows
poetry run uvicorn src.main:app --reload --port 8000

# Terminal 4: Generator Service
cd services/generator
poetry run uvicorn src.main:app --reload --port 8001

# Terminal 5: Frontend
cd frontend/coagent
npm run dev
```

---

## ⚙️ Configuration

### 1. Environment Variables (.env)

Edit your `.env` file with these critical settings:

```bash
# ============================================
# REQUIRED: Get these from your ERPNext instance
# ============================================
ERPNEXT_API_URL=http://localhost:8080
ERPNEXT_API_KEY=your_api_key_here
ERPNEXT_API_SECRET=your_api_secret_here

# ============================================
# REQUIRED: Get from Anthropic Console
# ============================================
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx

# ============================================
# Optional: Defaults are usually fine
# ============================================
REDIS_URL=redis://localhost:6379
GATEWAY_PORT=3000
WORKFLOW_SERVICE_PORT=8000
GENERATOR_SERVICE_PORT=8001
```

### 2. Get ERPNext Credentials

**From ERPNext UI:**
1. Log in to your ERPNext instance
2. Go to **User** → Your Profile → **API Access**
3. Click "Generate Keys"
4. Copy `API Key` and `API Secret`
5. Paste into your `.env` file

**Alternative (if you don't have ERPNext):**
```bash
# For development/testing, you can use mock mode
# Set this in .env:
USE_MOCK_ERPNEXT=true
```

### 3. Get Anthropic API Key

1. Go to https://console.anthropic.com/
2. Sign up/login
3. Navigate to **API Keys**
4. Create a new key
5. Copy and paste into `.env` as `ANTHROPIC_API_KEY`

---

## ✅ Verify Setup

### Health Checks

Once all services are running, verify each endpoint:

```bash
# Agent Gateway
curl http://localhost:3000/health
# Expected: {"status":"healthy","timestamp":"2025-10-01T..."}

# Workflows Service
curl http://localhost:8000/health
# Expected: {"status":"healthy","service":"workflows"}

# Generator Service
curl http://localhost:8001/health
# Expected: {"status":"healthy","service":"generator"}

# Frontend
open http://localhost:5173
# Expected: React app loads in browser

# Redis
redis-cli ping
# Expected: PONG
```

### Run Tests

```bash
# Agent Gateway Tests
cd services/agent-gateway
npm test

# Workflow Tests
cd services/workflows
poetry run pytest

# Generator Tests
cd services/generator
poetry run pytest

# Integration Tests
cd tests
poetry run pytest integration/
```

---

## 🐛 Troubleshooting

### Common Issues

#### Issue: "Cannot find module '@anthropic-ai/sdk'"
```bash
cd services/agent-gateway
npm install
npm run build
```

#### Issue: "Redis connection refused"
```bash
# Start Redis
docker run -d -p 6379:6379 redis:7-alpine

# Or if using Docker Compose
docker-compose up -d redis
```

#### Issue: "Port already in use"
```bash
# Find process using port (example: 3000)
lsof -ti:3000

# Kill process
kill -9 $(lsof -ti:3000)

# Or change port in .env
GATEWAY_PORT=3001
```

#### Issue: "Python module not found"
```bash
# Reinstall Python dependencies
cd services/workflows  # or services/generator
poetry install --no-cache
```

#### Issue: "TypeScript compilation errors"
```bash
cd services/agent-gateway
# Clean build
rm -rf dist node_modules
npm install
npm run build
```

#### Issue: "Frontend won't start"
```bash
cd frontend/coagent
# Clean install
rm -rf node_modules dist
npm install
npm run dev
```

---

## 📁 Project Structure Overview

```
Multi-Industry_ERPNext_Coagents_SaaS/
├── services/
│   ├── agent-gateway/          # Express + TypeScript (Port 3000)
│   │   ├── src/
│   │   │   ├── server.ts       # Main Express app
│   │   │   ├── agent.ts        # Claude Agent wrapper
│   │   │   ├── api.ts          # Frappe API client
│   │   │   ├── streaming.ts    # AG-UI SSE streaming
│   │   │   ├── session.ts      # Session management
│   │   │   ├── tools/          # Tool implementations
│   │   │   ├── routes/         # API routes
│   │   │   └── middleware/     # Express middleware
│   │   └── package.json
│   │
│   ├── workflows/              # FastAPI + Python (Port 8000)
│   │   ├── src/
│   │   │   ├── main.py         # FastAPI app
│   │   │   ├── core/           # Workflow infrastructure
│   │   │   ├── nodes/          # Workflow node functions
│   │   │   └── graphs/         # LangGraph workflows
│   │   └── pyproject.toml
│   │
│   └── generator/              # FastAPI + Python (Port 8001)
│       ├── src/
│       │   ├── main.py         # FastAPI app
│       │   ├── analyzer.py     # Claude-powered analysis
│       │   ├── generator.py    # Template generation
│       │   └── templates/      # Jinja2 templates
│       └── pyproject.toml
│
├── frontend/coagent/           # React + Vite (Port 5173)
│   ├── src/
│   │   ├── App.tsx            # Main app component
│   │   ├── components/        # React components
│   │   └── hooks/             # Custom hooks
│   └── package.json
│
├── apps/                       # ERPNext apps
│   ├── common/                 # Shared utilities
│   ├── erpnext_hotel/         # Hotel vertical
│   ├── erpnext_hospital/      # Hospital vertical
│   ├── erpnext_manufacturing/ # Manufacturing vertical
│   ├── erpnext_retail/        # Retail vertical
│   └── erpnext_education/     # Education vertical
│
├── tests/                      # Test suites
├── logs/                       # Application logs
└── .env                        # Your configuration
```

---

## 🔍 Development Workflow

### Making Changes

1. **Create a feature branch**
   ```bash
   git checkout -b feature/my-new-feature
   ```

2. **Make your changes**
   - Edit files in appropriate service
   - Follow existing patterns (hotel vertical is reference)

3. **Test locally**
   ```bash
   # Run specific service tests
   cd services/agent-gateway && npm test
   cd services/workflows && poetry run pytest
   ```

4. **Check code quality**
   ```bash
   # TypeScript
   cd services/agent-gateway
   npm run lint
   npm run format

   # Python
   cd services/workflows
   poetry run black .
   poetry run isort .
   poetry run mypy src/
   ```

5. **Commit and push**
   ```bash
   git add .
   git commit -m "feat: Add new feature"
   git push origin feature/my-new-feature
   ```

### Hot Reload / Auto-Restart

All services support hot reload in development:

- **Agent Gateway**: Changes auto-rebuild via `tsx watch`
- **Workflows/Generator**: Auto-reload via `uvicorn --reload`
- **Frontend**: Instant HMR via Vite

---

## 📊 Monitoring During Development

### View Logs

```bash
# All services (Docker)
docker-compose logs -f

# Specific service
docker-compose logs -f agent-gateway

# Local logs (if running manually)
tail -f logs/tools.jsonl
tail -f logs/approvals.jsonl
tail -f logs/workflows.jsonl
```

### Redis Inspection

```bash
# Connect to Redis CLI
redis-cli

# List all keys
KEYS *

# Get session info
GET session:abc123

# Monitor all commands
MONITOR
```

### API Testing

Create a file `test-requests.http` for VS Code REST Client:

```http
### Health Check - Agent Gateway
GET http://localhost:3000/health

### Health Check - Workflows
GET http://localhost:8000/health

### Test Tool Execution
POST http://localhost:3000/agui
Content-Type: application/json

{
  "user_id": "test@example.com",
  "message": "What rooms are available tonight?",
  "enabled_industries": ["hotel"]
}
```

---

## 🎯 Next Steps

Once your environment is set up:

1. **Explore the Codebase**
   - Read `PROJECT_REVIEW.md` for comprehensive analysis
   - Review `IMPLEMENTATION_GUIDE.md` for development patterns
   - Check hotel vertical as reference implementation

2. **Run Integration Tests**
   ```bash
   cd tests
   poetry run pytest integration/ -v
   ```

3. **Start Development**
   - Pick a task from `specs/001-erpnext-coagents-mvp/tasks.md`
   - Follow TDD: test → implement → verify
   - Use hotel tools as templates

4. **Test with ERPNext**
   - Set up ERPNext locally (or use cloud instance)
   - Install industry apps from `apps/` directory
   - Test copilot button integration

---

## 🆘 Getting Help

### Documentation

- **Specification**: `specs/001-erpnext-coagents-mvp/spec.md`
- **Architecture**: `specs/001-erpnext-coagents-mvp/plan.md`
- **Tasks**: `specs/001-erpnext-coagents-mvp/tasks.md`
- **Review**: `PROJECT_REVIEW.md`
- **Implementation**: `IMPLEMENTATION_GUIDE.md`

### Common Commands Reference

```bash
# Install all dependencies
npm run install:all         # (if script exists)

# Start all services
docker-compose up -d

# Stop all services
docker-compose down

# Rebuild services
docker-compose up -d --build

# Clean everything
docker-compose down -v
rm -rf services/*/node_modules
rm -rf frontend/*/node_modules

# View service logs
docker-compose logs -f [service-name]

# Execute command in container
docker-compose exec agent-gateway sh

# Run tests
npm test                    # TypeScript
poetry run pytest           # Python
```

---

## ✨ Tips for Productive Development

1. **Use Docker Compose for full stack** - Easiest way to run everything
2. **Use manual start for single service dev** - Faster iteration when working on one service
3. **Keep Redis running** - Needed by all services
4. **Use hot reload** - Don't restart services manually
5. **Check logs frequently** - Errors show up in real-time
6. **Follow the patterns** - Hotel vertical is your template
7. **Run tests first** - TDD approach prevents bugs

---

**Setup complete! You're ready to develop! 🎉**

For questions or issues, check the troubleshooting section or review the documentation.
