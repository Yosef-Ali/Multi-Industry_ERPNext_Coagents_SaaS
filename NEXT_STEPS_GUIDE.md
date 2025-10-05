_scripts/appointment.js
   - Add "Copilot" button to Appointment form

Follow this pattern for all scripts:

```javascript
frappe.ui.form.on('[DocType]', {
  refresh(frm) {
    frm.add_custom_button('Copilot', () => {
      const url = `/coagent?doctype=${encodeURIComponent(frm.doctype)}&name=${encodeURIComponent(frm.doc.name)}`;
      const d = new frappe.ui.Dialog({
        title: 'Copilot Assistant',
        size: 'large'
      });
      d.$body.html(`<iframe src="${url}" style="width:100%;height:70vh;border:0;"></iframe>`);
      d.show();
    });
  }
});
```

Also update:
- apps/erpnext_hotel/hooks.py - Register client scripts
- apps/erpnext_hospital/hooks.py - Register client scripts

Use Frappe v14+ patterns.
```

---

## 📈 Progress Tracking

### Current Status
```
Phase 3.1: Setup           ████████████████████ 100% (13/13)
Phase 3.2: Tests First     ████████████████████ 100% (30/30)
Phase 3.3: Core Impl       ████████████████░░░░  74% (53/72)
Phase 3.4: Workflows       ░░░░░░░░░░░░░░░░░░░░   0% (0/13)
Phase 3.5: Generator       ░░░░░░░░░░░░░░░░░░░░   0% (0/7)
Phase 3.6: Frontend        ░░░░░░░░░░░░░░░░░░░░   0% (0/12)
Phase 3.7: ERPNext Integ   ░░░░░░░░░░░░░░░░░░░░   0% (0/10)
Phase 3.8: Config/Deploy   ░░░░░░░░░░░░░░░░░░░░   0% (0/9)
Phase 3.9: Polish          ░░░░░░░░░░░░░░░░░░░░   0% (0/17)

Overall: ██████████░░░░░░░░░░ 49% (74/150)
```

### After Your PR Merges
```
Overall: ███████████░░░░░░░░░ 53% (80/150)
```

### After Frontend Complete
```
Phase 3.6: Frontend        ████████████████████ 100% (12/12)
Overall: ███████████████░░░░░ 61% (92/150)
```

### After Workflows Complete
```
Phase 3.4: Workflows       ████████████████████ 100% (13/13)
Overall: ██████████████████░░ 70% (105/150)
```

---

## 🎯 3-Week Sprint to MVP

### Week 1: User Interface (HIGH PRIORITY)
**Goal**: Users can interact with coagent through ERPNext forms

**Monday-Tuesday**: Frontend Core (T094-T099)
- CopilotKit integration
- Event streaming
- Approval dialogs

**Wednesday**: ERPNext Client Scripts (T106-T110)
- Add Copilot buttons to 5 doctypes
- Test iframe integration

**Thursday**: Frontend Widgets (T100-T105)
- Domain-specific visualizations
- 6 widgets for all verticals

**Friday**: Integration Testing
- End-to-end user flows
- Bug fixes

**Deliverable**: ✅ Working UI that connects ERPNext → Coagent → Tools → Approval → Result

---

### Week 2: Business Workflows (HIGH PRIORITY)
**Goal**: Deterministic multi-step processes work

**Monday**: Workflow Infrastructure (T080-T086)
- Base state schemas
- Workflow registry
- Reusable nodes (approval, retry, escalate, notify)

**Tuesday**: Hospital + Manufacturing (T088-T089)
- Hospital admissions workflow
- Manufacturing production workflow

**Wednesday**: Retail + Education (T090-T091)
- Retail order fulfillment workflow
- Education admissions workflow

**Thursday**: State Persistence (T092)
- Redis-based state storage
- Interrupt/resume support

**Friday**: Workflow Testing
- Test all 5 workflows end-to-end
- Fix edge cases

**Deliverable**: ✅ 5 production-ready workflows for all verticals

---

### Week 3: SaaS Generation (MEDIUM PRIORITY)
**Goal**: Dynamic app generation works

**Monday-Wednesday**: Generator Service (T087-T093)
- PRD analyzer
- DocType generator
- Tool stub generator
- Workflow template generator
- Jinja2 templates
- API endpoints

**Thursday**: Configuration + Deployment (T116-T124)
- Configuration management
- Dockerfiles
- docker-compose updates
- Deployment docs

**Friday**: End-to-End Testing
- Generate a custom vertical
- Test approval flow
- Verify auto-registration

**Deliverable**: ✅ Working SaaS app generation capability

---

## 🔧 Troubleshooting Guide

### Issue: Claude Code Can't Find Files
```bash
# Make sure you're in the right directory
pwd
# Should output: /Users/mekdesyared/Multi-Industry_ERPNext_Coagents_SaaS

