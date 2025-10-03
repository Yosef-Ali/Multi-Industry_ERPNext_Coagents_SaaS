# ERPNext CoAgents - Task Tracker

## Current Sprint: Phase 4 - Universal AI Provider System

### Active Tasks

#### T145: Create Universal AI Provider System ⏳ IN PROGRESS
**Priority:** HIGH | **Estimate:** 4-6 hours | **Status:** Starting
**Files:**
- `services/agent-gateway/src/ai/universal-provider.ts` (new)
- `services/agent-gateway/src/ai/types.ts` (new)
- `services/agent-gateway/src/ai/providers/openrouter.ts` (new)
- `services/agent-gateway/src/ai/providers/cloudflare.ts` (new)

**Description:**
Create a universal AI provider abstraction layer that supports multiple AI backends:
- OpenRouter (premium tier - currently working)
- Cloudflare Workers AI (free tier - new)
- Extensible for future providers (OpenAI, Anthropic, etc.)

**Adjustments Made:**
- Keep OpenRouter as default/premium option (already working)
- Add Cloudflare Workers AI as optional free tier
- Design for easy provider switching via environment variables
- Ensure backward compatibility with existing OpenRouter setup

**Acceptance Criteria:**
- [ ] Universal provider interface defined
- [ ] OpenRouter provider implementation (migrate existing code)
- [ ] Cloudflare Workers AI provider implementation
- [ ] Provider factory with auto-selection based on config
- [ ] Type-safe provider responses
- [ ] Error handling for provider failures
- [ ] Unit tests for each provider

**Technical Notes:**
- Use strategy pattern for provider selection
- Abstract model names (map logical names to provider-specific IDs)
- Handle streaming responses uniformly across providers
- Consider rate limiting and fallback strategies

---

#### T146: Add Cloudflare Workers AI Binding 📋 READY
**Priority:** HIGH | **Estimate:** 2-3 hours | **Status:** Blocked by T145
**Files:**
- `services/agent-gateway/wrangler.toml` (update)
- `services/agent-gateway/src/types/cloudflare.d.ts` (new)

**Description:**
Configure Cloudflare Workers AI binding for free tier model access.

**Implementation Steps:**
1. Add AI binding to wrangler.toml
2. Create TypeScript definitions for Workers AI types
3. Configure environment bindings
4. Add model catalog (llama-3.1-8b-instruct, etc.)

**Acceptance Criteria:**
- [ ] Workers AI binding configured in wrangler.toml
- [ ] TypeScript types for AI binding
- [ ] Environment variable mapping
- [ ] Documentation of available free tier models

---

#### T147: Refactor Environment Configuration 📋 READY
**Priority:** MEDIUM | **Estimate:** 2-3 hours | **Status:** Blocked by T145, T146
**Files:**
- `services/agent-gateway/src/config/environment.ts` (update)
- `services/agent-gateway/src/config/ai-config.ts` (new)
- `.env.example` (update)

**Description:**
Centralize AI provider configuration with environment-based selection.

**Configuration Schema:**
```typescript
AI_PROVIDER=openrouter|cloudflare|auto
OPENROUTER_API_KEY=sk-or-v1-...
CLOUDFLARE_AI_ENABLED=true|false
```

**Acceptance Criteria:**
- [ ] AI provider selection via environment variable
- [ ] Validation of required credentials per provider
- [ ] Default fallback strategy (OpenRouter → Cloudflare)
- [ ] Configuration documentation

---

### Backlog: Phase 5 - v0-Style Developer Co-Agent

#### T148: Implement Co-Agent Mode System 📋 READY
**Priority:** HIGH | **Estimate:** 6-8 hours | **Status:** Not Started
**Files:**
- `services/agent-gateway/src/coagents/modes.ts` (new)
- `services/agent-gateway/src/coagents/base.ts` (new)

**Description:**
Create mode system for different co-agent behaviors (chat, developer, analyzer).

**Modes:**
- **Chat Mode:** Simple Q&A (current behavior)
- **Developer Mode:** Generate 3 variants with artifacts
- **Analyzer Mode:** Code review and suggestions

---

#### T149: Create Developer Co-Agent 📋 READY
**Priority:** HIGH | **Estimate:** 8-10 hours | **Status:** Not Started
**Files:**
- `services/agent-gateway/src/coagents/developer.ts` (new)
- `services/agent-gateway/src/coagents/prompts/developer.ts` (new)

**Description:**
Implement v0.dev-style developer co-agent that generates 3 variants for each request.

**Features:**
- Generate 3 different implementation approaches
- Return structured artifacts (components, configs, workflows)
- Support iterative refinement
- Maintain conversation context

---

#### T150: Build Artifact Generation System 📋 READY
**Priority:** HIGH | **Estimate:** 6-8 hours | **Status:** Not Started
**Files:**
- `services/agent-gateway/src/artifacts/generator.ts` (new)
- `services/agent-gateway/src/artifacts/types.ts` (new)
- `services/agent-gateway/src/artifacts/templates/` (new directory)

