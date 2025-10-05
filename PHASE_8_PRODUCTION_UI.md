# Phase 8: Production-Ready Developer UI

**Goal**: Build a professional-grade developer interface inspired by modern AI chat applications, fully integrated with CopilotKit and Claude Agent SDK.

**Status**: Planning Phase  
**Priority**: HIGH  
**Estimated Time**: 15-20 hours

---

## 🎯 Objectives

Create a **Vercel AI Chatbot-quality** developer experience with:
- ✅ Beautiful, polished UI with smooth animations
- ✅ Real-time streaming responses
- ✅ Multi-chat session management
- ✅ Code artifact generation and preview
- ✅ Export/share functionality
- ✅ Keyboard shortcuts
- ✅ Mobile responsive
- ✅ Dark/light mode
- ✅ Authentication with session persistence

**Key Difference**: Use CopilotKit + Claude Agent SDK (not Vercel AI SDK)

---

## 📋 Task Breakdown (22 Tasks)

### Phase 8.1: Core Chat Experience (5 tasks)

#### T217: Modern Chat Layout
**File**: `app/(chat)/layout.tsx`
**Description**: Full-height chat layout with sidebar and main content
- Sidebar: Chat history, new chat button, settings
- Main: Chat messages + input area
- Header: Model selector, share, clear
- Mobile: Collapsible sidebar
**Estimated**: 2 hours

#### T218: Streaming Message Component
**File**: `components/chat/message-stream.tsx`
**Description**: Real-time streaming message display
- Typewriter effect for AI responses
- Markdown rendering (code blocks, lists, tables)
- Message actions (copy, regenerate, edit)
- Loading states with skeleton
**Dependencies**: react-markdown, remark-gfm
**Estimated**: 2 hours

#### T219: Chat Input with Attachments
**File**: `components/chat/chat-input.tsx`
**Description**: Rich input experience
- Auto-resize textarea
- File upload (JSON, screenshots)
- Slash commands (/doctype, /workflow, /report)
- Keyboard shortcuts (Cmd+Enter to send)
- Character counter
**Estimated**: 2 hours

#### T220: Message History & Scroll
**File**: `components/chat/message-list.tsx`
**Description**: Optimized message rendering
- Virtual scrolling for performance
- Auto-scroll to bottom
- "New messages" indicator
- Scroll-to-top button
**Dependencies**: react-window or similar
**Estimated**: 1.5 hours

#### T221: CopilotKit Integration Layer
**File**: `lib/copilot/chat-runtime.ts`
**Description**: Connect CopilotKit to our backend
- useCopilotChat hook wrapper
- Custom message handling
- Action execution bridge
- Error handling and retries
**Estimated**: 2 hours

---

### Phase 8.2: Session Management (4 tasks)

#### T222: Chat History Sidebar
**File**: `components/sidebar/chat-history.tsx`
**Description**: List of previous conversations
- Group by date (Today, Yesterday, Last 7 days)
- Search conversations
- Pin important chats
- Delete conversations
- Rename conversations
**Estimated**: 2 hours

#### T223: Session State Management
**File**: `lib/store/chat-store.ts`
**Description**: Zustand store for chat state
- Active session
- Message history per session
- Draft messages (persist across refreshes)
- Settings (model, temperature)
**Dependencies**: zustand, zustand-persist
**Estimated**: 1.5 hours

#### T224: Local Session Persistence
**File**: `lib/storage/chat-storage.ts`
**Description**: Persist chat history on device
- IndexedDB-based storage via `idb`
- Serialize messages and artifacts per session
- Migrate legacy localStorage data
- Automatic cleanup of stale sessions
**Estimated**: 2 hours

#### T225: Import/Export Sessions
**Files**: `components/sidebar/session-actions.tsx`
**Description**: Manage session backups
- Export chat + artifacts as JSON
- Import sessions from file
- Share link generation using data blobs
- Clear all data action with confirmation
**Estimated**: 2 hours

---

### Phase 8.3: Artifact System (4 tasks)

