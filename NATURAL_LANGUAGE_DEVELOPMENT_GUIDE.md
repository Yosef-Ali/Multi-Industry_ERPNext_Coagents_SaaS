## 💡 Advanced Usage Tips

### 1. **Iterative Development**

Start simple, then enhance:

```
Turn 1: "Create a basic invoice system"
Turn 2: "Add payment tracking"
Turn 3: "Include tax calculation"
Turn 4: "Add PDF generation"
Turn 5: "Connect to accounting"
```

### 2. **Combining Features**

```
"Create a customer portal with:
- Order history
- Invoice download
- Support tickets
- Live chat"
```

### 3. **Specific Customizations**

```
"Make the status field show:
- Green for completed
- Yellow for pending
- Red for cancelled"

"Add a button that sends WhatsApp message to customer"

"Create a dashboard widget showing today's revenue"
```

### 4. **Integration Requests**

```
"Connect to Stripe for payments"
"Integrate with Twilio for SMS"
"Sync with Google Calendar"
"Export to QuickBooks"
"Connect to Shopify"
```

---

## 🎓 Learning Examples

### Beginner: Simple Contact Manager

**Prompt:**
```
"Create a simple contact manager with name, email, and phone"
```

**Generated:**
```json
{
  "doctype": "Contact",
  "fields": [
    {
      "fieldname": "contact_name",
      "label": "Full Name",
      "fieldtype": "Data",
      "reqd": 1
    },
    {
      "fieldname": "email",
      "label": "Email",
      "fieldtype": "Data",
      "options": "Email"
    },
    {
      "fieldname": "phone",
      "label": "Phone",
      "fieldtype": "Data",
      "options": "Phone"
    }
  ]
}
```

### Intermediate: Event Management

**Prompt:**
```
"Create an event management system with:
- Event registration
- Ticket sales
- Email confirmations
- Check-in system"
```

**Generated System:**
- Event DocType
- Attendee DocType
- Ticket DocType
- Registration workflow
- Email templates
- Check-in mobile app

### Advanced: Complete ERP Module

**Prompt:**
```
"Build a complete gym management system with:
- Member subscriptions
- Class scheduling
- Trainer assignments
- Payment processing
- Attendance tracking
- Equipment maintenance
- Analytics dashboard"
```

**Generated:**
- 8 DocTypes
- 5 Workflows
- 12 Reports
- 15 Custom tools
- Mobile app
- Member portal
- Admin dashboard

---

## 🔧 Technical Details

### What Gets Generated

#### 1. **DocType JSON**
```json
{
  "creation": "2025-01-06 10:30:00",
  "doctype": "DocType",
  "engine": "InnoDB",
  "field_order": [
    "section_basic",
    "student_name",
    "email",
    "grade"
  ],
  "fields": [
    {
      "fieldname": "section_basic",
      "fieldtype": "Section Break",
      "label": "Basic Information"
    },
    {
      "fieldname": "student_name",
      "fieldtype": "Data",
      "in_list_view": 1,
      "label": "Student Name",
      "reqd": 1
    }
  ],
  "permissions": [
    {
      "role": "Student Admin",
      "read": 1,
      "write": 1,
      "create": 1
    }
  ]
}
```

#### 2. **Python Controller**
```python
# -*- coding: utf-8 -*-
import frappe
from frappe.model.document import Document

class Student(Document):
    def validate(self):
        """Validation logic"""
        self.validate_age()
        self.validate_email()
        self.generate_student_id()
    
    def validate_age(self):
        if self.age < 5:
            frappe.throw("Student must be at least 5 years old")
    
    def validate_email(self):
        if self.email and not frappe.utils.validate_email_address(self.email):
            frappe.throw("Invalid email address")
    
    def generate_student_id(self):
        if not self.student_id:
            # Auto-generate: STU-YYYY-NNNN
            year = frappe.utils.now()[:4]
            last_id = frappe.db.sql("""
                SELECT student_id FROM tabStudent 
                WHERE student_id LIKE 'STU-{year}-%' 
                ORDER BY creation DESC LIMIT 1
            """.format(year=year))
            
            if last_id:
                num = int(last_id[0][0].split('-')[-1]) + 1
            else:
                num = 1
            
            self.student_id = f"STU-{year}-{num:04d}"
    
    def on_submit(self):
        """Post-submission logic"""
        self.send_welcome_email()
        self.create_user_account()
    
    def send_welcome_email(self):
        frappe.sendmail(
            recipients=[self.email],
            subject="Welcome to School",
            message=self.get_welcome_message()
        )
```

