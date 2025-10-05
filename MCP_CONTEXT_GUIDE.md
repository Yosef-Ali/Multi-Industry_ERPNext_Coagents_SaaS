# 🤖 MCP Guide - Following Development Context

**Model Context Protocol (MCP) - Best Practices for AI Coding Assistants**

**Last Updated:** October 3, 2025  
**Target Audience:** AI Coding Models (Claude, GPT-4, Codex, Copilot, Cursor, etc.)

---

## 🎯 What is MCP?

**Model Context Protocol (MCP)** is a standardized approach for AI coding assistants to maintain and share development context across sessions. This guide explains how to follow our project's development journey and continue building effectively.

---

## 📊 Project Context Overview

### **Project Name:** Multi-Industry ERPNext Coagents SaaS Platform

### **Core Technologies:**
- **Frontend:** Next.js 15, React 18, TypeScript, Tailwind CSS
- **AI Framework:** CopilotKit (embedded AI assistance)
- **Backend:** Cloudflare Workers, OpenRouter (Claude/GPT-4)
- **ERP Integration:** ERPNext/Frappe Framework
- **State Management:** LangGraph, Zustand
- **Deployment:** Cloudflare Pages, Workers

### **Architecture Pattern:**
```
Frontend (Next.js + CopilotKit)
    ↕
Agent Gateway (TypeScript on Cloudflare Workers)
    ↕
HybridCoAgent (Intelligent input processing)
    ↕
ERPNext Backend (Python/Frappe)
```

---

## 🗂️ Critical Files for Context

### **1. Entry Points (Read First)**

```
README.md                          # Project overview, architecture, status
WHATS_NEXT.md                      # Roadmap and immediate next steps
COPILOTKIT_EMBEDDED_COMPLETE.md    # CopilotKit integration complete guide
SESSION_COPILOTKIT_COMPLETE.md     # Latest session summary
```

**Why:** These give you the 10,000-foot view of what's built, what works, and what's next.

### **2. Architecture Documentation**

```
COPILOTKIT_INTEGRATION_PLAN.md     # System architecture
ARCHITECTURE_UPDATES.md            # Evolution of design decisions
HYBRID_AGENT_WORKFLOW_ARCHITECTURE.md  # Agent system design
```

**Why:** Understand the "why" behind technical choices before changing anything.

### **3. Implementation Reference**

```
frontend/coagent/
├── hooks/use-app-copilot.tsx       # Main integration hook (370 lines)
├── app/api/copilot/runtime/route.ts  # Backend API (580 lines)
├── components/providers/copilot-provider.tsx  # CopilotKit wrapper
└── app/(school-app)/                # Complete working example

services/agent-gateway/src/coagents/
├── hybrid.ts                        # HybridCoAgent (570 lines)
├── types.ts                         # Type definitions
└── modes.ts                         # Co-agent modes
```

**Why:** These are production-ready patterns to follow when extending the system.

---

## 🧭 How to Navigate Development Context

### **Step 1: Understand the Current State**

```bash
# Read these in order:
1. README.md              # What's the project?
2. WHATS_NEXT.md          # What's next?
3. SESSION_*.md           # What happened in last session?
4. Git log                # Recent changes
```

**Command:**
```bash
# Get recent commits with context
git log --oneline --graph --all --decorate -20

# See what changed recently
git diff HEAD~5..HEAD --stat
```

### **Step 2: Identify the Work Area**

**Ask:**
- Is this a NEW feature or CONTINUING existing work?
- Which layer: Frontend UI, Backend API, Agent Logic, or ERPNext Integration?
- Which industry: School, Clinic, Warehouse, Hotel, or Retail?

**Find relevant files:**
```bash
# Frontend components
find frontend/coagent/components -name "*.tsx" -type f

# Backend APIs
find frontend/coagent/app/api -name "*.ts" -type f

# Agent logic
find services/agent-gateway/src -name "*.ts" -type f

# Industry-specific apps
ls -la apps/
```

### **Step 3: Check for Patterns**

**Don't reinvent the wheel!** We have established patterns:

| Pattern | Reference File | Use For |
|---------|---------------|---------|
| Page with AI | `app/(school-app)/students/page.tsx` | New page with recommendations |
| New industry app | `app/(school-app)/` | Complete app structure |
| ERPNext action | `app/api/copilot/runtime/route.ts` (enroll_student) | New backend action |
| Recommendation logic | `hooks/use-app-copilot.tsx` (getRecommendationsForPage) | Page-specific suggestions |
| UI component | `components/copilot/recommendation-cards.tsx` | Reusable component |

**Command:**
```bash
# Find similar implementations
grep -r "enroll_student" frontend/coagent/
grep -r "useAppCopilot" frontend/coagent/app/
```

---

## 🔍 Context Discovery Tools

