- ✅ Storybook for all components
- ✅ E2E tests passing
- ✅ Accessibility compliant

---

## 🚀 Quick Start Guide

### Prerequisites

```bash
# Install dependencies
cd frontend/coagent
pnpm install

# Required environment variables
ANTHROPIC_API_KEY=sk-ant-xxx
OPENROUTER_API_KEY=sk-or-xxx
CONTEXT7_API_KEY=ctx7-xxx
ERPNEXT_API_URL=https://your-erpnext.com
```

### Development

```bash
# Start dev server
pnpm run dev

# Open Storybook
pnpm run storybook

# Run tests
pnpm test
pnpm test:e2e
```

### Build & Deploy

```bash
# Build for production
pnpm run build

# Deploy to Cloudflare Pages
pnpm dlx wrangler pages deploy out --project-name=erpnext-coagent-ui
```

---

## 📚 Key Files to Create

### Core Components

```
frontend/coagent/
├── app/
│   ├── (developer)/
│   │   ├── layout.tsx                    # T200: Split-pane layout
│   │   └── page.tsx                      # Main developer interface
│   └── api/
│       └── copilot/
│           └── developer/
│               └── route.ts              # T203: CopilotKit runtime
│
├── components/
│   ├── developer/
│   │   ├── variant-selector.tsx          # T208: Variant tabs
│   │   ├── refinement-input.tsx          # T209: Refinement interface
│   │   ├── deployment-panel.tsx          # T210: Deploy UI
│   │   └── streaming-text.tsx            # T211: Animations
│   │
│   └── preview/
│       ├── doctype-preview.tsx           # T205: DocType preview
│       ├── workflow-preview.tsx          # T206: Workflow diagram
│       └── code-preview.tsx              # T207: Syntax highlighting
│
├── lib/
│   ├── types/
│   │   └── artifact.ts                   # T201: Type definitions
│   │
│   ├── store/
│   │   └── artifact-store.ts             # T202: Zustand store
│   │
│   ├── generation/
│   │   └── variant-generator.ts          # T204: Variant generation
│   │
│   ├── mcp/
│   │   └── context7-client.ts            # T213: Context7 MCP
│   │
│   └── agent/
│       └── claude-agent.ts               # T214: Claude SDK
│
├── hooks/
│   └── use-keyboard-shortcuts.ts         # T212: Keyboard nav
│
└── __tests__/
    └── e2e/
        └── developer-flow.test.ts        # T215: E2E tests
```

---

## 🎨 Design System

### Colors (Tailwind Config)

```javascript
// tailwind.config.js
module.exports = {
  theme: {
    extend: {
      colors: {
        // v0-inspired palette
        primary: {
          50: '#f0f9ff',
          500: '#0ea5e9',
          900: '#0c4a6e',
        },
        success: '#10b981',
        warning: '#f59e0b',
        danger: '#ef4444',
      },
    },
  },
};
```

### Typography

```css
/* globals.css */
.artifact-title {
  @apply text-2xl font-bold tracking-tight;
}

.artifact-description {
  @apply text-sm text-muted-foreground;
}

.code-block {
  @apply font-mono text-sm bg-slate-950 text-slate-50 rounded-lg p-4;
}
```

### Animations

```javascript
// framer-motion variants
export const fadeInUp = {
  initial: { opacity: 0, y: 20 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -20 },
  transition: { duration: 0.3 }
};

export const slideIn = {
  initial: { x: -100, opacity: 0 },
  animate: { x: 0, opacity: 1 },
  transition: { type: 'spring', stiffness: 100 }
};
```

---

## 🧪 Testing Strategy

### Unit Tests (Vitest)

```typescript
// lib/generation/__tests__/variant-generator.test.ts
import { describe, it, expect } from 'vitest';
import { generateVariants } from '../variant-generator';

describe('Variant Generator', () => {
  it('should generate 3 variants', async () => {
    const analysis = {
      name: 'Hotel Reservation',
      description: 'Manage room bookings',
      primaryType: 'doctype'
    };

    const variants = await generateVariants(analysis);
    
    expect(variants).toHaveLength(3);
    expect(variants[0].variant).toBe(1);
    expect(variants[1].variant).toBe(2);
    expect(variants[2].variant).toBe(3);
  });

  it('should differentiate variant complexity', async () => {
    const variants = await generateVariants(mockAnalysis);
    
    const minimal = JSON.parse(variants[0].code);
    const advanced = JSON.parse(variants[2].code);
    
    expect(advanced.fields.length).toBeGreaterThan(minimal.fields.length);
  });
});
```

### Integration Tests

