"""
Hotel Management ERPNext App - Hooks Configuration
Registers Client Scripts for copilot button injection
"""

app_name = "erpnext_hotel"
app_title = "Hotel Management"
app_publisher = "ERPNext Coagents"
app_description = "ERPNext Hotel Management with AI Coagent Assistance"
app_icon = "octicon octicon-hotel"
app_color = "blue"
app_email = "support@erpnext-coagents.com"
app_license = "MIT"

# Client Scripts registration
# Maps DocType names to JavaScript file paths
# These scripts add the Copilot AI Assistant button to forms
doctype_js = {
    "Hotel Reservation": "public/js/reservation.js",
    "Sales Invoice": "public/js/invoice.js",
}

# Fixtures for seed data
fixtures = [
    {
        "doctype": "Custom Field",
        "filters": [["dt", "in", ["Reservation", "Invoice"]]],
    }
]