### **Tool 1: Semantic Search**

**Purpose:** Find code by meaning, not just keywords

**Example:**
```
Query: "How do we handle context updates when page changes?"
→ Find: hooks/use-app-copilot.tsx (updateContext function)
```

### **Tool 2: Grep Search**

**Purpose:** Fast exact string matching

```bash
# Find all CopilotKit usage
grep -r "useCopilotReadable" frontend/coagent/

# Find all ERPNext API calls
grep -r "ERPNEXT_URL" frontend/coagent/

# Find TypeScript errors
npx tsc --noEmit | grep "error TS"
```

### **Tool 3: File Structure Analysis**

**Purpose:** Understand project organization

```bash
# Tree view of key directories
tree -L 3 frontend/coagent/app/
tree -L 2 services/agent-gateway/src/

# Count lines of code by file type
find . -name "*.tsx" -o -name "*.ts" | xargs wc -l | sort -n
```

### **Tool 4: Git Blame for Context**

**Purpose:** Understand why code exists

```bash
# See who wrote a function and why
git blame -L 50,100 frontend/coagent/hooks/use-app-copilot.tsx

# See commit that introduced a file
git log --follow frontend/coagent/hooks/use-app-copilot.tsx
```

---

## 📝 Context Preservation Best Practices

### **1. Before Making Changes**

**DO:**
```bash
# Read the file completely first
cat frontend/coagent/hooks/use-app-copilot.tsx

# Check for TypeScript errors
npx tsc --noEmit

# Look for existing tests
find . -name "*.test.ts" -o -name "*.spec.ts"

# Check documentation
ls -la *README*.md *GUIDE*.md
```

**DON'T:**
- ❌ Start coding without reading existing implementation
- ❌ Assume patterns from other projects apply here
- ❌ Skip TypeScript compilation checks
- ❌ Ignore established conventions

### **2. While Making Changes**

**DO:**
- ✅ Follow existing code style (TypeScript strict mode, explicit types)
- ✅ Use established patterns (see reference files above)
- ✅ Add comments explaining "why", not "what"
- ✅ Update relevant documentation files
- ✅ Test changes incrementally

**Example of good change:**
```typescript
/**
 * Generate recommendations for warehouse app
 * 
 * Context: Warehouse apps need inventory-focused suggestions
 * Pattern: Similar to school app but with stock operations
 * Reference: getRecommendationsForPage() in use-app-copilot.tsx
 */
if (appType === 'warehouse') {
    if (page === 'inventory') {
        recommendations.push({
            title: 'Add New Item',
            description: 'Register new inventory item',
            action: 'navigate:/inventory/new',
            icon: 'Package',
        });
        
        // Check for low stock alert
        if (data?.hasLowStock) {
            recommendations.push({
                title: 'Reorder Low Stock',
                description: 'Create purchase orders for items below threshold',
                action: 'open:reorder-dialog',
                icon: 'AlertTriangle',
                priority: 'high',
            });
        }
    }
}
```

### **3. After Making Changes**

**DO:**
```bash
# Verify TypeScript compilation
npx tsc --noEmit

# Check for lint errors
npm run lint

# Run tests
npm test

# Commit with descriptive message
git add -A
git commit -m "feat(warehouse): Add inventory recommendations with low stock alerts

- Added warehouse-specific recommendations in useAppCopilot
- Follows school app pattern from use-app-copilot.tsx
- Includes priority-based low stock warnings
- Tested with mock data

Refs: WHATS_NEXT.md Phase 2.2"
```

**Update Documentation:**
```markdown
# In WHATS_NEXT.md or SESSION_*.md

## Recent Changes (Oct 3, 2025)

### Warehouse App Recommendations
- ✅ Added inventory page recommendations
- ✅ Implemented low stock alert logic
- ✅ Follows established patterns from school app
- 📍 Location: hooks/use-app-copilot.tsx lines 280-310

### Next Steps
- [ ] Add warehouse-specific ERPNext actions
- [ ] Create warehouse app layout
- [ ] Test with real ERPNext instance
```

---

## 🎓 Learning from Development History

### **Session Summaries as Context**

Each major session creates a summary document:

```
SESSION_COPILOTKIT_COMPLETE.md
SESSION_HYBRID_AGENT.md
SESSION_SECURITY_FIXES_COMPLETE.md
```

**How to use them:**

1. **Read chronologically** to understand evolution
2. **Look for patterns** in problem-solving approaches
3. **Check "Next Steps"** section for continuation guidance
4. **Reference "Files Changed"** section to see what was modified

### **Example: Following CopilotKit Integration Session**

