# T149: ERPNext-Focused Developer Co-Agent - Quick Start

## What Changed? 🎯

Your co-agent system is now **ERPNext-only** with **single best-practice solutions**.

### Before ❌
```typescript
// Generated 3 alternative solutions
DeveloperCoAgent.generate(request) 
// → Returns 3 variants (Simple, Robust, Optimized)
```

### After ✅
```typescript
// Generates 1 best-practice ERPNext solution
DeveloperCoAgent.generate(request)
// → Returns 1 production-ready solution following ERPNext conventions
```

## New ERPNext Artifact Types

```typescript
// Hotel Management
ERPNEXT_HOTEL_CHECKIN   // Guest check-in with room assignment
ERPNEXT_HOTEL_ROOM      // Room status and housekeeping

// Sales Workflows
ERPNEXT_SALES_ORDER     // Sales order with inventory checks

// Custom Development
ERPNEXT_CUSTOM_DOCTYPE  // DocType with validation & permissions
ERPNEXT_REPORT          // Script reports with filters
ERPNEXT_DASHBOARD       // Charts and metrics
```

## Example Usage

### Generate Hotel Check-in UI
```typescript
import { DeveloperCoAgent, ArtifactType } from './coagents';
import { openRouterProvider } from './ai/providers';

const coagent = new DeveloperCoAgent(openRouterProvider);

const response = await coagent.generateResponse({
    prompt: "Create a hotel check-in form with guest details and room selection",
    artifactType: ArtifactType.ERPNEXT_HOTEL_CHECKIN,
    constraints: [
        "Must integrate with ERPNext Room Booking",
        "Include payment processing",
        "Real-time room availability"
    ]
});

// Returns single best-practice solution
console.log(response.artifacts[0].title);
// → "Hotel Check-in System"

console.log(response.artifacts[0].approach);
// → "Production-ready hotel check-in system following ERPNext hotel management best practices"

console.log(response.artifacts[0].features);
// → ["Guest registration", "Room assignment", "Payment integration", ...]
```

### Generate Sales Order Form
```typescript
const response = await coagent.generateResponse({
    prompt: "Create a sales order form with customer and item selection",
    artifactType: ArtifactType.ERPNEXT_SALES_ORDER,
    preferences: [
        "Use CopilotKit for real-time updates",
        "Support multi-currency"
    ]
});

// Single production-ready solution
const artifact = response.artifacts[0];
// Contains: React component with useCoAgent hook, ERPNext integration
```

### Generate Custom DocType
```typescript
const response = await coagent.generateResponse({
    prompt: "Create a Maintenance Request DocType for hotel rooms",
    artifactType: ArtifactType.ERPNEXT_CUSTOM_DOCTYPE,
    constraints: [
        "Link to Room and Employee",
        "Include priority field",
        "Add workflow for approvals"
    ]
});

// Returns DocType definition with:
// - Field definitions (Data, Link, Select, etc.)
// - Permissions configuration
// - Server-side validation
// - Client scripts
```

## What's Embedded in Every Solution

### ERPNext Conventions
- ✅ TitleCase for DocTypes
- ✅ snake_case for fields
- ✅ Proper field types
- ✅ Naming series
- ✅ Permissions and roles

### Technology Stack
- ✅ React with TypeScript
- ✅ Next.js 15
- ✅ CopilotKit hooks (`useCoAgent`)
- ✅ Tailwind CSS + shadcn/ui
- ✅ Frappe/ERPNext APIs

### Best Practices
- ✅ Mobile responsive
- ✅ Error handling
- ✅ Validation (client + server)
- ✅ Clean, documented code
- ✅ Real-time UI updates

## API Changes

### Artifact Interface Updates
```typescript
// OLD
interface Artifact {
    variantNumber?: number;        // 1, 2, or 3
    differentiators?: string[];    // How it differs from other variants
}

// NEW
interface Artifact {
    approach?: string;             // ERPNext best-practice description
    features?: string[];           // Key features of this solution
}
```

### Configuration Changes
```typescript
// OLD
DEFAULT_MODE_CONFIGS[CoAgentMode.DEVELOPER] = {
    generateVariants: true,
    variantCount: 3,
    includeComparison: true,
    maxTokens: 6000,
}

// NEW
DEFAULT_MODE_CONFIGS[CoAgentMode.DEVELOPER] = {
    generateVariants: false,  // Single solution
    variantCount: 1,
    includeComparison: false,
    maxTokens: 4000,          // Reduced token usage
}
```

