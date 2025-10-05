    ├── components/preview/
    ├── lib/store/
    └── __tests__/
```

---

## 🎯 Key Features to Implement

### 1. Split-Pane Layout
```typescript
// Resizable panels: 40% chat + 60% preview
<ResizablePanelGroup direction="horizontal">
  <ResizablePanel defaultSize={40}>Chat</ResizablePanel>
  <ResizablePanel defaultSize={60}>Preview</ResizablePanel>
</ResizablePanelGroup>
```

### 2. 3-Variant Generation
```typescript
// Generate minimal, standard, advanced approaches
const variants = await generateVariants(analysis, 3);
// Returns: [Variant1, Variant2, Variant3]
```

### 3. Live Preview
```typescript
// Interactive ERPNext form preview
<DocTypePreview artifact={selectedVariant} />
<WorkflowPreview artifact={selectedVariant} />
<CodePreview artifact={selectedVariant} />
```

### 4. Natural Language Refinement
```typescript
// User: "Add payment field"
// AI: Updates selected variant
await refineArtifact(artifactId, "Add payment field");
```

### 5. Approval Gate Deployment
```typescript
// High-risk changes require approval
if (artifact.requiresApproval) {
  const approved = await showApprovalDialog();
  if (!approved) return;
}
await deployToERPNext(artifact);
```

---

## 🔧 Context7 MCP Integration

### What is Context7?
Real-time framework documentation fetching for AI agents.

### How to Use

```typescript
import { context7 } from '@/lib/mcp/context7-client';

// Fetch ERPNext docs
const docs = await context7.fetchDocs([
  'erpnext-doctype-structure',
  'frappe-workflow-engine'
]);

// Use in Claude prompt
const prompt = `
Using these guidelines:
${docs.get('erpnext-doctype-structure')}

Generate a DocType for: ${userRequest}
`;
```

### Available Docs
- `erpnext-*` - ERPNext documentation
- `frappe-*` - Frappe Framework docs
- `copilotkit-*` - CopilotKit examples
- `langgraph-*` - LangGraph patterns
- `claude-sdk-*` - Claude Agent SDK

---

## ✅ Success Criteria

### Visual Quality
- [ ] Split-pane layout with smooth resizing
- [ ] Streaming text animations
- [ ] Variant tabs with selection feedback
- [ ] Live DocType/workflow previews
- [ ] Syntax-highlighted code
- [ ] Smooth transitions (60fps)

### Functionality
- [ ] Generate 3 variants < 8 seconds
- [ ] Select and refine any variant
- [ ] Preview updates in real-time
- [ ] Deploy with approval gate
- [ ] Keyboard shortcuts work

### Code Quality
- [ ] TypeScript strict mode
- [ ] 80%+ test coverage
- [ ] All E2E tests passing
- [ ] Storybook for components
- [ ] Zero ESLint errors

---

## 📊 Current vs Target

### Current Frontend ❌
```
Simple chatbot:
- Single chat panel
- No code preview
- No variants
- Basic responses
```

### Target Frontend ✅
```
v0-style generator:
- Split-pane (chat + preview)
- 3 variant generation
- Live ERPNext previews
- Iterative refinement
- Professional animations
- Claude demo quality
```

---

## 🚀 Deployment Status

### Backend (Working ✅)
- Agent Gateway: Deployed
- OpenRouter: Connected
- Health checks: Passing
- Tools: Functional

### Frontend (Needs Upgrade ⚠️)
- Basic version: Deployed
- v0-style: Not yet built
- Next step: Implement Phase 7

---

## 💡 Implementation Tips

### 1. Use Context7 MCP Heavily
```bash
# When building, ask Claude:
"Using Context7 MCP, show me CopilotKit action examples"
"Fetch erpnext-doctype-field-types from Context7"
```

### 2. Build in Storybook First
```bash
# Test components isolated
pnpm run storybook

# Create story for each component
components/preview/doctype-preview.stories.tsx
```

### 3. Test Incrementally
```bash
# After each phase:
pnpm test                    # Unit tests
pnpm test:e2e                # E2E tests
pnpm run build               # Build check
```

### 4. Follow Code Examples
All tasks in `PHASE_7_V0_STYLE_FRONTEND.md` have:
- Complete TypeScript code
- Best practices notes
- MCP query suggestions
- Ready to copy-paste

### 5. Deploy Incrementally
```bash
# After Phase 7.1-7.2 (core working)
pnpm run build && pnpm dlx wrangler pages deploy out

# After Phase 7.3-7.4 (previews + refinement)
pnpm run build && pnpm dlx wrangler pages deploy out

