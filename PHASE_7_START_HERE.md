# 🚀 START HERE - Phase 7 Implementation

**Goal**: Build v0-style ERPNext developer frontend (4-6 hours)

---

## ✅ What's Done

- ✅ Agent Gateway deployed to Cloudflare
- ✅ OpenRouter API connected
- ✅ Backend tools working
- ✅ Basic frontend deployed (needs upgrade)

---

## 🎯 What to Build Now

Transform basic chatbot → v0.dev-style app generator

**Before**: Simple chat interface  
**After**: Professional 3-variant generation with live previews

---

## 📋 Implementation Order

### Phase 1: Setup (30 min)
```bash
cd frontend/coagent

# Install new dependencies
pnpm add zustand immer framer-motion react-syntax-highlighter mermaid
pnpm add -D @playwright/test @storybook/react

# Setup environment
cp .env.example .env.local
# Add: ANTHROPIC_API_KEY, CONTEXT7_API_KEY
```

### Phase 2: Core Architecture (1 hour)
1. Create split-pane layout (`app/(developer)/layout.tsx`)
2. Define artifact types (`lib/types/artifact.ts`)
3. Setup Zustand store (`lib/store/artifact-store.ts`)

### Phase 3: Generation Engine (1.5 hours)
1. Build CopilotKit runtime (`app/api/copilot/developer/route.ts`)
2. Implement 3-variant generator (`lib/generation/variant-generator.ts`)
3. Connect Claude Agent SDK (`lib/agent/claude-agent.ts`)

### Phase 4: Preview System (1.5 hours)
1. DocType preview component (`components/preview/doctype-preview.tsx`)
2. Workflow diagram (`components/preview/workflow-preview.tsx`)
3. Code highlighting (`components/preview/code-preview.tsx`)

### Phase 5: Refinement & Deploy (1 hour)
1. Variant selector tabs (`components/developer/variant-selector.tsx`)
2. Refinement input (`components/developer/refinement-input.tsx`)
3. Deployment panel (`components/developer/deployment-panel.tsx`)

### Phase 6: Polish (30 min)
1. Streaming animations (`components/developer/streaming-text.tsx`)
2. Keyboard shortcuts (`hooks/use-keyboard-shortcuts.ts`)
3. Context7 MCP integration (`lib/mcp/context7-client.ts`)

---

## 🔧 Using Context7 MCP

When building, query Context7 for docs:

```typescript
// Example: Need CopilotKit action syntax
const docs = await context7.fetchDocs([
  'copilotkit-actions-api',
  'copilotkit-streaming-responses'
]);

// Example: Need ERPNext DocType structure
const docs = await context7.fetchDocs([
  'erpnext-doctype-json-schema',
  'frappe-field-types'
]);
```

**Available in**: Claude Desktop with Context7 MCP enabled

---

## 📖 Code Examples

All code is in: `PHASE_7_V0_STYLE_FRONTEND.md`

Each task (T200-T216) has:
- Complete TypeScript code
- Best practices notes
- MCP query suggestions
- Testing examples

---

## 🧪 Testing as You Go

```bash
# Run unit tests
pnpm test

# Run E2E tests
pnpm test:e2e

# Open Storybook
pnpm run storybook
```

---

## 🚀 Deploy When Ready

```bash
# Build
pnpm run build

# Deploy
pnpm dlx wrangler pages deploy out --project-name=erpnext-coagent-ui

# Verify
curl https://erpnext-coagent-ui.pages.dev
```

---

## 💡 Pro Tips

1. **Build in Storybook first** - Test components isolated
2. **Use Context7 MCP heavily** - Real-time docs are gold
3. **Test each phase** - Don't wait until end
4. **Follow the patterns** - Code examples are production-ready
5. **Deploy incrementally** - Deploy after each phase

---

## 📊 Progress Tracking

Mark tasks complete in: `specs/001-erpnext-coagents-mvp/tasks.md`

```markdown
## Phase 7: v0-Style Frontend

- [x] T200: Split-pane layout
- [x] T201: Artifact types
- [ ] T202: Zustand store
...
```

---

## 🆘 Need Help?

1. Check `PHASE_7_V0_STYLE_FRONTEND.md` - Full guide
2. Use Context7 MCP for framework docs
3. Ask Claude for clarification
4. Run tests to verify

---

## ✅ Definition of Done

Phase 7 complete when:
- All 17 tasks done (T200-T216)
- E2E tests passing
- Deployed to Cloudflare
- UI matches v0.dev quality

---

**Time Budget**: 4-6 hours focused work

**Recommended**: Do it in one session for best context retention

**Next**: Open `PHASE_7_V0_STYLE_FRONTEND.md` and start with T200!

🚀 Let's build something amazing!
