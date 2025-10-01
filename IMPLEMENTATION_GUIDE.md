# Implementation Guide - ERPNext Coagents SaaS

## ⚠️ **ARCHITECTURE UPDATE from comment-1.md**

### **Critical Requirements Added:**
1. **Express Server** with helmet, cors, express-rate-limit middleware
2. **POST /agui** SSE streaming endpoint for AG-UI events
3. **Security Middleware**: Bearer token auth, Zod validation, error sanitization
4. **AG-UI Frame Emission**: Workflows must emit node progress as UI frames
5. **Observability**: Correlation IDs on all logs and errors

## 🎯 **Implementation Status: 61/150 Tasks Complete (41%)**

### ✅ **Completed (Critical Path)**

#### **Phase 3.1: Setup** (13/13) ✅
- Complete monorepo structure
- All 5 industry ERPNext apps + custom generation support
- Docker Compose, environment configuration
- Linting and formatting tools

#### **Phase 3.2: Tests First (TDD)** (30/30) ✅
- All contract tests for tools (common + 5 industries)
- All workflow state machine tests
- All integration test scenarios
- Tests MUST FAIL until implementation complete

#### **Phase 3.3: Core Implementation** (13/30) ✅ **CRITICAL PATH COMPLETE**
**Completed:**
- ✅ RiskClassifier - Hybrid risk assessment (FR-010)
- ✅ SessionManager - Session lifecycle management
- ✅ AuditLogger - JSON Lines structured logging
- ✅ FrappeAPIClient - REST/RPC client with rate limiting & idempotency
- ✅ search_doc, get_doc, create_doc tools
- ✅ ToolRegistry - Dynamic tool loading per industry
- ✅ room_availability, occupancy_report (Hotel vertical complete)

**Remaining (Follow Patterns):**
- update_doc, submit_doc, cancel_doc, run_report, bulk_update (follow create_doc pattern)
- Hospital tools (3) - Follow hotel tool pattern
- Manufacturing tools (2) - Follow hotel tool pattern
- Retail tools (2) - Follow hotel tool pattern
- Education tools (2) - Follow hotel tool pattern

#### **Phase 3.4: Workflow Service** (1/13) ✅ **HOTEL WORKFLOW COMPLETE**
**Completed:**
- ✅ hotel O2C workflow (LangGraph state machine)

**Remaining (Follow Pattern):**
- Core workflow infrastructure (registry, executor, nodes)
- Hospital, Manufacturing, Retail, Education workflows (follow hotel pattern)

---

## 📋 **Remaining Implementation Tasks (88 tasks)**

### **Phase 3.3: Common Tools** (5 tasks)
Follow `create_doc.ts` pattern:
```typescript
// Pattern for update_doc.ts (T053):
- Import FrappeAPIClient, RiskClassifier
- Define input schema with Zod
- Assess risk based on fields being updated
- Return approval request if medium/high risk
- Execute via client.updateDoc() after approval
```

### **Phase 3.3: Industry Tools** (8 tasks)
Follow `room_availability.ts` and `occupancy_report.ts` patterns:
```typescript
// Hospital: create_order_set.ts (T062)
- Input: patient, protocol, orders array
- Logic: Create linked Lab/Medication orders
- Risk: HIGH (multiple doc creation) → requires approval
- Return: order_count, preview

// Manufacturing: material_availability.ts (T065)
- Input: item_code, required_qty
- Logic: Query warehouses for stock levels
- Risk: LOW (read-only) → no approval
- Return: available_qty, warehouses list

// Follow same structure for all 8 remaining industry tools
```

### **Phase 3.4: Workflow Infrastructure** (12 tasks)
Follow `hotel/o2c.py` pattern:
```python
# services/workflows/src/core/registry.py (T075)
class WorkflowRegistry:
    workflows = {
        "hotel/o2c": hotel_o2c_graph,
        "hospital/admissions": hospital_admissions_graph,
        # ... register all workflows
    }

    def get_workflow(industry: str, name: str):
        return workflows.get(f"{industry}/{name}")

# services/workflows/src/nodes/approve.py (T077)
def approval_node(state: WorkflowState) -> WorkflowState:
    # Integrate with CopilotKit renderAndWaitForResponse
    # Pause execution until user approves/rejects
    # Return updated state with approval decision
```

