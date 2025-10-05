# 📚 Frappe/ERPNext Integration Guide (Updated with Latest Docs)

**Last Updated**: January 2025  
**Based on**: Frappe Framework v15 & ERPNext v14+  
**Implementation Status**: ✅ API Client Updated

---

## ✅ Our Implementation

### Updated API Client (`services/agent-gateway/src/api.ts`)

The `FrappeAPIClient` has been updated to support both authentication methods:

**Method 1: API Key + Secret (Recommended for Production)**
```typescript
import { createFrappeClientWithAPIKey } from './api';

const client = createFrappeClientWithAPIKey(
  process.env.ERPNEXT_BASE_URL || '',
  process.env.ERPNEXT_API_KEY || '',
  process.env.ERPNEXT_API_SECRET || '',
  10 // rate limit: 10 req/sec
);

// Automatically sets: Authorization: token <api_key>:<api_secret>
```

**Method 2: Session Token (For User Sessions)**
```typescript
import { createFrappeClient } from './api';

const client = createFrappeClient(
  baseURL,
  sessionToken,
  10 // rate limit: 10 req/sec
);

// Automatically sets: Authorization: token <session_token>
```

**Features**:
- ✅ Token-based authentication (Frappe v15+ compatible)
- ✅ Dual auth support (API key:secret OR session token)
- ✅ Rate limiting (10 req/sec default, configurable)
- ✅ Idempotency cache (5-minute TTL)
- ✅ Automatic retry with token bucket algorithm
- ✅ Full TypeScript support

**Required Environment Variables**:
```bash
ERPNEXT_BASE_URL=https://your-erpnext-instance.com
ERPNEXT_API_KEY=your_api_key_here
ERPNEXT_API_SECRET=your_api_secret_here
```

Set via Wrangler:
```bash
cd services/agent-gateway
pnpm dlx wrangler secret put ERPNEXT_BASE_URL
pnpm dlx wrangler secret put ERPNEXT_API_KEY
pnpm dlx wrangler secret put ERPNEXT_API_SECRET
```

---

## 🔑 Key Updates from Latest Documentation

### 1. API Authentication (Updated)

**Modern Approach (Recommended)**:
```python
# Use API Key + Secret (more secure than password)
headers = {
    'Authorization': f'token {api_key}:{api_secret}',
    'Content-Type': 'application/json'
}
```

**Legacy OAuth Flow** (if needed):
```javascript
// OAuth confirmation flow for user consent
// GET /api/method/oauth2/authorize
// With client_id, response_type, redirect_uri, scope
```

### 2. Whitelisted API Patterns

**Server-Side (Python)**:
```python
import frappe

@frappe.whitelist()
def get_last_project():
    """Create public API endpoint"""
    return frappe.get_all("Project", limit_page_length=1)[0]

@frappe.whitelist()
def create_document(values: dict):
    """Secure document creation with validation"""
    frappe.only_for('System User')  # Role check
    
    # Validate allowed doctypes
    if values['doctype'] not in ('ToDo', 'Note', 'Task'):
        frappe.throw('Invalid Document Type')
    
    doc = frappe.get_doc(values).insert(ignore_permissions=True)
    return doc
```

**Client-Side (JavaScript)**:
```javascript
// Modern async/await pattern
frappe.call({
    method: "myapp.api.get_last_project",
    callback: (response) => {
        console.log(response.message);
    }
});

// Or with fetch API
const response = await fetch('/api/method/myapp.api.buy_fruits', {
    method: 'POST',
    headers: {
        'Accept': 'application/json',
        'Content-Type': 'application/json',
    },
    body: JSON.stringify({
        fruits: ['Apple', 'Orange']
    })
});
```

### 3. Database Operations (Query Builder)

**Use Query Builder (Recommended)**:
```python
from frappe.qb import DocType

User = DocType('User')
users = (
    frappe.qb
    .from_(User)
    .select(User.name, User.email)
    .where(User.enabled == 1)
    .run(as_dict=True)
)
```

**Database API (Alternative)**:
```python
# Get values
frappe.db.get_values(
    "User", 
    fieldname=["name", "email"], 
    filters={"enabled": 1}
)

# Get single value
value = frappe.db.get_single_value("Accounts Settings", "exchange_gain_loss_posting_date")

# Set single value
frappe.db.set_single_value("Accounts Settings", "use_new_budget_controller", True)
```

### 4. Document Operations

**CRUD Operations**:
```python
# Create
doc = frappe.get_doc({
    "doctype": "Project",
    "title": "My new project",
    "status": "Open"
})
doc.insert()

# Read
doc = frappe.get_doc("Project", "PROJ-001")
print(doc.title)

# Update
doc.status = "In Progress"
doc.save()

# Delete
doc.delete()
```