```typescript
// __tests__/integration/generation-flow.test.ts
import { describe, it, expect } from 'vitest';
import { POST } from '@/app/api/copilot/developer/route';

describe('Generation Flow', () => {
  it('should analyze requirements', async () => {
    const req = new Request('http://localhost/api/copilot/developer', {
      method: 'POST',
      body: JSON.stringify({
        action: 'analyze_requirements',
        description: 'Hotel booking system'
      })
    });

    const res = await POST(req);
    const data = await res.json();

    expect(data.components).toBeDefined();
    expect(data.workflows).toBeDefined();
  });
});
```

### E2E Tests (Playwright)

```typescript
// __tests__/e2e/complete-flow.test.ts
import { test, expect } from '@playwright/test';

test('complete v0 flow', async ({ page }) => {
  // 1. Navigate
  await page.goto('/developer');

  // 2. Generate
  await page.fill('[data-testid="chat-input"]', 'Create hotel reservation');
  await page.click('[data-testid="send-button"]');
  await page.waitForSelector('[data-testid="variants-ready"]');

  // 3. Select variant
  await page.click('[data-testid="variant-2"]');
  
  // 4. Preview
  await expect(page.locator('[data-testid="doctype-preview"]')).toBeVisible();
  
  // 5. Refine
  await page.fill('[data-testid="refinement-input"]', 'Add payment field');
  await page.click('[data-testid="refine-button"]');
  await page.waitForSelector('[data-testid="refinement-complete"]');

  // 6. Deploy
  await page.click('[data-testid="deploy-button"]');
  await expect(page.locator('[data-testid="deploy-success"]')).toBeVisible();
});
```

---

## 📖 Context7 MCP Usage Examples

### Fetching ERPNext Documentation

```typescript
import { context7 } from '@/lib/mcp/context7-client';

// During generation
const docs = await context7.fetchDocs([
  'erpnext-doctype-field-types',
  'erpnext-permission-rules',
  'frappe-naming-series'
]);

// Use in prompt
const prompt = `
Generate ERPNext DocType using these guidelines:
${docs.get('erpnext-doctype-field-types')}

User request: ${userInput}
`;
```

### Best Practices Query

```typescript
// Get industry-specific patterns
const hotelBestPractices = await context7.getERPNextBestPractices('hotel');

// Get framework examples
const copilotExamples = await context7.getCopilotKitExamples('streaming-actions');
```

---

## 🎯 Performance Optimization

### Code Splitting

```typescript
// app/(developer)/page.tsx
import dynamic from 'next/dynamic';

const DocTypePreview = dynamic(
  () => import('@/components/preview/doctype-preview'),
  { loading: () => <Skeleton /> }
);

const WorkflowPreview = dynamic(
  () => import('@/components/preview/workflow-preview'),
  { ssr: false }
);
```

### Caching Strategy

```typescript
// lib/cache/artifact-cache.ts
import { unstable_cache } from 'next/cache';

export const getCachedDocs = unstable_cache(
  async (query: string) => {
    return await context7.fetchDocs([query]);
  },
  ['context7-docs'],
  { revalidate: 3600 } // 1 hour
);
```

### Streaming Response

```typescript
// app/api/copilot/developer/route.ts
export async function POST(req: Request) {
  const stream = new TransformStream();
  const writer = stream.writable.getWriter();

  // Start generation
  generateVariants(input).then(async (variants) => {
    for (const variant of variants) {
      await writer.write(
        new TextEncoder().encode(JSON.stringify(variant) + '\n')
      );
    }
    await writer.close();
  });

  return new Response(stream.readable, {
    headers: { 'Content-Type': 'text/event-stream' }
  });
}
```

---

## 🔒 Security Considerations

### API Key Protection

```typescript
// Never expose API keys to client
// Use server-side API routes only

// ❌ Bad - Client-side
const response = await fetch('https://api.anthropic.com', {
  headers: { 'x-api-key': process.env.ANTHROPIC_API_KEY }
});

// ✅ Good - Server-side
// app/api/copilot/developer/route.ts
export async function POST(req: Request) {
  const client = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY // Server-side only
  });
  // ...
}
```

### Input Sanitization

```typescript
// lib/security/sanitize.ts
import DOMPurify from 'isomorphic-dompurify';

export function sanitizeUserInput(input: string): string {
  return DOMPurify.sanitize(input, {
    ALLOWED_TAGS: [], // Strip all HTML
    ALLOWED_ATTR: []
  });
}
```

### Rate Limiting

```typescript
// middleware.ts
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';

const ratelimit = new Ratelimit({
  redis: Redis.fromEnv(),
  limiter: Ratelimit.slidingWindow(10, '10 s'),
});

export async function middleware(req: NextRequest) {
  const ip = req.ip ?? '127.0.0.1';
  const { success } = await ratelimit.limit(ip);

  if (!success) {
    return new Response('Rate limit exceeded', { status: 429 });
  }

  return NextResponse.next();
}
```