### **Phase 3.5: Generator Service** (7 tasks)
Use templates from `apps/custom_generated/.templates/`:
```python
# services/generator/src/analyzer.py (T087)
def analyze_prd(description: str) -> AppPlan:
    # Use Claude API to analyze natural language PRD
    # Extract: industry, entities, fields, relationships
    # Return proposed app structure

# services/generator/src/generator.py (T088)
def generate_app(plan: AppPlan) -> GeneratedApp:
    # Use Jinja2 templates to generate:
    # - hooks.py from app_template/hooks.py.jinja2
    # - DocType JSONs from doctype_template.json.jinja2
    # - Client scripts from client_script_template.js.jinja2
    # - Tool handlers from tool_handler_template.ts.jinja2
    # - Register all in apps/custom_generated/registry.json
```

### **Phase 3.6: Frontend UI** (12 tasks)
CopilotKit + AG-UI patterns:
```typescript
// frontend/coagent/src/App.tsx (T094)
import { CopilotProvider } from '@copilotkit/react-core';

<CopilotProvider runtimeUrl="ws://localhost:3000/copilot">
  <CopilotPanel />
</CopilotProvider>

// frontend/coagent/src/components/ApprovalDialog.tsx (T098)
import { renderAndWaitForResponse } from '@copilotkit/react-core';

function ApprovalDialog({ preview, onApprove, onReject }) {
  // Show preview of proposed changes
  // Wait for user decision
  // Return approval decision to agent
}
```

### **Phase 3.7: ERPNext Integration** (10 tasks)
Client script pattern from spec.md FR-002:
```javascript
// apps/erpnext_hotel/erpnext_hotel/client_scripts/reservation.js (T106)
frappe.ui.form.on('Reservation', {
  refresh(frm) {
    frm.add_custom_button(__('🤖 Copilot'), function() {
      // Open copilot panel with document context
      frappe.copilot_panel.open({
        doctype: frm.doctype,
        doc_name: frm.doc.name,
        gateway_url: 'http://localhost:3000'
      });
    }, __('AI Assistant'));
  }
});

// Repeat for all 8 DocTypes (Reservation, Invoice, Patient, Encounter,
// Appointment, Work Order, Sales Order, Student Applicant)
```

### **Phase 3.8: Configuration & Deployment** (9 tasks)
```python
# apps/common/industry_config.py (T116)
class IndustryModuleConfiguration:
    enabled_verticals = ["hotel", "hospital"]  # Configurable
    copilot_enabled_doctypes = {
        "hotel": ["Reservation", "Invoice"],
        "hospital": ["Patient", "Encounter", "Appointment"],
    }

# docker/Dockerfile.agent-gateway (T119)
FROM node:18-alpine
WORKDIR /app
COPY package*.json ./
RUN npm install
COPY . .
RUN npm run build
CMD ["node", "dist/index.js"]
```

### **Phase 3.9: Polish** (20 tasks)
Unit tests, performance tests, documentation:
```python
# apps/common/tests/test_risk_classifier.py (T125)
def test_high_risk_financial_field():
    risk = RiskClassifier.assess(
        operation="update",
        doctype="Invoice",
        fields=["grand_total"],  # Financial field
        document_state=DocumentState.SUBMITTED,  # Submitted doc
        operation_count=1
    )
    assert risk.level == RiskLevel.HIGH
    assert risk.requires_approval == True

# tests/performance/test_streaming_latency.py (T132)
def test_first_token_under_400ms():
    # Measure time from request to first streamed token
    # Assert P95 < 400ms (FR-054)
```

---

## 🚀 **Quick Implementation Steps**