#### T226: Enhanced Artifact Types
**File**: `lib/types/artifacts.ts`
**Description**: Extended artifact definitions
- Add metadata (language, version, dependencies)
- Add validation rules
- Add export formats (JSON, Python, TypeScript)
- Add preview modes (code, rendered, diff)
**Estimated**: 1 hour

#### T227: Advanced Code Preview
**File**: `components/artifacts/code-preview-advanced.tsx`
**Description**: Enhanced read-only preview
- Tabs for JSON/Python/TypeScript outputs
- Copy + download + prettify actions
- Inline diff view using `diff-match-patch`
- Adjustable font size and wrap controls
**Estimated**: 3 hours

#### T228: Artifact Actions Panel
**File**: `components/artifacts/actions-panel.tsx`
**Description**: Action buttons for artifacts
- Copy code
- Download file
- Export to ERPNext
- Deploy to environment
- Share link
- Version history
**Estimated**: 1.5 hours

#### T229: Artifact Preview Enhancements
**Files**: `components/artifacts/enhanced-*.tsx`
**Description**: Improve preview components
- Interactive DocType forms with validation
- Live workflow diagram editing
- Code playground (run snippets)
- Responsive design
**Estimated**: 3 hours

---

### Phase 8.4: Claude Agent SDK Integration (3 tasks)

#### T230: Agent Configuration
**File**: `lib/agent/config.ts`
**Description**: Claude Agent SDK setup
- Model selection (Claude 3.5 Sonnet, Opus)
- System prompts for ERPNext
- Tool definitions
- Streaming configuration
**Dependencies**: @anthropic-ai/sdk
**Estimated**: 1.5 hours

#### T231: Agent Actions (Tools)
**File**: `lib/agent/tools/`
**Description**: Define Claude tools
- analyze_requirements
- generate_variants (DocType/Workflow/Report)
- refine_artifact
- validate_erpnext_schema
- deploy_to_instance
- search_erpnext_docs (Context7 MCP)
**Estimated**: 3 hours

#### T232: Streaming Response Handler
**File**: `lib/agent/stream-handler.ts`
**Description**: Handle Claude streaming
- Parse SSE events
- Extract tool calls
- Update UI in real-time
- Handle errors gracefully
**Estimated**: 2 hours

---

### Phase 8.5: UI Polish & UX (3 tasks)

#### T233: Theme System
**Files**: `lib/theme.ts`, `app/globals.css`
**Description**: Dark/light mode
- System preference detection
- Theme toggle button
- Persist preference
- Smooth transitions
- Tailwind dark: classes
**Estimated**: 1.5 hours

#### T234: Animations & Transitions
**File**: `lib/animations.ts`
**Description**: Framer Motion animations
- Message slide-in
- Artifact fade-in
- Sidebar expand/collapse
- Loading spinners
- Skeleton screens
**Dependencies**: framer-motion
**Estimated**: 2 hours

#### T235: Empty States & Onboarding
**Files**: `components/empty-states/*.tsx`
**Description**: Helpful empty states
- No chats yet (show examples)
- No artifacts yet (how to generate)
- Error states (retry actions)
- Welcome tour (first visit)
**Estimated**: 1.5 hours

---

### Phase 8.6: Authentication & Security (2 tasks)

#### T236: Auth.js Integration
**Files**: `app/api/auth/[...nextauth]/route.ts`
**Description**: User authentication
- GitHub OAuth
- Email/password
- Session management
- Protected routes
**Dependencies**: next-auth
**Estimated**: 2 hours

#### T237: User Settings
**File**: `components/settings/user-settings.tsx`
**Description**: User preferences
- API keys management (ERPNext, OpenRouter)
- Default model selection
- Export settings
- Account deletion
**Estimated**: 1.5 hours

---

### Phase 8.7: Testing & Deployment (1 task)

