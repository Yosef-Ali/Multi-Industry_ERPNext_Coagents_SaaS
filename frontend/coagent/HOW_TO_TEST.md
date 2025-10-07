# 🚀 HOW TO TEST YOUR AI MODELS - STEP BY STEP

## Current Status
You have **6 AI models** configured:
- ✅ 2 FREE models (Gemini 2.5 Pro, Llama 3.3 70B)
- 💰 4 PAID models (GLM-4.6, Gemini Flash Lite, Mistral Small, Mixtral)

## ⚡ QUICK START (2 Steps)

### Step 1: Start the Server
Open a terminal and run:
```bash
cd /Users/mekdesyared/Multi-Industry_ERPNext_Coagents_SaaS/frontend/coagent
pnpm run dev
```

**Keep this terminal open!** You should see:
```
✓ Ready in 2s
Local:  http://localhost:3000
```

### Step 2: Test Models
Open a **NEW terminal** (keep the first one running) and run:
```bash
cd /Users/mekdesyared/Multi-Industry_ERPNext_Coagents_SaaS/frontend/coagent
./check-models.sh
```

This will show you:
- ✅ Which models are working
- ❌ Which models have problems
- 🔑 If API keys are set correctly

## 📋 What Each Script Does

### ✨ `check-models.sh` (RECOMMENDED - START HERE)
**Best for beginners** - Shows clear status of everything
```bash
./check-models.sh
```
- Checks if server is running
- Checks API keys
- Tests 4 key models
- Shows clear results with emojis

### 🔥 `simple-test.sh`
Tests all 6 models, one by one
```bash
./simple-test.sh
```

### ⚡ `quick-test.sh`
Fast test - just 3 models
```bash
./quick-test.sh
```

### 📊 `test-all-models.sh`
Most detailed - tests everything with full output
```bash
./test-all-models.sh
```

## 🔧 Common Problems & Solutions

### Problem 1: "Server not running"
**Solution:**
```bash
cd /Users/mekdesyared/Multi-Industry_ERPNext_Coagents_SaaS/frontend/coagent
pnpm run dev
```
Keep this terminal open and run tests in a NEW terminal.

### Problem 2: "API key not found"
**Solution:** Check your `.env.local` file has these lines:
```bash
GOOGLE_GENERATIVE_AI_API_KEY=AIzaSyC6IVPSr2qZG62t7z7-G_vTCOOXRlHr2_M
OPENROUTER_API_KEY=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
```

### Problem 3: "All tests fail"
**Solutions:**
1. Check your internet connection
2. Make sure API keys are correct
3. Try just the free models first:
   - Open browser: http://localhost:3000/developer
   - Select "Gemini 2.5 Pro" from dropdown
   - Try sending a message

## 🌐 Using the Web Interface

After server is running:
1. Open browser: **http://localhost:3000/developer**
2. Click the model dropdown (top right area)
3. Select a model
4. Type a message and press Enter

You should see:
- Model dropdown showing all 6 models
- Chat interface loads
- Messages send and get responses

## ❓ Still Not Working?

Run this diagnostic:
```bash
cd /Users/mekdesyared/Multi-Industry_ERPNext_Coagents_SaaS/frontend/coagent

# Check what's running on port 3000
lsof -i :3000

# Check if .env.local exists
ls -la .env.local

# Check models configuration
cat lib/ai/models.ts | grep "id:"
```

Share the output and I can help debug further!

## 📝 Your Configured Models

| Model | Type | Provider | Context | Cost |
|-------|------|----------|---------|------|
| Gemini 2.5 Pro | FREE | Google API | 2M tokens | Free |
| Llama 3.3 70B | FREE | OpenRouter | 65K tokens | Free |
| Mistral Small 3.2 | PAID | OpenRouter | 131K tokens | $0.06/1M |
| Mixtral 8x7B | PAID | OpenRouter | 32K tokens | $0.54/1M |
| GLM-4.6 | PAID | OpenRouter | varies | varies |
| Gemini Flash Lite | PAID | OpenRouter | 32K tokens | varies |

## 🎯 Next Steps

1. Run `./check-models.sh` to see current status
2. If all working → Use the web interface at http://localhost:3000/developer
3. If some fail → Check API keys and network
4. If stuck → Share the output from check-models.sh