## Framework Documentation

### Anthropic SDK (Streaming)
```typescript
// Retrieved from MCP context7: /anthropics/anthropic-sdk-typescript
import Anthropic from '@anthropic-ai/sdk';

const stream = anthropic.messages.stream({
    model: 'claude-3-5-sonnet-20241022',
    messages: [{ role: 'user', content: 'Generate hotel check-in' }],
    max_tokens: 4000,
})
.on('text', (text) => {
    // Real-time streaming to UI
    sendToClient(text);
})
.on('message', (message) => {
    // Complete artifact
    storeArtifact(message);
});
```

### CopilotKit (React Hooks)
```typescript
// Retrieved from MCP context7: /copilotkit/copilotkit
import { useCoAgent, useCoAgentStateRender } from '@copilotkit/react-core';

// Manage agent state
const { state, setState, run } = useCoAgent<CheckInState>({
    name: 'hotel_checkin_agent',
    initialState: { step: 'guest_info' }
});

// Custom progress visualization
useCoAgentStateRender<CheckInState>({
    name: 'hotel_checkin_agent',
    render: ({ state, nodeName, status }) => {
        return <ProgressBar step={state.step} />;
    }
});
```

## Next: Phase 2 - Backend Streaming API

### What's Coming (3-4 hours)
1. **API Endpoint:** `POST /api/coagent/generate`
2. **Streaming Integration:** Real-time artifact generation
3. **Artifact Storage:** In-memory → database
4. **Context Management:** Conversation history

### Phase 3 - CopilotKit Frontend (3-4 hours)
1. **React Components:** `useCoAgent` hook integration
2. **Progress Visualization:** Real-time generation display
3. **Artifact Display:** Syntax highlighting, copy button
4. **Workflow Connection:** Link to ERPNext actions

## Testing Your Changes

### Quick Test
```bash
cd services/agent-gateway
npm run type-check   # ✅ Should pass
npm run build        # ✅ Should compile
```

### Manual Test
```typescript
// In your test file
import { DeveloperCoAgent, ArtifactType } from './src/coagents';

const agent = new DeveloperCoAgent(provider);
const result = await agent.generateResponse({
    prompt: "Create hotel check-in form",
    artifactType: ArtifactType.ERPNEXT_HOTEL_CHECKIN
});

console.log(result.artifacts.length); // Should be 1 (not 3)
console.log(result.artifacts[0].approach); // Should have ERPNext description
```

## Key Benefits

### For Users
- ✅ **No Confusion:** Single recommended solution
- ✅ **Best Practices:** ERPNext conventions enforced
- ✅ **Faster:** No need to compare 3 alternatives
- ✅ **Professional:** Production-ready code

### For Developers
- ✅ **Simpler Code:** No variant parsing logic
- ✅ **Domain Focus:** ERPNext expertise embedded
- ✅ **Lower Costs:** 33% token reduction (6K → 4K)
- ✅ **Easy Extension:** Add new ERPNext types easily

### For System
- ✅ **Performance:** Single solution faster to generate
- ✅ **Maintainability:** Focused codebase
- ✅ **Testability:** Clear expected output
- ✅ **Scalability:** Ready for streaming

## Questions?

**Q: Can I still generate multiple alternatives?**  
A: No, the system now generates **1 best-practice solution** following ERPNext conventions. This aligns with the SaaS vision of providing expert recommendations, not confusing alternatives.

**Q: What if I need a different approach?**  
A: Use the refinement flow (Phase 4) or provide more specific constraints in your prompt.

**Q: Are the old artifact types still supported?**  
A: Yes! All original types (CODE, REACT_COMPONENT, PYTHON, etc.) still work. We've added 6 new ERPNext-specific types on top.

**Q: When will streaming be available?**  
A: Phase 2 (next step) implements Anthropic SDK streaming with real-time updates.

---

**Status:** ✅ Phase 1 Complete - Ready for Phase 2  
**Next:** Backend Streaming API with Anthropic SDK  
**Timeline:** 10-14 hours total (3 phases)
