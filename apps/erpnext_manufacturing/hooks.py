"""
Manufacturing ERPNext App - Hooks Configuration
Registers Client Scripts for copilot button injection
"""

app_name = "erpnext_manufacturing"
app_title = "Manufacturing"
app_publisher = "ERPNext Coagents"
app_description = "ERPNext Manufacturing with AI Coagent Assistance"
app_icon = "octicon octicon-tools"
app_color = "orange"
app_email = "support@erpnext-coagents.com"
app_license = "MIT"

# Client Scripts registration
doctype_js = {
    "Work Order": "erpnext_manufacturing/client_scripts/work_order.js",
    "BOM": "erpnext_manufacturing/client_scripts/bom.js",
    "Material Request": "erpnext_manufacturing/client_scripts/material_request.js",
}

# Fixtures for seed data
fixtures = [
    {
        "doctype": "Custom Field",
        "filters": [["dt", "in", ["Work Order", "BOM", "Material Request"]]],
    }
]
