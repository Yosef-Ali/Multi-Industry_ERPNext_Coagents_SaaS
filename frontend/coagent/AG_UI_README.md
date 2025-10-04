# AG-UI Protocol + Artifact Components

## 🎯 Project Architecture - Two Different Applications

This project has **TWO distinct applications** with different needs:

---

## 📱 Application 1: ERPNext App Generator (Developer Tool)

**Route:** `/developer`
**Users:** Developers building ERPNext applications
**Purpose:** Generate complete ERPNext apps through conversation

### Original Vercel AI Chatbot Interface
✅ **Using cloned Vercel AI Chatbot** at `/developer` (NOT modified!)
- Original Chat component from Vercel
- Streaming responses
- Message history
- Sidebar navigation
- **NO CHANGES to original code**

### Artifact Components (Available, Not Integrated Yet)
**Built but NOT integrated with /developer:**
```
components/artifacts/
├── artifact-container.tsx    ✅ Built - ready when needed
├── code-artifact.tsx         ✅ Built - ready when needed
├── preview-artifact.tsx      ✅ Built - ready when needed
└── artifact-toolbar.tsx      ✅ Built - ready when needed
```

**When to integrate:** When you want the agent to show generated code in artifacts
**Current status:** Components exist, but /developer still uses original cloned chat

---

## 🏢 Application 2: Generated ERPNext Apps (End User Applications)

**Routes:** `/school`, `/hospital`, `/hotel`, `/warehouse`, `/retail`, etc.
**Users:** End users managing their business
**Purpose:** Use AI co-agent to manage ERPNext operations

### Features Needed:
✅ **AG-UI Generative UI (In Chatbot)**
- Generate forms IN the chat when user asks
- Generate tables IN the chat to display data
- Generate charts IN the chat for analytics
- Generate dashboards IN the chat for overview

**Example Workflow:**
```
School Admin: "Enroll a new student"
              ↓
Agent generates enrollment form IN the chatbot (AG-UI)
              ↓
User fills form in chat
              ↓
Agent calls ERPNext API: enroll_student(...)
              ↓
Success! Student enrolled
```

---

## 🏗️ What We Built

### ✅ Phase 1: AG-UI Infrastructure (COMPLETE)
```
lib/ag-ui/
├── types.ts       - AG-UI event types
├── events.ts      - Event handlers
├── client.ts      - HTTP client + SSE
└── index.ts       - Exports

hooks/
├── use-ag-ui-stream.tsx  - Stream agent responses
└── use-ag-ui-state.tsx   - Bi-directional state sync

app/api/
└── ag-ui/route.ts        - Backend endpoint

app/ag-ui-test/
└── page.tsx              - Test demo at /ag-ui-test
```

**Status:** ✅ Complete and working
**Test:** http://localhost:3001/ag-ui-test

---

### ✅ Phase 2: Artifact Components (COMPLETE)

**Components built (NOT integrated yet):**
```
components/artifacts/
├── artifact-container.tsx    - Main container
├── code-artifact.tsx         - Syntax highlighting
├── preview-artifact.tsx      - Live preview iframe
└── artifact-toolbar.tsx      - Export, copy controls
```

**Status:** ✅ Components built and ready
**Integration:** NOT done - keeping original /developer unchanged
**Usage:** Available for future integration when needed

---

### 🚧 Phase 3: AG-UI Generative UI Components (TODO)

**For generated ERPNext apps:**

#### Dynamic UI Components
```
components/genui/
├── dynamic-form.tsx          - AI-generated forms in chat
├── dynamic-table.tsx         - AI-generated data tables
├── dynamic-chart.tsx         - AI-generated charts
├── dynamic-card.tsx          - AI-generated info cards
└── ui-renderer.tsx           - Render AG-UI components
```

**Status:** 🚧 Not started yet
**Purpose:** For /school, /hospital, etc. - NOT for /developer

---

## 📁 Current File Structure

```
frontend/coagent/
├── app/
│   ├── developer/              # ✅ Original Vercel Chat (unchanged)
│   │   ├── page.tsx           # Original cloned code
│   │   └── layout.tsx         # Original cloned code
│   │
│   ├── school/                # Future: Will use AG-UI genui
│   ├── hospital/              # Future: Will use AG-UI genui
│   ├── hotel/                 # Future: Will use AG-UI genui
│   │
│   ├── chat/                  # ✅ Cleaned Vercel chat
│   ├── demo/                  # ✅ Test page
│   ├── ag-ui-test/            # ✅ AG-UI test page
│   │
│   └── api/
│       ├── copilot/runtime/   # Existing CopilotKit
│       └── ag-ui/             # ✅ New AG-UI endpoint
│
├── components/
│   ├── artifacts/             # ✅ Built (not integrated)
│   │   ├── artifact-container.tsx
│   │   ├── code-artifact.tsx
│   │   ├── preview-artifact.tsx
│   │   └── artifact-toolbar.tsx
│   │
│   ├── genui/                 # 🚧 To build for Phase 3
│   ├── chat.tsx               # ✅ Original from Vercel
│   ├── messages.tsx           # ✅ Original from Vercel
│   └── ...                    # ✅ All 50+ cloned components
│
├── hooks/
│   ├── use-ag-ui-stream.tsx   # ✅ Done
│   ├── use-ag-ui-state.tsx    # ✅ Done
│   └── use-app-copilot.tsx    # Existing
│
└── lib/
    └── ag-ui/                 # ✅ Done
```

---

## 🎯 What's Working Now

### ✅ Original Cloned Code (Unchanged)
- `/developer` - Original Vercel AI Chatbot interface
- `/chat` - Cleaned Vercel chat (no database)
- `/demo` - Demo page

### ✅ AG-UI Infrastructure
- `/ag-ui-test` - Test the AG-UI protocol
- `lib/ag-ui/` - All event handling and streaming
- `app/api/ag-ui/` - Backend endpoint

### ✅ Artifact Components (Available)
- `components/artifacts/` - Ready to use when needed
- NOT integrated with /developer yet
- Can be added later without modifying original chat

---

## 🚀 Next Steps

### Option A: Keep Everything Separated (RECOMMENDED)
- Keep /developer with original Vercel chat
- Build Phase 3 genui components for /school, /hospital, etc.
- Use artifacts only when specifically needed

### Option B: Future Artifact Integration
- Later, when agent generates code, show it in artifacts
- Add alongside the chat, not replacing it
- Agent can stream code → artifacts appear

### Option C: Focus on Generated Apps
- Skip artifact integration for /developer
- Build Phase 3 for /school, /hospital, etc.
- Dynamic forms/tables in CopilotKit sidebar chat

---

## 📊 Summary

**What We Built:**
1. ✅ AG-UI protocol infrastructure
2. ✅ Artifact components (available but not integrated)
3. ✅ Original Vercel chat preserved unchanged

**What We're NOT Doing:**
- ❌ Modifying original /developer page
- ❌ Replacing cloned Vercel components
- ❌ Creating custom chat interfaces

**What's Next:**
- Phase 3: Build genui components for generated apps
- Use AG-UI for dynamic forms/tables in /school, /hospital, etc.
- Keep /developer as-is with original Vercel code

---

## 🔄 Restored Original State

**The /developer route uses the exact cloned Vercel AI Chatbot code.**
**No modifications to original chat components.**
**Artifact components available in `components/artifacts/` when needed.**

✅ **Original code preserved!**
