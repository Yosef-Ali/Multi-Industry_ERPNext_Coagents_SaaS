# 🎯 Quick Start Guide - Ready to Run!

## ✅ Your Environment Status

Based on the setup check, here's what's already configured:

| Component | Status | Notes |
|-----------|--------|-------|
| **Node.js** | ✅ v22.20.0 | Installed and ready |
| **npm** | ✅ v10.8.2 | Installed and ready |
| **Python** | ✅ v3.13.7 | Installed and ready |
| **Poetry** | ✅ v2.2.1 | Just installed! |
| **Agent Gateway deps** | ✅ Installed | node_modules present |
| **Docker** | ⚠️ Not running | Optional - start if needed |
| **.env file** | ✅ Created | **NEEDS API KEYS** |

---

## 🚀 Start Development (5 Minutes)

### Step 1: Configure API Keys ⚡ **REQUIRED**

Open `.env` and add your keys:

```bash
# Edit this file
nano .env  # or: code .env (VS Code) / open .env (TextEdit)

# Add these required values:
ANTHROPIC_API_KEY=sk-ant-xxxxxxxxxxxxx
ERPNEXT_API_KEY=your_erpnext_api_key
ERPNEXT_API_SECRET=your_erpnext_api_secret
ERPNEXT_API_URL=http://localhost:8080  # or your ERPNext URL
```

**Don't have these yet?**
- **Anthropic**: Sign up at https://console.anthropic.com/
- **ERPNext**: For testing, set `USE_MOCK_ERPNEXT=true` in `.env`

### Step 2: Install Remaining Dependencies

```bash
# Workflows service
cd services/workflows
export PATH="$HOME/.local/bin:$PATH"
poetry install

# Generator service  
cd ../generator
poetry install

# Frontend
cd ../../frontend/coagent
npm install

# Back to root
cd ../..
```

### Step 3: Start Services

**Option A: Manual (Recommended for Development)**

Open 5 terminal windows/tabs and run:

```bash
# Terminal 1: Redis (using Docker)
# First, start Docker Desktop app, then:
docker run -d -p 6379:6379 --name erpnext-redis redis:7-alpine

# OR if you have redis installed locally:
redis-server

# Terminal 2: Agent Gateway
cd services/agent-gateway
npm run dev
# ✓ Running on http://localhost:3000

# Terminal 3: Workflows Service
cd services/workflows
export PATH="$HOME/.local/bin:$PATH"
poetry run uvicorn src.main:app --reload --port 8000
# ✓ Running on http://localhost:8000

# Terminal 4: Generator Service
cd services/generator
export PATH="$HOME/.local/bin:$PATH"
poetry run uvicorn src.main:app --reload --port 8001
# ✓ Running on http://localhost:8001

# Terminal 5: Frontend
cd frontend/coagent
npm run dev
# ✓ Running on http://localhost:5173
```

**Option B: Docker Compose (Once Docker Desktop is running)**

```bash
# Start Docker Desktop app first!

# Then run:
docker-compose up -d

# Check status:
docker-compose ps

# View logs:
docker-compose logs -f
```

---

## ✅ Verify Everything Works

### 1. Check Health Endpoints

```bash
# Agent Gateway
curl http://localhost:3000/health

# Workflows
curl http://localhost:8000/health

# Generator
curl http://localhost:8001/health

# Frontend (open in browser)
open http://localhost:5173
```

### 2. Run Tests

```bash
# Agent Gateway tests
cd services/agent-gateway
npm test

# Workflows tests
cd services/workflows
export PATH="$HOME/.local/bin:$PATH"
poetry run pytest

# All integration tests
cd ../../tests
poetry run pytest integration/ -v
```

---

## 🛠️ Common Commands

### Start Services (Manual)

```bash
# Agent Gateway
cd services/agent-gateway && npm run dev

# Workflows
cd services/workflows && export PATH="$HOME/.local/bin:$PATH" && poetry run uvicorn src.main:app --reload --port 8000

# Generator
cd services/generator && export PATH="$HOME/.local/bin:$PATH" && poetry run uvicorn src.main:app --reload --port 8001

# Frontend
cd frontend/coagent && npm run dev
```

### Stop Services

```bash
# Manual: Press Ctrl+C in each terminal

# Docker:
docker-compose down
```

### View Logs

```bash
# Docker
docker-compose logs -f [service-name]

# Manual
tail -f logs/tools.jsonl
tail -f logs/approvals.jsonl
```

### Clean & Rebuild

```bash
# Agent Gateway
cd services/agent-gateway
rm -rf node_modules dist
npm install
npm run build

# Python services
cd services/workflows
poetry install --no-cache
```

---

## 📁 Key Files to Know

| File | Purpose |
|------|---------|
| `.env` | **Your configuration** - add API keys here! |
| `DEV_SETUP.md` | Full development guide |
| `PROJECT_REVIEW.md` | Project analysis and status |
| `IMPLEMENTATION_GUIDE.md` | Development patterns |
| `docker-compose.yml` | Service orchestration |
| `services/agent-gateway/src/` | TypeScript service code |
| `services/workflows/src/` | Python workflows |
| `frontend/coagent/src/` | React frontend |

---

## 🐛 Troubleshooting

### Redis Connection Error

```bash
# Start Redis with Docker
docker run -d -p 6379:6379 --name erpnext-redis redis:7-alpine

# OR install locally
brew install redis
redis-server
```

### Port Already in Use

```bash
# Find and kill process on port 3000
lsof -ti:3000 | xargs kill -9

# Or change port in .env
GATEWAY_PORT=3001
```

### Poetry Command Not Found

```bash
# Add to PATH
export PATH="$HOME/.local/bin:$PATH"

# Make permanent (add to ~/.zshrc)
echo 'export PATH="$HOME/.local/bin:$PATH"' >> ~/.zshrc
source ~/.zshrc
```

### Docker Not Running

```bash
# Start Docker Desktop application
open -a Docker

# Wait for it to start, then:
docker ps
```

---

## 🎓 Next Steps After Setup

1. **Explore the Code**
   - Review hotel vertical in `services/agent-gateway/src/tools/hotel/`
   - Check out workflow in `services/workflows/src/graphs/hotel/`

2. **Make Your First Change**
   - Pick a task from `specs/001-erpnext-coagents-mvp/tasks.md`
   - Follow the pattern from hotel tools
   - Run tests to verify

3. **Test with API**
   ```bash
   # Try the agent endpoint
   curl -X POST http://localhost:3000/agui \
     -H "Content-Type: application/json" \
     -d '{
       "user_id": "test@example.com",
       "message": "What rooms are available?",
       "enabled_industries": ["hotel"]
     }'
   ```

---

## 📚 Documentation

- **Setup Details**: `DEV_SETUP.md`
- **Project Review**: `PROJECT_REVIEW.md`
- **Implementation Guide**: `IMPLEMENTATION_GUIDE.md`
- **Specification**: `specs/001-erpnext-coagents-mvp/spec.md`

---

## ✨ You're All Set!

Your environment is configured and ready. Just:

1. ✅ Add API keys to `.env`
2. ✅ Install remaining dependencies
3. ✅ Start services
4. ✅ Start coding!

**Happy developing! 🚀**