**Description:**
Create system for generating structured artifacts (React components, workflows, configs).

**Artifact Types:**
- React components (.tsx)
- DocType configurations (.json)
- Workflow definitions (.yaml)
- API integrations (.ts)

---

#### T151: Implement Preview Rendering 📋 READY
**Priority:** MEDIUM | **Estimate:** 6-8 hours | **Status:** Not Started
**Files:**
- `services/agent-gateway/src/artifacts/preview.ts` (new)
- `services/agent-gateway/src/artifacts/renderers/` (new directory)

**Description:**
Create preview generation for artifacts (syntax highlighted code, live previews).

---

### Backlog: Phase 6 - UI/UX Improvements

#### T152: Create Split-Pane Developer Interface 📋 READY
**Priority:** HIGH | **Estimate:** 8-10 hours | **Status:** Not Started
**Files:**
- `frontend/coagent/src/components/DeveloperInterface.tsx` (new)
- `frontend/coagent/src/hooks/useSplitPane.ts` (new)

**Description:**
Build split-pane interface (40% chat, 60% artifact preview).

---

#### T153: Build Artifact Display Component 📋 READY
**Priority:** HIGH | **Estimate:** 6-8 hours | **Status:** Not Started
**Files:**
- `frontend/coagent/src/components/ArtifactViewer.tsx` (new)
- `frontend/coagent/src/components/ArtifactCard.tsx` (new)

**Description:**
Create artifact viewer with tabs for 3 variants, syntax highlighting, and copy/download.

---

#### T154: Implement Streaming Animations 📋 READY
**Priority:** MEDIUM | **Estimate:** 4-6 hours | **Status:** Not Started
**Files:**
- `frontend/coagent/src/components/StreamingText.tsx` (new)
- `frontend/coagent/src/animations/typing.ts` (new)

**Description:**
Add polished streaming text animations and loading states.

---

#### T155: Create ERPNext Preview Component 📋 READY
**Priority:** MEDIUM | **Estimate:** 6-8 hours | **Status:** Not Started
**Files:**
- `frontend/coagent/src/components/ERPNextPreview.tsx` (new)
- `frontend/coagent/src/preview/doctype-renderer.tsx` (new)

**Description:**
Create preview renderer for ERPNext artifacts (DocTypes, workflows).

---

## Completed Tasks

### ✅ Deployment & Infrastructure
- Chrome DevTools MCP setup (v0.6.0)
- Cloudflare Workers deployment
- OpenNext adapter migration (@opennextjs/cloudflare v1.9.1)
- Next.js upgrade to v15.5.2
- OpenRouter integration (mistralai/mistral-7b-instruct)
- OpenAI SDK Cloudflare Workers compatibility fix

### ✅ Backend Integration (Other Agent)
- Workflow service client (workflow-client.ts)
- ERPNext CopilotKit actions (ERPNextActions.tsx)
- Docker deployment configuration

---

## Sprint Summary

**Phase 4 Focus:** Universal AI Provider System
- **Timeline:** 2-3 days (8-12 hours)
- **Priority:** Start with T145 (core abstraction)
- **Strategy:** Keep OpenRouter working, add Cloudflare as optional enhancement

**Phase 5 Preview:** v0-Style Developer Co-Agent
- **Timeline:** 4-5 days (26-34 hours)
- **Biggest UX Impact:** Generate 3 variants, artifacts, iterative refinement

**Phase 6 Preview:** UI/UX Polish
- **Timeline:** 2-3 days (24-30 hours)
- **Visual Impact:** Split-pane layout, artifact preview, animations

---

## Decision Log

### 2025-10-03: Phase 4 Prioritization
**Decision:** Start with Universal AI Provider System (T145-T147)
**Rationale:**
- Foundation for future enhancements
- Enables optional free tier without breaking existing OpenRouter setup
- Relatively quick win (2-3 days)
- Doesn't require major UI changes

**Deferred:**
- Phase 5 (v0-workflow): Requires more planning, bigger UX shift
- Phase 6 (UI polish): Can be done incrementally after Phase 5
- Backend integration testing: Will test after T145 implementation

---

## Notes

**Current System State:**
- ✅ Live deployment: https://erpnext-coagent-ui.dev-yosefali.workers.dev
- ✅ OpenRouter working: mistralai/mistral-7b-instruct (~$0.0002/1K tokens)
- ✅ Valid API key: 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
- ✅ Branch: feature/frontend-copilotkit-integration
- ✅ Latest commit: c50aa89 (backend integration from other agent)

**Technical Debt:**
- GitHub Actions secrets not configured yet
- Backend integration (workflow-client.ts) not tested with live frontend
- No unit tests for OpenRouter integration (add in T145)

**Future Considerations:**
- Consider adding Anthropic Claude provider (high quality)
- Consider adding local LLM support (Ollama)
- Consider provider cost tracking and budgets
- Consider A/B testing different providers for quality comparison
