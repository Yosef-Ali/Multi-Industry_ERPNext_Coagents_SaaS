# T146: Cloudflare Workers AI Models

## Overview
Cloudflare Workers AI provides access to several free-tier AI models that can run directly in your Workers. This is a **cost-effective alternative to OpenRouter** when API costs are a concern.

## Available Models (Free Tier)

### Text Generation Models

#### 1. **Llama 3.1 8B Instruct** (Recommended)
- **Model ID**: `@cf/meta/llama-3.1-8b-instruct`
- **Context Window**: 8,192 tokens
- **Cost**: FREE 🎉
- **Best For**: General-purpose chat, instruction following, ERPNext queries
- **Pros**: 
  - Latest Llama model with improved instruction following
  - Good balance of speed and quality
  - Works well for business applications
- **Cons**:
  - No native function calling (we use text-based workaround)
  - Smaller context than premium models

#### 2. **Llama 3 8B Instruct**
- **Model ID**: `@cf/meta/llama-3-8b-instruct`
- **Context Window**: 8,192 tokens
- **Cost**: FREE
- **Best For**: Similar to 3.1 but slightly older
- **Note**: Prefer Llama 3.1 unless you need this specific version

#### 3. **Mistral 7B Instruct**
- **Model ID**: `@cf/mistral/mistral-7b-instruct-v0.1`
- **Context Window**: 8,192 tokens
- **Cost**: FREE
- **Best For**: Fast responses, lower latency
- **Pros**:
  - Very fast inference
  - Good for simple queries
- **Cons**:
  - Slightly less capable than Llama 3.1 for complex tasks

#### 4. **Qwen 1.5 14B Chat**
- **Model ID**: `@cf/qwen/qwen1.5-14b-chat-awq`
- **Context Window**: 8,192 tokens
- **Cost**: FREE
- **Best For**: Multilingual support, larger model capacity
- **Pros**:
  - 14B parameters (more capable than 7-8B models)
  - Good multilingual support
- **Cons**:
  - Slower inference due to larger size

## Configuration

### Environment Variables

```bash
# wrangler.toml
[ai]
binding = "AI"

[vars]
AI_PROVIDER = "cloudflare"  # or "auto" to enable fallback
CLOUDFLARE_MODEL = "@cf/meta/llama-3.1-8b-instruct"  # optional, this is default
PREFER_FREE_TIER = "true"  # optional, prefer Cloudflare over OpenRouter
```

### Automatic Provider Selection

The system will automatically select the best provider based on:

1. **Explicit selection** (`AI_PROVIDER=cloudflare`)
2. **Free tier preference** (`PREFER_FREE_TIER=true` + AI binding available)
3. **Model match** (if model ID starts with `@cf/`)
4. **Fallback** (Cloudflare if no OpenRouter API key)

## Cost Comparison

### Cloudflare Workers AI (Free Tier)
- **Input**: $0.00 per 1K tokens
- **Output**: $0.00 per 1K tokens
- **Monthly Limit**: 10,000 Neurons (roughly 10M tokens)
- **Overage**: First 1B tokens free, then pay-as-you-go

### OpenRouter (Premium)
- **Mistral 7B**: $0.0002 per 1K tokens
- **GPT-3.5 Turbo**: $0.0015 per 1K tokens
- **Claude 3.5 Sonnet**: $0.003 per 1K tokens (input), $0.015 (output)

**Example Savings:**
- 1M tokens per month with Mistral 7B on OpenRouter: **$200**
- 1M tokens per month with Llama 3.1 8B on Cloudflare: **$0**

## Limitations