#### 3. **Client Script (JavaScript)**
```javascript
frappe.ui.form.on('Student', {
    refresh: function(frm) {
        // Add custom button
        if (frm.doc.docstatus === 1) {
            frm.add_custom_button(__('Generate ID Card'), function() {
                generate_id_card(frm);
            });
        }
        
        // Set query for dependent fields
        frm.set_query('class', function() {
            return {
                filters: {
                    'grade': frm.doc.grade,
                    'status': 'Active'
                }
            };
        });
    },
    
    grade: function(frm) {
        // Clear class when grade changes
        frm.set_value('class', '');
    },
    
    validate: function(frm) {
        // Client-side validation
        if (frm.doc.age && frm.doc.age < 5) {
            frappe.msgprint(__('Student must be at least 5 years old'));
            frappe.validated = false;
        }
    }
});

function generate_id_card(frm) {
    frappe.call({
        method: 'erpnext_school.api.generate_id_card',
        args: {
            student: frm.doc.name
        },
        callback: function(r) {
            if (r.message) {
                window.open(r.message.url);
            }
        }
    });
}
```

#### 4. **Workflow YAML**
```yaml
name: Student Admission Workflow
document_type: Admission
is_active: 1

states:
  - state: Draft
    doc_status: 0
    allow_edit: Admin, Admission Officer
    
  - state: Under Review
    doc_status: 0
    allow_edit: Admission Officer
    
  - state: Approved
    doc_status: 1
    allow_edit: None
    
  - state: Rejected
    doc_status: 2
    allow_edit: None

transitions:
  - state: Draft
    action: Submit for Review
    next_state: Under Review
    allowed: Admission Officer
    
  - state: Under Review
    action: Approve
    next_state: Approved
    allowed: Principal
    
  - state: Under Review
    action: Reject
    next_state: Rejected
    allowed: Principal
```

---

## 📊 Real-World Use Cases

### Case 1: Rapid Prototype for Client Demo

**Scenario:** Client wants to see a working prototype before committing.

**Solution:**
```
1. Chat: "Create a real estate property listing system"
2. Choose: Simple variant (5 minutes)
3. Review: Check generated code
4. Deploy: Install to demo ERPNext
5. Present: Show working system to client
```

**Time Saved:** Days → Minutes

### Case 2: Custom Industry Solution

**Scenario:** Need specialized veterinary clinic software.

**Conversation:**
```
You: "Create a veterinary clinic management system"

AI: "I'll create a vet clinic system with:
- Pet records
- Owner information  
- Appointments
- Medical history
- Prescriptions
- Billing"

You: "Add vaccine tracking and reminders"

AI: "Added:
- Vaccine schedule DocType
- Auto-reminders 30 days before due
- Email/SMS notifications"

You: "Include grooming appointments"

AI: "Added:
- Grooming service DocType
- Separate appointment type
- Grooming history tracking"
```

**Result:** Complete custom solution in 20 minutes

### Case 3: Adding Features to Existing App

**Scenario:** Existing school app needs online exam feature.

**Prompt:**
```
"Add online exam system to my school app with:
- Question bank
- Exam scheduling
- Auto-grading for MCQs
- Result publishing
- Parent notifications"
```

**Generated:**
- Integrates with existing Student DocType
- Creates new Exam, Question, Result DocTypes
- Adds exam portal for students
- Generates result reports

---

## 🎯 Best Practices

### 1. **Start with Clear Requirements**

❌ Bad:
```
"Make something for a school"
```

✅ Good:
```
"Create a student enrollment system with:
- Student registration form
- Document upload (birth certificate, photo)
- Admission approval workflow
- Fee structure assignment
- Email notifications to parents"
```

### 2. **Use Iterative Approach**

```
Session 1: Core functionality
Session 2: Add workflows
Session 3: Add reports
Session 4: Add integrations
```

### 3. **Specify Industry Context**

```
"Create an inventory system for a pharmacy"
```
vs
```
"Create an inventory system for a construction company"
```

AI adapts fields, workflows, and reports accordingly!

### 4. **Ask for Specific Variants**

```
"Show me only the Advanced version with all features"
```

or

```
"Generate Simple and Standard versions, skip Advanced"
```

### 5. **Request Explanations**

```
"Explain the workflow logic"
"Show me how the validation works"
"What triggers the email notification?"
```