# Make sure branch is correct
git branch
# Should show: * feature/[your-feature-name]
```

### Issue: TypeScript Compilation Errors
```bash
cd services/agent-gateway
npm install
npm run build

# If errors, check:
# 1. All imports are correct
# 2. Types are properly defined
# 3. No any types without good reason
```

### Issue: Frontend Won't Connect to Gateway
```bash
# Check gateway is running
curl http://localhost:3000/health
# Should return: {"status":"ok"}

# Check CORS configuration
# In services/agent-gateway/src/server.ts:
# - ALLOWED_ORIGINS should include http://localhost:5173
# - credentials: true should be set
```

### Issue: Workflow Won't Execute
```bash
# Check Redis is running
docker ps | grep redis

# Check workflow is registered
# In services/workflows/src/core/registry.py:
# - Workflow should be imported
# - Workflow should be in registry map
```

---

## 📚 Reference Documents

**Always have these open while working:**

1. **DEVELOPMENT_AGENT.md** - Coding patterns and conventions
2. **specs/001-erpnext-coagents-mvp/tasks.md** - Task checklist
3. **specs/001-erpnext-coagents-mvp/plan.md** - Technical architecture
4. **TASKS_STATUS_REPORT.md** - Current progress tracking

**Quick Links:**
- GitHub Spec-Kit: https://github.com/github/spec-kit
- CopilotKit Docs: https://docs.copilotkit.ai
- LangGraph Docs: https://langchain-ai.github.io/langgraph/
- Frappe Docs: https://frappeframework.com/docs

---

## ✅ Definition of Done Checklist

For each feature branch:

**Before Committing:**
- [ ] Code compiles without errors
- [ ] No lint errors
- [ ] Follows patterns in DEVELOPMENT_AGENT.md
- [ ] TypeScript types defined (no any)
- [ ] Error handling implemented
- [ ] Comments added for complex logic

**Before Creating PR:**
- [ ] All related tasks marked [x] in tasks.md
- [ ] Manual testing passed
- [ ] No console errors
- [ ] Git commit messages follow convention
- [ ] PR description includes summary, changes, testing

**Before Merging:**
- [ ] PR reviewed (or self-reviewed thoroughly)
- [ ] CI passes (if configured)
- [ ] Integration tests pass
- [ ] Documentation updated if needed

---

## 🎬 Summary: Your Next 60 Minutes

**Minutes 0-10**: Create and merge current PR
```bash
# Create PR on GitHub
# Merge it
# Pull latest to main branch
```

**Minutes 10-15**: Update tasks.md
```bash
# Mark T065-T070 complete
# Commit and push
```

**Minutes 15-20**: Create new frontend branch
```bash
git checkout -b feature/frontend-copilotkit-integration
claude
```

**Minutes 20-60**: Start frontend implementation
```
# Copy/paste the Claude Code prompt from above
# Watch it implement T094-T099
# Answer any clarification questions
# Test the implementation
```

---

## 🚀 Quick Command Reference

```bash
# Create new feature branch
git checkout 001-erpnext-coagents-mvp
git pull
git checkout -b feature/[name]

# Start Claude Code
claude

# Test TypeScript
cd services/agent-gateway
npm run build && npm run lint

# Test Python
cd services/workflows
pytest && black . --check

# Test Frontend
cd frontend/coagent
npm run build && npm run lint

# Create PR
# Push branch, then visit GitHub to create PR

# After merge
git checkout 001-erpnext-coagents-mvp
git pull
```

---

## 💡 Pro Tips

1. **Use Claude Code's Memory**: Reference previous implementations
   ```
   "Following the pattern from services/agent-gateway/src/tools/common/create_doc.ts..."
   ```

2. **Break Down Complex Tasks**: If Claude Code struggles, break it into smaller steps
   ```
   "First, just create the file structure and interfaces.
    Then we'll implement the business logic."
   ```

3. **Test Incrementally**: Don't wait until everything is done
   ```
   "Let's test the CopilotKitProvider setup before moving to components."
   ```

4. **Reference Existing Code**: Always point to working examples
   ```
   "Look at services/agent-gateway/src/routes/agui.ts to understand 
    how AG-UI events are structured."
   ```

5. **Keep DEVELOPMENT_AGENT.md Updated**: As you discover new patterns, add them
   ```
   "Add a note to DEVELOPMENT_AGENT.md about how to handle 
    CopilotKit streaming edge cases."
   ```

---

**You're ready to continue! Start with Step 1 above. Good luck! 🚀**
