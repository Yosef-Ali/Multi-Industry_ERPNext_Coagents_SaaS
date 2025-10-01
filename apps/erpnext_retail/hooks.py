"""
Retail ERPNext App - Hooks Configuration
Registers Client Scripts for copilot button injection
"""

app_name = "erpnext_retail"
app_title = "Retail Management"
app_publisher = "ERPNext Coagents"
app_description = "ERPNext Retail Management with AI Coagent Assistance"
app_icon = "octicon octicon-package"
app_color = "purple"
app_email = "support@erpnext-coagents.com"
app_license = "MIT"

# Client Scripts registration
doctype_js = {
    "Sales Order": "erpnext_retail/client_scripts/sales_order.js",
    "Delivery Note": "erpnext_retail/client_scripts/delivery_note.js",
    "Stock Entry": "erpnext_retail/client_scripts/stock_entry.js",
}

# Fixtures for seed data
fixtures = [
    {
        "doctype": "Custom Field",
        "filters": [["dt", "in", ["Sales Order", "Delivery Note", "Stock Entry"]]],
    }
]
