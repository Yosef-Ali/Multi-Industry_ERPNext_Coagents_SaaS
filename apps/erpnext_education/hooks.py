"""
Education ERPNext App - Hooks Configuration
Registers Client Scripts for copilot button injection
"""

app_name = "erpnext_education"
app_title = "Education Management"
app_publisher = "ERPNext Coagents"
app_description = "ERPNext Education Management with AI Coagent Assistance"
app_icon = "octicon octicon-mortar-board"
app_color = "teal"
app_email = "support@erpnext-coagents.com"
app_license = "MIT"

# Client Scripts registration
doctype_js = {
    "Student Applicant": "erpnext_education/client_scripts/student_applicant.js",
    "Student": "erpnext_education/client_scripts/student.js",
    "Program Enrollment": "erpnext_education/client_scripts/program_enrollment.js",
}

# Fixtures for seed data
fixtures = [
    {
        "doctype": "Custom Field",
        "filters": [["dt", "in", ["Student Applicant", "Student", "Program Enrollment"]]],
    }
]