---

## 📊 Monitoring & Analytics

### Error Tracking (Sentry)

```typescript
// sentry.client.config.ts
import * as Sentry from '@sentry/nextjs';

Sentry.init({
  dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
  tracesSampleRate: 1.0,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay()
  ],
});
```

### Analytics (Vercel Analytics)

```typescript
// app/layout.tsx
import { Analytics } from '@vercel/analytics/react';

export default function RootLayout({ children }) {
  return (
    <html>
      <body>
        {children}
        <Analytics />
      </body>
    </html>
  );
}
```

### Performance Monitoring

```typescript
// lib/monitoring/perf.ts
export function measureGeneration() {
  const start = performance.now();
  
  return {
    end: () => {
      const duration = performance.now() - start;
      console.log(`Generation took ${duration}ms`);
      
      // Send to analytics
      if (typeof window !== 'undefined') {
        window.gtag?.('event', 'generation_time', {
          value: duration
        });
      }
    }
  };
}
```

---

## 🐛 Common Issues & Solutions

### Issue 1: Variants not generating

**Problem**: `generateVariants()` returns empty array

**Solution**:
```typescript
// Check API key
console.log('API Key:', process.env.ANTHROPIC_API_KEY?.slice(0, 10));

// Check rate limits
// Check Context7 MCP connection

// Add error handling
try {
  const variants = await generateVariants(analysis);
} catch (error) {
  console.error('Generation failed:', error);
  // Show user-friendly message
}
```

### Issue 2: Preview not rendering

**Problem**: DocType preview shows blank

**Solution**:
```typescript
// Validate artifact structure
const artifact = validateArtifact(data);

// Check JSON parsing
try {
  const docType = JSON.parse(artifact.code);
} catch (e) {
  console.error('Invalid JSON:', e);
}

// Add loading state
{isLoading ? <Skeleton /> : <DocTypePreview />}
```

### Issue 3: Deployment fails

**Problem**: ERPNext API returns 403

**Solution**:
```typescript
// Check API credentials
// Verify ERPNext URL is correct
// Check user permissions in ERPNext
// Add better error messages

if (response.status === 403) {
  throw new Error('Permission denied. Check ERPNext API credentials.');
}
```

---

## 📚 Learning Resources

### CopilotKit Documentation
- Actions: https://docs.copilotkit.ai/concepts/actions
- Runtime: https://docs.copilotkit.ai/concepts/runtime
- Streaming: https://docs.copilotkit.ai/concepts/streaming

### Claude Agent SDK
- Tool Use: https://docs.anthropic.com/claude/docs/tool-use
- Streaming: https://docs.anthropic.com/claude/docs/streaming
- Best Practices: https://docs.anthropic.com/claude/docs/prompt-engineering

### ERPNext Development
- DocType: https://frappeframework.com/docs/user/en/guides/basics/doctypes
- Workflows: https://frappeframework.com/docs/user/en/guides/basics/workflows
- Permissions: https://frappeframework.com/docs/user/en/guides/basics/users-and-permissions

---

## 🎓 Next Steps After Phase 7

1. **Phase 8**: Multi-industry support
   - Hotel-specific components
   - Hospital-specific workflows
   - Manufacturing templates

2. **Phase 9**: Advanced features
   - Batch generation (multiple DocTypes)
   - Workflow diagram editor
   - Custom field type builder

3. **Phase 10**: Production hardening
   - Performance optimization (< 2s generation)
   - Error recovery
   - Offline support

---

## ✅ Definition of Done

Phase 7 is complete when:

- [ ] All 17 tasks (T200-T216) implemented
- [ ] UI matches Claude Sonnet 4.5 demo quality
- [ ] 3-variant generation working (< 8s)
- [ ] Live previews rendering correctly
- [ ] Refinement functional
- [ ] Deployment with approval gates working
- [ ] E2E tests passing (>80% coverage)
- [ ] Storybook published
- [ ] Documentation complete
- [ ] Deployed to Cloudflare Pages
- [ ] Performance targets met:
  - First variant: < 3s
  - Preview render: < 100ms
  - Refinement: < 2s
  - 60fps animations

---

**Estimated Total Time**: 4-6 hours focused development

**Recommended Approach**: 
1. Use Context7 MCP for all documentation queries
2. Follow code examples exactly
3. Test each component in Storybook first
4. Run E2E tests after each phase
5. Deploy incrementally

**Tools Needed**:
- Claude Desktop (with Context7 MCP enabled)
- VS Code with Copilot
- Browser DevTools
- Storybook
- Playwright

---

**Ready to build the best ERPNext developer experience!** 🚀