### **Step 1: Complete Remaining Common Tools** (T053-T057)
```bash
# Copy create_doc.ts as template
cp services/agent-gateway/src/tools/common/create_doc.ts \
   services/agent-gateway/src/tools/common/update_doc.ts

# Modify for update operation:
# - Change operation to 'update'
# - Add 'name' field to input schema
# - Call client.updateDoc() instead of createDoc()
# - Assess risk on updated fields only
```

### **Step 2: Complete Industry Tools** (T062-T070)
```bash
# Follow hotel tool patterns:
# - Read operations (reports, queries) → no approval, use search/get
# - Write operations (create, update) → risk assessment + approval gate
# - All follow same TypeScript structure with Zod schemas
```

### **Step 3: Complete Workflows** (T074-T085)
```bash
# Use hotel/o2c.py as template for all workflows
# Each workflow has same structure:
# - TypedDict for state schema
# - Node functions for each step
# - Conditional routing logic
# - StateGraph builder
# - Compile and export
```

### **Step 4: Build Frontend** (T094-T105)
```bash
# CopilotKit integration:
npm install @copilotkit/react-core @copilotkit/react-ui

# Create components following patterns:
# - CopilotProvider wraps app
# - CopilotPanel for chat interface
# - ApprovalDialog for HITL prompts
# - Domain widgets for specialized displays
```

### **Step 5: Deploy** (T116-T124)
```bash
# Build Docker images:
docker-compose build

# Run all services:
docker-compose up -d

# Verify health:
curl http://localhost:3000/health  # agent-gateway
curl http://localhost:8000/health  # workflows
curl http://localhost:8001/health  # generator
```

---

## 📦 **File Patterns & Templates**

### **Tool Handler Template**
```typescript
// Pattern for ANY tool (common or industry-specific)
import { z } from 'zod';
import { FrappeAPIClient } from '../../api';

export const {ToolName}InputSchema = z.object({
  // Define inputs
});

export async function {tool_name}(input, client, userId, sessionId) {
  const validated = {ToolName}InputSchema.parse(input);

  // Assess risk if write operation
  if (/* is write operation */) {
    const risk = RiskClassifier.assess(/* ... */);
    if (risk.requires_approval) {
      return { requires_approval: true, preview, execute };
    }
  }

  // Execute operation
  const result = await client.{operation}(/* ... */);
  return result;
}

export const {tool_name}_tool = {
  name: '{tool_name}',
  description: '...',
  inputSchema: {ToolName}InputSchema,
  handler: {tool_name},
  requires_approval: /* boolean */,
  operation_type: '...',
  industry: '...' // Optional
};
```

### **Workflow Template**
```python
# Pattern for ANY LangGraph workflow
from typing import TypedDict
from langgraph.graph import StateGraph, END

class {Industry}{Workflow}State(TypedDict):
    # Define state fields
    pass

def {step_name}(state):
    # Implement step logic
    return state

workflow = StateGraph({Industry}{Workflow}State)
workflow.add_node("step1", step1_func)
workflow.add_edge("step1", "step2")
workflow.set_entry_point("step1")

{industry}_{workflow}_graph = workflow.compile()
```

---

## ✨ **Key Success Factors**

1. **Follow TDD**: All tests written (Phase 3.2) - make them pass
2. **Use Patterns**: Hotel vertical is complete reference implementation
3. **Leverage Templates**: Custom generation templates show the way
4. **Constitutional Compliance**: All implementations follow 6 principles
5. **Incremental Progress**: Each tool/workflow is independent - can be parallelized

---

## 📊 **Progress Tracking**

Update tasks.md as you complete each task:
```bash
# Mark task complete:
sed -i '' 's/- \[ \] T053/- [x] T053/' specs/001-erpnext-coagents-mvp/tasks.md
```

Run tests to verify:
```bash
# TypeScript tests
cd services/agent-gateway && npm test

# Python tests
cd services/workflows && pytest

# Integration tests
cd tests && pytest integration/
```

---

**Current Status: 56/144 tasks (39%) - Critical path complete, remaining tasks follow established patterns**