---

## 🔒 Security & Permissions

### Auto-Generated Security

Every DocType gets proper permissions:

```python
# Generated Permissions
{
    "roles": [
        {
            "role": "System Manager",
            "read": 1,
            "write": 1,
            "create": 1,
            "delete": 1
        },
        {
            "role": "Student Admin",
            "read": 1,
            "write": 1,
            "create": 1
        },
        {
            "role": "Teacher",
            "read": 1
        }
    ]
}
```

### Field-Level Security

```python
# Salary field only visible to HR
{
    "fieldname": "salary",
    "permlevel": 1  # Requires higher permission
}
```

### User-Specific Filters

```python
# Teachers see only their students
if frappe.session.user != "Administrator":
    filters["teacher"] = frappe.session.user
```

---

## 📱 Mobile & Responsive

All generated apps are mobile-ready:

- Responsive forms
- Touch-friendly buttons
- Mobile list views
- Camera integration
- GPS location
- Push notifications

---

## 🎨 Customization After Generation

### You Can Modify:

1. **Field Properties**
   - Change labels
   - Add/remove fields
   - Modify validations

2. **Workflows**
   - Add approval steps
   - Change state names
   - Modify permissions

3. **Reports**
   - Add columns
   - Change filters
   - Update charts

4. **UI/UX**
   - Custom CSS
   - Button placements
   - Form layouts

### Export & Version Control

```bash
# Export generated app
bench export-fixtures

# Add to git
git add apps/erpnext_school/
git commit -m "Generated school management app"
```

---

## 🚀 Quick Start Guide

### Step 1: Open Developer Chat
```
http://localhost:3000/developer
```

### Step 2: Try These Starter Prompts

**For Learning:**
```
"Create a simple todo list app"
```

**For Business:**
```
"Build a customer relationship management system"
```

**For Industry:**
```
"Create a restaurant table booking system"
```

### Step 3: Choose Variant

Select Simple, Standard, or Advanced based on your needs.

### Step 4: Review & Deploy

- Check generated code
- Review DocTypes
- Verify workflows
- Click "Deploy to ERPNext"

### Step 5: Test & Iterate

- Test in your ERPNext instance
- Ask for modifications
- Add more features
- Export final app

---

## 📖 More Examples

### E-Commerce
```
"Create a product catalog with:
- Product variations (size, color)
- Inventory tracking
- Shopping cart
- Order processing
- Payment integration
- Shipment tracking"
```

### Healthcare
```
"Build a telemedicine platform with:
- Doctor scheduling
- Video consultation
- Prescription management
- Patient records
- Billing"
```

### Real Estate
```
"Create a property management system with:
- Property listings
- Tenant management
- Lease agreements
- Maintenance requests
- Rent collection"
```

---

## 🎓 Video Tutorials (Coming Soon)

1. **Getting Started** (5 min)
   - First conversation
   - Understanding variants
   - Deploying your app

2. **Building a School App** (15 min)
   - Complete walkthrough
   - Adding features iteratively
   - Testing and deployment

3. **Advanced Features** (20 min)
   - Complex workflows
   - Integrations
   - Custom reports

---

## 🤝 Support & Community

- **Documentation:** Full docs at `/docs`
- **Examples:** Sample conversations at `/examples`
- **Issues:** Report at GitHub
- **Discord:** Join our community

---

## ✨ What Makes This Different

### Traditional Development:
```
1. Learn ERPNext framework (weeks)
2. Study DocType structure
3. Write Python code
4. Write JavaScript code
5. Create workflows manually
6. Test extensively
7. Deploy carefully

Time: Days to weeks
```

### With Natural Language:
```
1. Describe what you want (minutes)
2. Choose complexity level
3. Review generated code
4. Deploy

Time: Minutes to hours
```

---

## 🎉 Success Stories

### "Built a complete gym management system in 30 minutes"
*- Fitness Studio Owner*

### "Deployed custom inventory app for 5 different clients in one day"
*- ERPNext Consultant*

### "Prototyped client's requirement during the first meeting"
*- Software Agency*

---

## 🚀 Ready to Start?

Open the developer chat and type your first command!

**Try this:**
```
"Create a simple customer feedback system"
```

And watch the magic happen! ✨

---

**Demo Page:** `http://localhost:3000/demo-workflow.html`  
**Developer Chat:** `http://localhost:3000/developer`  
**Documentation:** See this file for complete reference

**Happy Building! 🎉**