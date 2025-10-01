# Custom Generated Tools

This directory contains **auto-generated tool handlers** from the SaaS App Generator.

## Auto-Registration

Tools in this directory are automatically:
1. ✅ Discovered by the tool registry at startup
2. ✅ Registered with the Claude Agent SDK
3. ✅ Available for coagent conversations immediately
4. ✅ Validated against contract schemas

## Directory Structure

```
custom/
├── {app_name}/                    # One directory per generated app
│   ├── create_{doctype}.ts       # Auto-generated create tool
│   ├── read_{doctype}.ts         # Auto-generated read tool
│   ├── update_{doctype}.ts       # Auto-generated update tool
│   ├── delete_{doctype}.ts       # Auto-generated delete tool
│   └── {custom_operation}.ts     # Industry-specific custom tools
└── README.md                      # This file
```

## Example: Telemedicine Visit App

```
custom/
└── telemedicine_visits/
    ├── create_virtual_consultation.ts    # Auto-generated from DocType
    ├── read_virtual_consultation.ts
    ├── update_virtual_consultation.ts
    ├── schedule_telemedicine_session.ts  # Custom business logic
    └── generate_visit_summary.ts         # AI-powered custom tool
```

## Tool Metadata

Each generated tool includes:
- **Input schema** (Zod validation)
- **Approval requirements** (based on risk assessment)
- **Frappe API mapping** (REST/RPC method)
- **Error handling** (with retry logic)
- **Audit logging** (automatic)

## Custom Tool Pattern

Generated tools follow this pattern from `.templates/tool_handler_template.ts.jinja2`:
- Input validation with Zod
- Risk assessment for write operations
- Approval gate integration
- Idempotency support
- Structured error responses