### 5. Client-Side Scripting (Modern Patterns)

**Form Events**:
```javascript
frappe.ui.form.on("Sales Invoice", {
    refresh: function(frm) {
        // On form load/refresh
    },
    company: function(frm) {
        // On company field change
    },
    onload_post_render: function(frm) {
        // After form is rendered
        frm.fields_dict.customer.$input.on("keypress", function(evt){
            // Handle keypress events
        });
    }
});
```

**Field Manipulation**:
```javascript
// Set read-only
frm.set_df_property("myfield", "read_only", frm.doc.__islocal ? 0 : 1);

// Hide/show field
cur_frm.toggle_display("myfield1", doc.myfield2=="some_value");

// Fetch from server
frappe.call({
    method:"frappe.client.get_value",
    args: {
        doctype:"Delivery Note Item",
        filters: {
            parent:"DN00038",
            item_code:"Ser/003"
        },
        fieldname:["qty", "stock_uom"]
    }, 
    callback: function(r) {
        cur_frm.set_value('qty', r.message.qty);
    }
});
```

### 6. Security Best Practices

**Input Validation**:
```python
@frappe.whitelist()
def get_file(path: str):
    # ❌ BAD - Allows reading any file
    # return open(path).read()
    
    # ✅ GOOD - Use File doctype API
    file_doc = frappe.get_doc("File", {"file_url": path})
    return file_doc.get_content()
```

**SQL Injection Prevention**:
```python
# ❌ BAD - String interpolation
frappe.db.sql(f"SELECT * FROM `tabUser` WHERE name = '{user}'")

# ✅ GOOD - Parameterized query
frappe.db.sql("SELECT * FROM `tabUser` WHERE name = %s", (user,))

# ✅ BETTER - Use Query Builder
User = DocType('User')
frappe.qb.from_(User).select('*').where(User.name == user).run()
```

**Role-Based Access**:
```python
@frappe.whitelist()
def sensitive_operation():
    frappe.only_for('System Manager')  # Restrict by role
    # Perform operation
```

---

## 🏥 Healthcare Module Integration (Updated)

### Healthcare Doctypes (v14+)

**Note**: Healthcare module was extracted from core ERPNext in v14.

```python
# Key Healthcare Doctypes
healthcare_doctypes = [
    "Patient",
    "Patient Encounter", 
    "Healthcare Service Unit",
    "Healthcare Practitioner",
    "Clinical Procedure",
    "Lab Test",
    "Medication",
    "Vital Signs"
]
```

**Installation** (if needed):
```bash
# Install healthcare app separately
bench get-app healthcare
bench --site your-site install-app healthcare
```

---

## 🏨 Hotel/Hospitality Module (Updated)

**Note**: Hospitality module was also extracted in v14.

**Installation**:
```bash
# For hotel/restaurant functionality
bench get-app hospitality
bench --site your-site install-app hospitality
```

**Key Doctypes**:
- Hotel Room
- Hotel Room Booking
- Restaurant
- Restaurant Order
- Table

---

## 🏫 Education Module Integration

**Extracted App**: `frappe/education`

**Key Doctypes**:
- Student
- Program
- Course
- Assessment
- Grading Scale
- Student Group
- Guardian

**Installation**:
```bash
bench get-app education
bench --site your-site install-app education
```

---

## 📝 Migration Notes for Version 16+

### Breaking Changes

1. **Sales Invoice Timesheet Data**:
```python
# Old behavior: Timesheets auto-added
# New behavior: Explicit API call required

# Use this API endpoint:
PUT /api/v2/document/Sales%20Invoice/{invoice_name}/method/add_timesheet_data
```

2. **Array Values in API Requests** (Fixed in v14):
```javascript
// Now correctly parses arrays
fetch('/api/method/app.api.buy_fruits', {
    method: 'POST',
    body: JSON.stringify({
        fruits: ['Apple', 'Orange']  // ✅ Now works correctly
    })
})
```

3. **SocketIO Namespacing** (v15+):
```javascript
// Old
let socket = io(url, { withCredentials: true })

// New - with site namespace
let socket = io(`${url}/${frappe.local.site}`, { withCredentials: true })
```

---

## 🔧 Updated Project Integration Points

### 1. API Client (`services/agent-gateway/src/api.ts`)

Update to use latest Frappe patterns:

