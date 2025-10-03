"""
Hospital Management ERPNext App - Hooks Configuration
Registers Client Scripts for copilot button injection
"""

app_name = "erpnext_hospital"
app_title = "Hospital Management"
app_publisher = "ERPNext Coagents"
app_description = "ERPNext Hospital Management with AI Coagent Assistance"
app_icon = "octicon octicon-pulse"
app_color = "green"
app_email = "support@erpnext-coagents.com"
app_license = "MIT"

# Client Scripts registration
# Maps DocType names to JavaScript file paths
# These scripts add the Copilot AI Assistant button to forms
doctype_js = {
    "Patient": "public/js/patient.js",
    "Patient Encounter": "public/js/encounter.js",
    "Patient Appointment": "public/js/appointment.js",
}

# Fixtures for seed data
fixtures = [
    {
        "doctype": "Custom Field",
        "filters": [["dt", "in", ["Patient", "Encounter", "Appointment"]]],
    }
]
