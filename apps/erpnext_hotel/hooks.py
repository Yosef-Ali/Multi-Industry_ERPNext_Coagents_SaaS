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
doctype_js = {
    "Reservation": "erpnext_hotel/client_scripts/reservation.js",
    "Invoice": "erpnext_hotel/client_scripts/invoice.js",
}

# Fixtures for seed data
fixtures = [
    {
        "doctype": "Custom Field",
        "filters": [["dt", "in", ["Reservation", "Invoice"]]],
    }
]