```typescript
export class FrappeAPIClient {
    private baseURL: string;
    private apiKey: string;
    private apiSecret: string;

    constructor(config: FrappeAPIConfig) {
        this.baseURL = config.baseURL;
        this.apiKey = config.apiKey;
        this.apiSecret = config.apiSecret;
    }

    private getHeaders() {
        return {
            'Authorization': `token ${this.apiKey}:${this.apiSecret}`,
            'Content-Type': 'application/json'
        };
    }

    // Use Frappe's REST API
    async getDoc(doctype: string, name: string) {
        const response = await fetch(
            `${this.baseURL}/api/resource/${doctype}/${name}`,
            { headers: this.getHeaders() }
        );
        return response.json();
    }

    async createDoc(doctype: string, data: any) {
        const response = await fetch(
            `${this.baseURL}/api/resource/${doctype}`,
            {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(data)
            }
        );
        return response.json();
    }

    async callMethod(method: string, args: any) {
        const response = await fetch(
            `${this.baseURL}/api/method/${method}`,
            {
                method: 'POST',
                headers: this.getHeaders(),
                body: JSON.stringify(args)
            }
        );
        return response.json();
    }
}
```

### 2. Tool Registry Updates

Update tool implementations to use modern Frappe patterns:

```typescript
// Example: Updated room_availability tool
export async function room_availability(
    input: RoomAvailabilityInput,
    client: FrappeAPIClient
): Promise<RoomAvailabilityResult> {
    // Use Frappe's REST API or call custom method
    const result = await client.callMethod(
        'hospitality.api.get_available_rooms',
        {
            check_in: input.check_in,
            check_out: input.check_out,
            room_type: input.room_type
        }
    );
    
    return {
        available_rooms: result.message,
        total_count: result.message.length
    };
}
```

### 3. Security Enhancements

```typescript
// Risk classifier with proper role checks
export class RiskClassifier {
    static assess(operation: ToolOperation): RiskAssessment {
        const risk_level = this.calculateRisk(operation);
        
        // For high-risk operations, verify user roles
        if (risk_level === 'high') {
            // Check with Frappe if user has required role
            // This should be done on the Frappe side
        }
        
        return {
            level: risk_level,
            requires_approval: risk_level !== 'low',
            reason: this.getRiskReason(operation)
        };
    }
}
```

---

## 📊 ERPNext DocType Patterns (v14+)

### Module Structure

```
ERPNext v14+ Module Separation:
- Core ERPNext (Accounting, Stock, CRM, Selling, Buying)
- Healthcare (separate app)
- Hospitality (separate app)  
- Education (separate app)
- Manufacturing (core)
- Retail (custom)
```

### Custom DocTypes Best Practices

```python
# In your custom app (e.g., erpnext_hospital)
# apps/erpnext_hospital/erpnext_hospital/doctype/patient_order/patient_order.py

import frappe
from frappe.model.document import Document

class PatientOrder(Document):
    def validate(self):
        """Validation before save"""
        self.validate_patient()
        self.calculate_totals()
    
    def on_submit(self):
        """Actions on document submission"""
        self.update_patient_record()
        self.create_transaction_log()
    
    def validate_patient(self):
        if not frappe.db.exists("Patient", self.patient):
            frappe.throw(f"Patient {self.patient} does not exist")
    
    @frappe.whitelist()
    def create_order_set(self, items):
        """Whitelisted method callable from API"""
        for item in items:
            self.append('items', {
                'item_code': item['code'],
                'qty': item['qty']
            })
        self.save()
```

---

## 🚀 Implementation Recommendations

### 1. Use Separate Apps for Each Industry

```bash
# Structure
apps/
  erpnext_hotel/       # Custom Hospitality app
  erpnext_hospital/    # Custom Healthcare app  
  erpnext_education/   # Custom Education app
  erpnext_retail/      # Custom Retail app
  erpnext_manufacturing/  # Custom Manufacturing app
```

### 2. Install Base Apps

```bash
# Core
bench get-app frappe
bench get-app erpnext

# Industry modules (as needed)
bench get-app healthcare
bench get-app hospitality
bench get-app education
```

### 3. API Integration Pattern

```typescript
// Centralized API client
export const erpnextClient = new FrappeAPIClient({
    baseURL: process.env.ERPNEXT_BASE_URL,
    apiKey: process.env.ERPNEXT_API_KEY,
    apiSecret: process.env.ERPNEXT_API_SECRET
});

// Tool implementations use the client
export async function create_order(input, client) {
    return await client.callMethod(
        'erpnext_hospital.api.create_order',
        input
    );
}
```

---

## 🔗 Resources

- **Frappe Framework Docs**: https://frappeframework.com/docs
- **ERPNext Docs**: https://docs.erpnext.com/
- **Healthcare App**: https://github.com/frappe/healthcare
- **Hospitality App**: https://github.com/frappe/hospitality
- **Education App**: https://github.com/frappe/education
- **API Reference**: https://frappeframework.com/docs/user/en/api

---

**Updated**: October 1, 2025 with Context7 MCP latest documentation