# After Phase 7.5-7.7 (complete)
pnpm run build && pnpm dlx wrangler pages deploy out
```

---

## 🎓 Learning Resources

### Documentation
- **Phase 7 Guide**: `PHASE_7_V0_STYLE_FRONTEND.md`
- **Quick Start**: `PHASE_7_START_HERE.md`
- **Tasks List**: `specs/001-erpnext-coagents-mvp/tasks.md`

### Examples
All code is production-ready and follows:
- Next.js 15 best practices
- React 19 patterns
- TypeScript strict mode
- Accessibility standards
- Performance optimization

### Tools
- **Claude Desktop** (with Context7 MCP)
- **VS Code** (with Copilot)
- **Storybook** (component development)
- **Playwright** (E2E testing)

---

## 📅 Timeline

### Estimated: 4-6 hours

```
Hour 1:   Setup + Architecture (T200-T202)
Hour 2:   Generation Engine (T203-T204)
Hour 3:   Preview System (T205-T207)
Hour 4:   Refinement (T208-T209)
Hour 5:   Deployment + Polish (T210-T212)
Hour 6:   Context7 + Testing (T213-T216)
```

### Recommended Approach
- **Best**: One 6-hour session (context retention)
- **Good**: Two 3-hour sessions (same day)
- **OK**: Multiple shorter sessions (track progress)

---

## 🔄 Next Session Plan

### Before Starting
1. Read `PHASE_7_START_HERE.md`
2. Review `PHASE_7_V0_STYLE_FRONTEND.md`
3. Setup environment (API keys)
4. Install dependencies

### During Development
1. Work through T200-T216 in order
2. Use Context7 MCP for docs
3. Test each component
4. Commit after each task

### After Completion
1. Run full test suite
2. Build for production
3. Deploy to Cloudflare
4. Verify live site
5. Update tasks.md

---

## 📝 Task Tracking

Update `specs/001-erpnext-coagents-mvp/tasks.md`:

```markdown
## Phase 7: v0-Style Frontend

### Architecture
- [x] T200: Split-pane layout
- [x] T201: Artifact types
- [x] T202: Zustand store

### Generation
- [x] T203: CopilotKit runtime
- [x] T204: Variant generator

### Preview
- [x] T205: DocType preview
- [x] T206: Workflow preview
- [x] T207: Code highlighting

### Refinement
- [x] T208: Variant selector
- [x] T209: Refinement input

### Deployment
- [x] T210: Deployment panel
- [x] T211: Streaming animations
- [x] T212: Keyboard shortcuts

### Context7
- [x] T213: Context7 client
- [x] T214: Claude Agent SDK

### Testing
- [x] T215: E2E tests
- [x] T216: Storybook
```

---

## 🎯 Final URLs (After Phase 7)

### Current
- Agent Gateway: https://erpnext-agent-gateway.dev-yosefali.workers.dev
- Frontend (Basic): https://4fdef20e.erpnext-coagent-ui.pages.dev

### After Phase 7
- Agent Gateway: (same)
- Frontend (v0-style): https://erpnext-coagent-ui.pages.dev (new deployment)

---

## 📞 Support

### Documentation
- All guides in project root
- Code examples in `PHASE_7_V0_STYLE_FRONTEND.md`
- Task list in `tasks.md`

### Tools
- Context7 MCP for docs
- Claude Desktop for development
- Storybook for components
- Playwright for testing

### Questions
- Check documentation first
- Use Context7 MCP for framework questions
- Review code examples
- Ask Claude for clarification

---

## ✨ Summary

### Completed Today ✅
1. Deployed Agent Gateway to Cloudflare
2. Deployed basic frontend
3. Identified frontend gap (basic → v0-style)
4. Created comprehensive Phase 7 plan
5. Documented all implementation details
6. Set up project for next session

### Ready for Next Session ✅
- Complete implementation guide ready
- All code examples provided
- Context7 MCP integration planned
- Testing strategy defined
- Deployment process documented

### Expected Outcome 🎯
- Professional v0.dev-style interface
- 3-variant generation system
- Live ERPNext previews
- Iterative refinement
- Claude Sonnet 4.5 demo quality

---

## 🚀 Next Action

**Open**: `PHASE_7_START_HERE.md`  
**Follow**: Implementation guide step-by-step  
**Use**: Context7 MCP for all documentation needs  
**Result**: World-class ERPNext developer experience

---

**Time to build**: 4-6 hours  
**Difficulty**: Medium (all patterns provided)  
**Value**: High (transforms entire UX)

**Let's ship this! 🚀**

---

*Session Date: October 3, 2025*  
*Documentation Version: 1.0*  
*Status: Ready for Implementation*