```markdown
# From SESSION_COPILOTKIT_COMPLETE.md

Problem: Users need AI assistance embedded in generated apps
Solution: Integrate CopilotKit framework
Files Created: 13 (see section 3)
Pattern Established: useAppCopilot hook + RecommendationCards
Next: Integrate into HybridCoAgent generation

# As next AI developer, I should:
1. Read SESSION_COPILOTKIT_COMPLETE.md completely
2. Check files mentioned (hooks/use-app-copilot.tsx, etc.)
3. Understand the pattern
4. Continue with "Next Steps" items
5. Follow same documentation pattern
```

---

## 🔄 Context Handoff Protocol

### **When Starting New Session**

**Template for AI Assistants:**

```
# Session Start Context Check

1. **What's the current state?**
   - Read: README.md status badges
   - Read: Last SESSION_*.md file
   - Read: WHATS_NEXT.md immediate tasks

2. **What am I working on?**
   - Task: [Specific item from WHATS_NEXT.md]
   - Priority: [HIGH/MEDIUM/LOW]
   - Estimated time: [hours]

3. **What patterns should I follow?**
   - Reference file: [path to similar implementation]
   - Pattern: [brief description]
   - Tests to check: [test file paths]

4. **What will I update?**
   - Files to modify: [list]
   - Documentation to update: [list]
   - Tests to add/modify: [list]

5. **How will I preserve context?**
   - Create: SESSION_[TOPIC]_[DATE].md
   - Update: WHATS_NEXT.md with completion status
   - Commit message: [structured format]
```

### **When Ending Session**

**Create Session Summary:**

```markdown
# SESSION_[TOPIC]_COMPLETE.md

## Session Overview
- Date: [date]
- Duration: [hours]
- Goal: [what was accomplished]
- Status: ✅ Complete / 🚧 In Progress / ❌ Blocked

## What Was Built
1. [Feature/file 1] - [description]
2. [Feature/file 2] - [description]
...

## Files Changed
- `path/to/file1.ts` (120 lines added) - [purpose]
- `path/to/file2.tsx` (80 lines modified) - [purpose]

## Key Decisions
- Decision 1: [what was decided and why]
- Decision 2: [what was decided and why]

## Patterns Established
- Pattern 1: [description and where to find example]
- Pattern 2: [description and where to find example]

## Testing Done
- [x] TypeScript compilation passes
- [x] Lint checks pass
- [ ] E2E tests added
- [ ] Manual testing completed

## Next Steps (Priority Order)
1. [ ] Task 1 - [description]
2. [ ] Task 2 - [description]
3. [ ] Task 3 - [description]

## For Next Developer
- **Start here:** [file path or documentation]
- **Pattern to follow:** [reference implementation]
- **Watch out for:** [gotchas or considerations]
```

---

## 🧪 Context Validation

### **Before Committing Code**

**Run these checks:**

```bash
#!/bin/bash
# context-validation.sh

echo "🔍 Validating development context..."

# 1. TypeScript compilation
echo "Checking TypeScript..."
npx tsc --noEmit || exit 1

# 2. Linting
echo "Checking lint..."
npm run lint || exit 1

# 3. Tests
echo "Running tests..."
npm test || exit 1

# 4. Documentation sync
echo "Checking documentation..."
if git diff --name-only | grep -q "\.tsx\|\.ts"; then
    echo "⚠️  Code changed. Did you update documentation?"
    echo "   - Update WHATS_NEXT.md if needed"
    echo "   - Create SESSION_*.md for major changes"
    echo "   - Update README.md if architecture changed"
fi

# 5. Commit message format
echo "Checking last commit message..."
git log -1 --pretty=%B | grep -q "^feat\|^fix\|^docs\|^refactor\|^test\|^chore" || {
    echo "❌ Commit message should start with: feat|fix|docs|refactor|test|chore"
    exit 1
}

echo "✅ Context validation passed!"
```

---

## 📚 Documentation Structure

### **Our Documentation Hierarchy**

```
README.md                                   # Entry point, current status
├── WHATS_NEXT.md                          # Roadmap and priorities
├── ARCHITECTURE/
│   ├── COPILOTKIT_INTEGRATION_PLAN.md     # CopilotKit architecture
│   ├── HYBRID_AGENT_WORKFLOW_ARCHITECTURE.md  # Agent design
│   └── ARCHITECTURE_UPDATES.md            # Design evolution
├── GUIDES/
│   ├── COPILOTKIT_EMBEDDED_COMPLETE.md    # Complete CopilotKit guide
│   ├── COPILOTKIT_QUICK_REF.md           # Quick reference
│   ├── TESTING_GUIDE.md                   # Testing practices
│   └── DEPLOYMENT_*.md                    # Deployment guides
├── SESSIONS/
│   ├── SESSION_COPILOTKIT_COMPLETE.md     # Latest session
│   ├── SESSION_HYBRID_AGENT.md            # Previous session
│   └── SESSION_*.md                       # Historical sessions
└── SPECS/
    └── 001-erpnext-coagents-mvp/
        ├── spec.md                         # Feature requirements
        ├── plan.md                         # Technical plan
        └── tasks.md                        # Task breakdown
```