### Function Calling
Cloudflare Workers AI models **do not support native function calling** (like Anthropic's tool use).

**Our Workaround:**
- We include tool definitions in the system prompt
- Model returns JSON-formatted tool calls
- We parse and execute them manually

**Impact:**
- Slightly less reliable than native function calling
- May require more explicit prompting
- Still works well for most ERPNext operations

### Context Window
- **Cloudflare**: 8,192 tokens max
- **OpenRouter Premium**: Up to 200,000 tokens (Claude 3.5)

**Recommendation:**
- Use Cloudflare for **short to medium conversations**
- Use OpenRouter for **long documents or complex multi-turn conversations**

## When to Use Each Provider

### Use Cloudflare Workers AI When:
- ✅ Cost is a primary concern
- ✅ Conversations are short to medium length
- ✅ You need basic ERPNext operations (search, create, update)
- ✅ Development/testing environment
- ✅ Predictable monthly volumes under 10M tokens

### Use OpenRouter When:
- ✅ Need highest quality responses
- ✅ Long documents or conversations (>8K tokens)
- ✅ Complex multi-step reasoning required
- ✅ Production environment with paying customers
- ✅ Native function calling important

### Use Auto Selection When:
- ✅ Want automatic fallback (OpenRouter → Cloudflare if API key missing)
- ✅ Want to optimize costs automatically
- ✅ Different environments (dev uses free, prod uses premium)

## Usage Examples

### TypeScript (Worker)
```typescript
import { getGlobalProvider } from './ai';
import { getAIBinding } from './types/cloudflare-utils';

// In your fetch handler
export default {
  async fetch(request: Request, env: CloudflareEnv) {
    // Get provider (will auto-select Cloudflare if AI binding available)
    const provider = await getGlobalProvider(env.AI);
    
    console.log(`Using: ${provider.name} (${provider.model})`);
    
    // Use provider
    const response = await provider.complete(messages, {
      tools: erpTools,
      system: systemPrompt,
    });
    
    return new Response(JSON.stringify(response));
  }
};
```

### Configuration Example
```bash
# Development: Use free tier
AI_PROVIDER=cloudflare
CLOUDFLARE_MODEL=@cf/meta/llama-3.1-8b-instruct

# Production: Use premium with fallback
AI_PROVIDER=auto
OPENROUTER_API_KEY=sk-or-v1-...
OPENROUTER_MODEL=mistralai/mistral-7b-instruct
PREFER_FREE_TIER=false  # Use OpenRouter unless it fails
```

## Testing

To test Cloudflare AI integration locally:

```bash
# Start local Workers dev server
pnpm dlx wrangler dev

# Test with curl
curl http://localhost:8787/api/chat \
  -H "Content-Type: application/json" \
  -d '{
    "message": "List all customers",
    "session_id": "test-session"
  }'
```

## Monitoring

The provider factory automatically logs:
- Selected provider and model
- Pricing information
- Whether using free tier

```
[ProviderFactory] Creating cloudflare provider
[ProviderFactory] ✅ Cloudflare Workers AI configuration valid
[ProviderFactory] Model: @cf/meta/llama-3.1-8b-instruct | Cost: $0/1K input, $0/1K output
[ProviderFactory] 🎉 Using FREE tier!
```

## Migration Path

### From OpenRouter to Cloudflare (Cost Savings)
1. Add AI binding to `wrangler.toml`
2. Set `AI_PROVIDER=cloudflare` or `PREFER_FREE_TIER=true`
3. Deploy and test
4. Monitor quality/latency
5. Adjust based on requirements

### From Cloudflare to OpenRouter (Quality/Features)
1. Obtain OpenRouter API key
2. Set `OPENROUTER_API_KEY` in secrets
3. Set `AI_PROVIDER=openrouter`
4. Deploy

### Hybrid Approach (Best of Both)
1. Keep both configured
2. Set `AI_PROVIDER=auto`
3. Use `PREFER_FREE_TIER=true` in dev/staging
4. Use `PREFER_FREE_TIER=false` in production

## Roadmap

- [ ] Add support for Cloudflare Workers AI function calling (when available)
- [ ] Implement automatic provider selection based on conversation length
- [ ] Add cost tracking per session
- [ ] Add automatic failover from Cloudflare to OpenRouter on errors
- [ ] Support for other Cloudflare AI models (embeddings, image generation)

## References

- [Cloudflare Workers AI Docs](https://developers.cloudflare.com/workers-ai/)
- [Available Models](https://developers.cloudflare.com/workers-ai/models/)
- [Pricing](https://developers.cloudflare.com/workers-ai/platform/pricing/)
- [Rate Limits](https://developers.cloudflare.com/workers-ai/platform/limits/)