#### T238: E2E Test Suite
**File**: `__tests__/e2e/chat-flow.spec.ts`
**Description**: Complete user flow tests
- Create new chat
- Generate DocType with 3 variants
- Select variant
- Refine artifact
- Export to ERPNext
- Delete chat
**Dependencies**: Playwright
**Estimated**: 2 hours

---

## 🎨 UI Design Principles

### Color Palette
```css
/* Light Mode */
--background: 0 0% 100%;
--foreground: 222.2 84% 4.9%;
--primary: 221.2 83.2% 53.3%;
--secondary: 210 40% 96.1%;
--accent: 210 40% 96.1%;
--border: 214.3 31.8% 91.4%;

/* Dark Mode */
--background: 222.2 84% 4.9%;
--foreground: 210 40% 98%;
--primary: 217.2 91.2% 59.8%;
--secondary: 217.2 32.6% 17.5%;
--accent: 217.2 32.6% 17.5%;
--border: 217.2 32.6% 17.5%;
```

### Typography
- Headings: `font-family: 'Geist', sans-serif`
- Body: `font-family: 'Inter', sans-serif`
- Code: `font-family: 'JetBrains Mono', monospace`

### Spacing
- Base: 4px grid
- Chat padding: 24px
- Message gap: 16px
- Sidebar width: 280px

---

## 📦 New Dependencies

```json
{
  "dependencies": {
    "@anthropic-ai/sdk": "^0.28.0",
    "idb": "^8.0.0",
    "next-auth": "^5.0.0-beta.24",
    "react-markdown": "^9.0.1",
    "remark-gfm": "^4.0.0",
    "react-syntax-highlighter": "^15.6.6",
    "react-window": "^1.8.10",
    "zustand": "^4.5.7"
  }
}
```

---

## 🔄 Integration Points

### CopilotKit Bridge
```typescript
// lib/copilot/actions.ts
export const copilotActions = [
  {
    name: 'generate_erpnext_artifact',
    handler: async ({ type, requirements }) => {
      // Call Claude Agent SDK
      const response = await claudeAgent.generate({
        type,
        requirements,
        streaming: true
      });
      return response;
    }
  }
];
```

### Claude Agent SDK
```typescript
// lib/agent/client.ts
import Anthropic from '@anthropic-ai/sdk';

export const claudeAgent = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY
});

export async function generateArtifact(prompt: string) {
  const stream = await claudeAgent.messages.stream({
    model: 'claude-3-5-sonnet-20241022',
    max_tokens: 8000,
    messages: [{ role: 'user', content: prompt }],
    tools: erpnextTools,
  });
  
  return stream;
}
```

---

## 🎯 Success Criteria

- [ ] **Performance**: First Contentful Paint < 1.5s
- [ ] **Responsiveness**: Works on mobile (375px+)
- [ ] **Accessibility**: WCAG 2.1 AA compliant
- [ ] **SEO**: Meta tags, sitemap, robots.txt
- [ ] **Streaming**: Real-time message display
- [ ] **Persistence**: Chat history survives refresh
- [ ] **Error Handling**: Graceful degradation
- [ ] **Tests**: 80%+ coverage

---

## 📚 Implementation Order

### Week 1: Core Experience (T217-T221)
- Day 1-2: Layout + Streaming messages
- Day 3: Chat input
- Day 4: Message history
- Day 5: CopilotKit integration

### Week 2: Sessions & Artifacts (T222-T229)
- Day 1-2: Chat history + persistence
- Day 3: Local storage + import/export
- Day 4-5: Artifact system enhancements

### Week 3: Claude SDK + Polish (T230-T238)
- Day 1-2: Claude Agent SDK integration
- Day 3: Theme + animations
- Day 4: Auth + settings
- Day 5: Testing + deployment

---

## 🚀 Quick Start After Planning

```bash
# Install new dependencies
cd frontend/coagent
pnpm add @anthropic-ai/sdk react-markdown remark-gfm react-window diff-match-patch idb next-auth@beta

# Start development
pnpm dev
```

---

**Next Step**: Review this plan and approve to begin implementation with T217!