### **When to Create New Documentation**

| Scenario | Document Type | Example |
|----------|--------------|---------|
| New major feature | SESSION_[FEATURE]_COMPLETE.md | SESSION_COPILOTKIT_COMPLETE.md |
| Architecture change | Update ARCHITECTURE_*.md | ARCHITECTURE_UPDATES.md |
| New guide needed | [TOPIC]_GUIDE.md | TESTING_GUIDE.md |
| Quick reference | [TOPIC]_QUICK_REF.md | COPILOTKIT_QUICK_REF.md |
| Deployment info | DEPLOYMENT_[PLATFORM].md | DEPLOYMENT_CLOUDFLARE.md |

---

## 🤝 Collaboration with Other AI Models

### **Context Sharing Format**

**When handing off to another AI:**

```json
{
  "project": "Multi-Industry ERPNext Coagents SaaS",
  "currentState": {
    "lastSession": "SESSION_COPILOTKIT_COMPLETE.md",
    "completionPercentage": 65,
    "activeFeature": "CopilotKit Integration",
    "status": "Production Ready"
  },
  "nextTasks": [
    {
      "id": "Phase1.1",
      "title": "Update HybridCoAgent with CopilotKit templates",
      "priority": "HIGH",
      "estimatedHours": 4,
      "referenceFiles": [
        "services/agent-gateway/src/coagents/hybrid.ts",
        "frontend/coagent/hooks/use-app-copilot.tsx"
      ],
      "pattern": "Follow school app generation pattern"
    }
  ],
  "criticalContext": {
    "architecture": "Next.js + CopilotKit + ERPNext",
    "deploymentTarget": "Cloudflare Workers",
    "testingStatus": "TypeScript passes, E2E pending",
    "blockers": "None"
  },
  "warnings": [
    "Don't modify core ERPNext files",
    "Always use TypeScript strict mode",
    "Follow established patterns in use-app-copilot.tsx"
  ]
}
```

### **Questions to Ask Before Coding**

1. **Has this been implemented before?**
   ```bash
   grep -r "similar_feature" .
   ```

2. **What pattern should I follow?**
   ```bash
   ls -la *PATTERN*.md *REFERENCE*.md
   ```

3. **Are there tests for this?**
   ```bash
   find . -name "*.test.ts" | xargs grep "feature_name"
   ```

4. **Who made related changes?**
   ```bash
   git log --all --grep="feature_name"
   ```

5. **Is documentation up to date?**
   ```bash
   git diff HEAD~10..HEAD -- "*.md"
   ```

---

## ✅ Context Checklist for AI Developers

### **Before Starting Work**

- [ ] Read README.md completely
- [ ] Read WHATS_NEXT.md for current priorities
- [ ] Read latest SESSION_*.md for recent changes
- [ ] Check git log for last 10 commits
- [ ] Verify TypeScript compilation passes
- [ ] Identify reference implementations

### **During Work**

- [ ] Follow established patterns
- [ ] Add comments explaining "why"
- [ ] Keep TypeScript strict mode
- [ ] Test changes incrementally
- [ ] Update relevant documentation

### **After Work**

- [ ] Run TypeScript compilation check
- [ ] Run linting
- [ ] Run tests
- [ ] Update WHATS_NEXT.md
- [ ] Create SESSION_*.md if major work
- [ ] Write structured commit message
- [ ] Push changes

### **Before Handoff**

- [ ] Create comprehensive session summary
- [ ] List all files changed
- [ ] Document patterns established
- [ ] Provide clear next steps
- [ ] Note any blockers or warnings

---

## 🎯 Success Criteria

**You've maintained context well if:**

✅ New code follows existing patterns  
✅ TypeScript compilation passes without errors  
✅ Documentation is updated with changes  
✅ Commit messages are descriptive and structured  
✅ Tests pass (or are marked as TODO)  
✅ Next developer can pick up where you left off  
✅ No architectural surprises or unexpected rewrites  

---

## 📞 Resources

**Key Files to Bookmark:**
- README.md
- WHATS_NEXT.md
- COPILOTKIT_EMBEDDED_COMPLETE.md
- hooks/use-app-copilot.tsx
- app/api/copilot/runtime/route.ts

**Commands to Memorize:**
```bash
# Find similar code
grep -r "pattern_name" .

# Check TypeScript
npx tsc --noEmit

# See recent changes
git log --oneline -10

# Find documentation
ls -la *.md
```

---

**Remember:** Good context maintenance = Faster development + Higher quality + Better collaboration

🚀 **Ready to build? Start with WHATS_NEXT.md!**
