# AI Model Configuration Test Scripts

## Available Scripts

### 1. `test-all-models.sh` - Comprehensive Test
Tests all 6 configured models with detailed output.

```bash
# Start dev server first
pnpm run dev

# Then in another terminal:
./test-all-models.sh
```

### 2. `quick-test.sh` - Quick Health Check
Fast test of key models (3 models only).

```bash
chmod +x quick-test.sh
./quick-test.sh
```

## Configured Models

### Free Models (Guest + Regular Users)
1. **gemini-2.5-pro** - Google Gemini 2.5 Pro (via Google API)
2. **meta-llama/llama-3.3-70b-instruct:free** - Meta Llama 3.3 70B (via OpenRouter)

### Paid Models (Regular Users Only)
3. **z-ai/glm-4.6** - Z-AI GLM-4.6
4. **google/gemini-2.5-flash-lite-preview-09-2025** - Gemini 2.5 Flash Lite
5. **mistralai/mistral-small-3.2-24b-instruct** - Mistral Small 3.2 (131K context)
6. **mistralai/mixtral-8x7b-instruct** - Mixtral 8x7B

## Environment Variables Required

### .env or .env.local
```bash
GOOGLE_GENERATIVE_AI_API_KEY=AIza...  # For Gemini models
OPENROUTER_API_KEY=sk-or-v1-...       # For OpenRouter models
```

## Troubleshooting

### Server not running
```bash
cd /Users/mekdesyared/Multi-Industry_ERPNext_Coagents_SaaS/frontend/coagent
pnpm run dev
```

### Clear cache if models not updating
```bash
rm -rf .next
pnpm run dev
```

### Test individual model via curl
```bash
curl -X POST http://localhost:3000/developer/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "messages": [{"role": "user", "content": "Hello"}],
    "selectedChatModel": "gemini-2.5-pro"
  }'
```
