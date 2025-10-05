# CopilotKit CoAgents - Quick Reference

**Quick start guide for using CopilotKit CoAgents with LangGraph workflows**

---

## 🚀 Quick Start

### 1. Start All Services

```bash
# Single command to start everything
./start-all.sh

# Or manually:
# Terminal 1: Workflow service
cd services/workflows && python src/server.py

# Terminal 2: Agent gateway
cd services/agent-gateway && npm run dev

# Terminal 3: Frontend
cd frontend/coagent && npm run dev
```

### 2. Test a Workflow

Visit `http://localhost:3001` and chat:
```
"Check in guest John Doe for room 101"
```

Expected: Approval dialog appears → Click Approve → Workflow completes

---

## 📚 Usage Patterns

### Pattern 1: Using Workflow CoAgent Hook

```typescript
import { useHotelO2CAgent } from '@/hooks/useWorkflowCoAgent';

function HotelDashboard() {
  const { agentState } = useHotelO2CAgent({
    reservation_id: 'RES-001',
    guest_name: 'John Doe',
  });

  // agentState automatically syncs with LangGraph workflow
  return <div>Folio ID: {agentState.folio_id}</div>;
}
```

### Pattern 2: Rendering Workflow Progress

```typescript
import { EventStream } from '@/components/EventStream';

function WorkflowPanel() {
  return (
    <EventStream
      events={events}
      isStreaming={isStreaming}
      agentName="hotel_o2c"  // Enables CoAgent state rendering
    />
  );
}
```

### Pattern 3: Approval Gates (Already Integrated)

```typescript
// This is already set up in ApprovalDialogContainer
// Just include it in your App:

import { ApprovalDialogContainer } from '@/components/ApprovalDialog';

function App() {
  return (
    <>
      {/* Your app content */}
      <ApprovalDialogContainer />  {/* Handles all approvals */}
    </>
  );
}
```

---

## 🔧 Available Workflow Hooks

```typescript
// Hotel
import { useHotelO2CAgent } from '@/hooks/useWorkflowCoAgent';
const { agentState } = useHotelO2CAgent({ reservation_id: 'RES-001' });

// Hospital
import { useHospitalAdmissionsAgent } from '@/hooks/useWorkflowCoAgent';
const { agentState } = useHospitalAdmissionsAgent({ patient_id: 'P-001' });

// Manufacturing
import { useManufacturingProductionAgent } from '@/hooks/useWorkflowCoAgent';
const { agentState } = useManufacturingProductionAgent({ item_code: 'ITEM-001' });

// Retail
import { useRetailFulfillmentAgent } from '@/hooks/useWorkflowCoAgent';
const { agentState } = useRetailFulfillmentAgent({ customer_name: 'John' });

// Education
import { useEducationAdmissionsAgent } from '@/hooks/useWorkflowCoAgent';
const { agentState } = useEducationAdmissionsAgent({ applicant_name: 'Jane' });
```

---

## 🎨 Workflow State Structure

All workflows share this base structure:

```typescript
interface WorkflowAgentState {
  // Progress tracking
  current_step?: string;
  steps_completed?: string[];

  // Approval state
  pending_approval?: boolean;
  approval_operation?: string;

  // Workflow-specific fields
  [key: string]: any;
}
```

### Example States

**Hotel O2C**:
```typescript
{
  reservation_id: "RES-001",
  guest_name: "John Doe",
  room_number: "101",
  folio_id: "FOLIO-001",
  invoice_id: "INV-001",
  current_step: "create_folio",
  steps_completed: ["Validate reservation", "Check in guest"],
  pending_approval: true,
  approval_operation: "create_folio"
}
```

**Manufacturing Production**:
```typescript
{
  item_code: "ITEM-001",
  qty_to_produce: 100,
  work_order_id: "WO-001",
  material_shortage: true,
  current_step: "quality_inspection",
  steps_completed: ["Check materials", "Create work order"],
  pending_approval: true,
  approval_operation: "approve_production"
}
```

---

## 🔗 API Endpoints

### CopilotKit Runtime
- **URL**: `http://localhost:3000/api/copilotkit`
- **Method**: POST
- **Used by**: Frontend CopilotKit provider

### Workflow Service
- **URL**: `http://localhost:8001`
- **Endpoints**:
  - `GET /workflows` - List all workflows
  - `POST /execute` - Execute workflow
  - `POST /resume` - Resume after approval

### Health Checks
```bash
# Workflow service
curl http://localhost:8001/

# CopilotKit runtime
curl http://localhost:3000/api/copilotkit

# Agent gateway
curl http://localhost:3000/health
```

---

## 🐛 Troubleshooting

### Issue: Workflow doesn't start
**Solution**: Check workflow service is running
```bash
curl http://localhost:8001/workflows
```

### Issue: Approval dialog doesn't appear
**Solution**: Verify ApprovalDialogContainer is in App
```typescript
<ApprovalDialogContainer />  // Must be included
```

### Issue: State not updating
**Solution**: Ensure agentName is set
```typescript
<EventStream agentName="hotel_o2c" />  // Required for state sync
```

### Issue: CORS errors
**Solution**: Check gateway URL in frontend
```typescript
// .env.local
NEXT_PUBLIC_GATEWAY_URL=http://localhost:3000
```

---

## 📦 Dependencies

### Frontend
```json
{
  "@copilotkit/react-core": "^1.10.5",
  "@copilotkit/react-ui": "^1.10.5"
}
```

### Agent Gateway
```json
{
  "@copilotkit/runtime": "^1.10.5"
}
```

### Workflow Service
```python
langgraph>=0.2.0
fastapi>=0.104.0
```

---

## 🚀 Deployment URLs

### Development
- Frontend: `http://localhost:3001`
- Agent Gateway: `http://localhost:3000`
- Workflow Service: `http://localhost:8001`

### Production (Example)
- Frontend: `https://erpnext-coagent-ui.pages.dev`
- Agent Gateway: `https://erpnext-agent-gateway.workers.dev`
- Workflow Service: `https://erpnext-workflows.onrender.com`

---

## 📚 Documentation Links

- **Main Integration Guide**: `COPILOTKIT_COAGENTS_INTEGRATION.md`
- **Complete Implementation**: `COPILOTKIT_INTEGRATION_COMPLETE.md`
- **Deployment**: `DEPLOYMENT_QUICKSTART.md`
- **LangGraph Best Practices**: `LANGGRAPH_BEST_PRACTICES.md`

---

## ✅ Checklist for New Workflows

When adding a new workflow with CoAgent integration:

- [ ] Create LangGraph workflow in `services/workflows/src/{industry}/`
- [ ] Use `interrupt()` for approval gates
- [ ] Register in `services/workflows/src/core/registry.py`
- [ ] Add to `services/agent-gateway/src/api/copilotkit/route.ts` agents list
- [ ] Create hook in `frontend/coagent/src/hooks/useWorkflowCoAgent.ts`
- [ ] Test approval flow end-to-end

---

**Need Help?** See full documentation in `COPILOTKIT_INTEGRATION_COMPLETE.md`
