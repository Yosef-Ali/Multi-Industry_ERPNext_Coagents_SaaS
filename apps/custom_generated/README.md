# Custom Generated ERPNext Apps

This directory contains **dynamically generated ERPNext apps** created through the SaaS App Generator (FR-025 to FR-031).

## How It Works

1. **Admin submits app generation request** with natural language description
   - Example: "Telemedicine Visit module for virtual consultations"
   - Example: "Equipment Maintenance Tracker for manufacturing floor"
   - Example: "Member Loyalty Program for retail stores"

2. **Generator analyzes request** and proposes app structure
   - Detects industry context
   - Extracts entities and relationships
   - Proposes DocTypes, fields, workflows

3. **Admin reviews and approves** the generated plan

4. **System generates complete app** in this directory:
   ```
   custom_generated/
   ├── telemedicine_visits/          # Generated app example
   │   ├── hooks.py                  # Auto-generated
   │   ├── telemedicine_visits/
   │   │   ├── doctype/              # Generated DocType JSONs
   │   │   │   ├── virtual_consultation/
   │   │   │   └── telemedicine_session/
   │   │   └── client_scripts/       # Generated copilot buttons
   │   └── __init__.py
   ```

5. **Tool handlers automatically registered** with agent-gateway
   - Create, read, update, delete operations
   - Industry-specific business logic
   - Approval workflows

## Directory Structure

- `custom_generated/{app_name}/` - Each generated app is a standalone ERPNext app
- `.templates/` - Jinja2 templates used by generator service
- `registry.json` - Tracks all generated apps and their metadata

## Generated App Lifecycle

1. **Draft** - Plan created, awaiting approval
2. **Generating** - App skeleton being created
3. **Active** - App installed, tools registered with agent
4. **Archived** - App deprecated but preserved

## Integration

Generated apps are automatically:
- ✅ Registered with ERPNext app registry
- ✅ Tool handlers added to agent-gateway/tools/custom/
- ✅ Workflow templates added to workflows/graphs/custom/
- ✅ Client Scripts injected on specified DocTypes
- ✅ Available for coagent assistance immediately after generation

## Examples of Custom Industries

- **Telemedicine** (Healthcare extension)
- **Equipment Maintenance** (Manufacturing extension)
- **Loyalty Programs** (Retail extension)
- **Fleet Management** (Logistics)
- **Event Management** (Hospitality extension)
- **Research Projects** (Education extension)
- **Property Management** (Real Estate)
- **Legal Case Management** (Professional Services)
