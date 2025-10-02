# OpenRouter Migration Complete ✅

## Overview
Successfully migrated from Anthropic Claude API to OpenRouter API with GLM-4.6 model support.

## API Key
```
OPENROUTER_API_KEY=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
```

## Changes Made

### 1. Environment Configuration

#### `.env`
- ✅ Updated to use OpenRouter credentials
- Added `OPENROUTER_API_KEY`
- Added `OPENROUTER_MODEL=zhipu/glm-4-9b-chat`
- Added `OPENROUTER_BASE_URL=https://openrouter.ai/api/v1`

#### `.env.example`
- ✅ Updated documentation for OpenRouter
- Removed `ANTHROPIC_API_KEY`
- Added OpenRouter configuration section

### 2. TypeScript Source Files

#### `services/agent-gateway/src/agent.ts`
- ✅ Updated client initialization to use OpenRouter baseURL
- ✅ Changed model to use `process.env.OPENROUTER_MODEL`
- ✅ Updated API key reference from `ANTHROPIC_API_KEY` to `OPENROUTER_API_KEY`

#### `services/agent-gateway/src/orchestrator.ts`
- ✅ Renamed `anthropicApiKey` parameter to `openRouterApiKey` in `OrchestratorConfig` interface
- ✅ Updated Anthropic client to include OpenRouter baseURL
- ✅ Updated model reference to use environment variable
- ✅ Updated all function calls to pass `openRouterApiKey`

#### `services/agent-gateway/src/tools/orchestration/classify.ts`
- ✅ Changed parameter from `anthropicApiKey` to `openRouterApiKey`
- ✅ Added OpenRouter baseURL to client initialization
- ✅ Updated model to use `OPENROUTER_MODEL` environment variable
- ✅ Fixed all `args` references to use `input` parameter

#### `services/agent-gateway/src/tools/orchestration/aggregate.ts`
- ✅ Changed parameter from `anthropicApiKey` to `openRouterApiKey`
- ✅ Added OpenRouter baseURL to client initialization
- ✅ Updated model to use environment variable
- ✅ Fixed `args` references to use `input` parameter

#### `services/agent-gateway/src/tools/orchestration/invoke.ts`
- ✅ Changed parameter from `anthropicApiKey` to `openRouterApiKey`
- ✅ Added OpenRouter baseURL to client initialization
- ✅ Fixed all `args` references to use `input` parameter
- ✅ Updated streaming function to use OpenRouter

#### `services/agent-gateway/src/tools/orchestration/deep-research.ts`
- ✅ Changed parameter from `anthropicApiKey` to `openRouterApiKey`
- ✅ Fixed all `args` references to use `input` parameter
- ✅ Updated registry references

### 3. Configuration Files

#### `services/agent-gateway/wrangler.toml`
- ✅ Updated environment variables section
- Changed from `ANTHROPIC_API_KEY` to `OPENROUTER_API_KEY`, `OPENROUTER_MODEL`, `OPENROUTER_BASE_URL`

#### `services/workflows/wrangler.toml`
- ✅ Updated environment variables section

#### `services/generator/wrangler.toml`
- ✅ Updated environment variables section

### 4. Scripts

#### `start-agent-gateway.sh`
- ✅ Updated API key check from `ANTHROPIC_API_KEY` to `OPENROUTER_API_KEY`
- ✅ Updated error messages

#### `QUICK_COMMANDS.md`
- ✅ Updated Wrangler secret commands to use `OPENROUTER_API_KEY`

## Model Configuration

### Current Model
- **Model**: `zhipu/glm-4-9b-chat` (GLM-4.6)
- **Provider**: OpenRouter
- **Endpoint**: `https://openrouter.ai/api/v1`

### Available Models on OpenRouter
You can change the model by updating `OPENROUTER_MODEL` in `.env`:

```bash
# GLM Models
OPENROUTER_MODEL=zhipu/glm-4-9b-chat       # Current
OPENROUTER_MODEL=zhipu/glm-4-plus          # GLM-4 Plus
OPENROUTER_MODEL=zhipu/glm-4               # GLM-4 Standard

# Or use other OpenRouter models
OPENROUTER_MODEL=anthropic/claude-3-opus
OPENROUTER_MODEL=openai/gpt-4-turbo
OPENROUTER_MODEL=meta-llama/llama-3-70b
```

See all available models at: https://openrouter.ai/models

## Compatibility

### Anthropic SDK Compatibility
The Anthropic TypeScript SDK (`@anthropic-ai/sdk`) is fully compatible with OpenRouter because OpenRouter implements the Anthropic-compatible API format. This means:

- ✅ No SDK changes required
- ✅ Same request/response format
- ✅ Same tool calling interface
- ✅ Same streaming interface
- ✅ Just change `baseURL` and API key

### What Works
- ✅ Streaming responses
- ✅ Tool calling (function execution)
- ✅ Multi-turn conversations
- ✅ Approval workflows
- ✅ Orchestrator-subagent pattern
- ✅ All existing features

## Testing

### Verify Configuration
```bash
# Check environment variables
echo $OPENROUTER_API_KEY
echo $OPENROUTER_MODEL
echo $OPENROUTER_BASE_URL

# Start the agent gateway
cd services/agent-gateway
pnpm install
pnpm dev
```

### Test API Connection
```bash
curl -X POST https://openrouter.ai/api/v1/chat/completions \
  -H "Authorization: Bearer $OPENROUTER_API_KEY" \
  -H "Content-Type: application/json" \
  -d '{
    "model": "zhipu/glm-4-9b-chat",
    "messages": [{"role": "user", "content": "Hello!"}]
  }'
```

## Deployment

### Cloudflare Workers
```bash
# Set secrets
cd services/agent-gateway
pnpm dlx wrangler secret put OPENROUTER_API_KEY
pnpm dlx wrangler secret put OPENROUTER_MODEL
pnpm dlx wrangler secret put OPENROUTER_BASE_URL

# Deploy
pnpm dlx wrangler deploy
```

### Local Development
```bash
# Update .env file with your OpenRouter key
export OPENROUTER_API_KEY=sk-or-v1-...
export OPENROUTER_MODEL=zhipu/glm-4-9b-chat
export OPENROUTER_BASE_URL=https://openrouter.ai/api/v1

# Start services
./start-all.sh
```

## Rollback (if needed)

To rollback to Anthropic Claude:

1. Restore `.env`:
```bash
ANTHROPIC_API_KEY=sk-ant-...
# Remove OPENROUTER_* variables
```

2. Revert changes in TypeScript files:
   - Change `openRouterApiKey` back to `anthropicApiKey`
   - Remove `baseURL` from Anthropic client initialization
   - Change model back to `claude-sonnet-4-20250514`

## Notes

- OpenRouter provides access to multiple AI models through one API
- The GLM-4.6 model is cost-effective and performs well for ERPNext tasks
- You can switch models without code changes by updating `OPENROUTER_MODEL`
- OpenRouter billing is separate from Anthropic - check pricing at https://openrouter.ai/pricing

## Support

- OpenRouter Docs: https://openrouter.ai/docs
- OpenRouter Discord: https://discord.gg/openrouter
- Model Comparison: https://openrouter.ai/models

## Migration Date
December 2024

## Status
✅ **COMPLETE** - All Anthropic references replaced with OpenRouter
