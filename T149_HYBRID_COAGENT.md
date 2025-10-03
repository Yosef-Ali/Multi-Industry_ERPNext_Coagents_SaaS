# Hybrid Co-Agent: Intelligent Input Handling 🎯

**Date:** October 3, 2025  
**Status:** ✅ Complete  
**Feature:** Smart adaptation to different user input types

---

## Overview

The Hybrid Co-Agent intelligently handles **4 different input types** and adapts its behavior accordingly:

1. **PRD (Product Requirements Document)** → Parse detailed specs and generate
2. **Simple Prompt** → Analyze, recommend structure, get user approval
3. **Detailed Prompt** → Generate directly
4. **Template Request** → Suggest and use official ERPNext templates

## The Problem We Solved

### Before (Phase 1)
```typescript
// User: "Build school management system"
// Co-agent: Generates immediately (might miss critical features)

// User: "Create clinic app"  
// Co-agent: Generates immediately (might not include important DocTypes)
```
**Problem:** Vague prompts lead to incomplete or incorrect applications!

### After (Hybrid)
```typescript
// User: "Build school management system"
// Co-agent: 
// 1. Detects this is a simple/vague prompt
// 2. Analyzes the domain (education)
// 3. Recommends comprehensive structure:
//    - Student, Course, Attendance, Fee DocTypes
//    - Enrollment workflow
//    - Reports and dashboards
// 4. Shows official ERPNext Education template option
// 5. Waits for user approval
// 6. Generates with approved recommendations

// User: "Yes, generate with that structure"
// Co-agent: Generates production-ready school management app
```
**Solution:** Ensures complete, well-thought-out applications!

---

## Input Types & Handling

### 1. PRD (Product Requirements Document)

**Detection:**
- Long input (>500 words)
- Contains words: "requirements", "specification", "PRD"
- Structured document format

**Example:**
```
Product Requirements Document: Clinic Management System

1. Overview
   - Manage patient records, appointments, and prescriptions
   - Support multiple doctors and departments

2. Core Features
   2.1 Patient Management
       - Patient registration with demographics
       - Medical history tracking
       - Insurance information
   
   2.2 Appointment System
       - Schedule appointments with doctors
       - Automatic reminders via SMS/email
       - Calendar view for doctors
   
   2.3 Prescription Management
       - Digital prescription generation
       - Drug interaction checking
       - Prescription history

3. Workflows
   - Appointment: Scheduled → Confirmed → In Progress → Completed
   - Prescription: Draft → Verified → Issued

4. Reports
   - Daily appointments
   - Patient statistics
   - Revenue reports
```

**Co-agent Action:**
1. ✅ Parses PRD sections
2. ✅ Identifies all DocTypes needed
3. ✅ Extracts workflow requirements
4. ✅ Generates complete application immediately

---

### 2. Simple/Vague Prompt

**Detection:**
- Short input (<10 words)
- Lacks specific details
- No mention of specific DocTypes or workflows

**Example:**
```
User: "Build school management system"
```

**Co-agent Action:**
1. ✅ Analyzes domain (education)
2. ✅ Generates comprehensive recommendation:

```markdown
## Recommended Application Structure

### Domain: Education (School Management)

### Suggested DocTypes

1. **Student**
   - Fields: name, roll_number, class, section, date_of_birth, parent_contact
   - Description: Core student information and enrollment details

2. **Course**
   - Fields: name, code, description, credits, teacher
   - Description: Course catalog and scheduling

3. **Attendance**
   - Fields: student, course, date, status (Present/Absent/Late)
   - Description: Daily attendance tracking

4. **Fee**
   - Fields: student, amount, due_date, paid_status, payment_method
   - Description: Fee collection and tracking

5. **Grade**
   - Fields: student, course, marks, grade, semester
   - Description: Academic performance recording

### Suggested Workflows

1. **Enrollment Workflow**
   - States: Applied → Document Verified → Admitted → Enrolled
   - Approvals: Admin must approve admission

2. **Fee Payment Workflow**
   - States: Pending → Partial → Paid → Overdue
   - Notifications: Reminder before due date

### Suggested Features
- Student registration portal
- Parent access to view grades and attendance
- Teacher dashboard for marking attendance
- Automated report card generation
- SMS/Email notifications for fee reminders

### Official ERPNext Template Available
ERPNext has an official **Education** module that includes:
- Student, Program, Course, Fee Structure, Student Attendance
- [View Documentation](https://erpnext.com/docs/user/manual/en/education)

### Complexity: Moderate
### Estimated Generation Time: 5-10 minutes

---

### What would you like to do?
1. **Proceed with this structure** → Generate complete application
2. **Modify recommendations** → Tell me what to change
3. **Use official ERPNext Education template** → Extend with custom features
```

**User can then:**
- Approve and generate
- Request modifications
- Choose official template

---

### 3. Detailed Prompt

**Detection:**
- Medium length (10-100 words)
- Includes specific requirements
- Mentions DocTypes, workflows, or features

**Example:**
```
User: "Create clinic management app with Patient and Doctor DocTypes, 
appointment scheduling workflow, prescription management, and daily 
appointment reports"
```

**Co-agent Action:**
1. ✅ Detects sufficient detail
2. ✅ Generates immediately without recommendations
3. ✅ Creates all specified components

---

### 4. Template Request

**Detection:**
- Contains words: "official", "template", "existing", "standard"
- Asks about ERPNext modules

**Example:**
```
User: "Show me official ERPNext templates for hotel management"
```

**Co-agent Action:**
1. ✅ Searches official templates database
2. ✅ Shows matching templates:

```markdown
## Official ERPNext Templates

### Hospitality Module
Hotel management, bookings, and restaurant operations

**Includes:**
- Hotel Room
- Hotel Room Reservation
- Restaurant
- Restaurant Menu

[Documentation](https://erpnext.com/docs/user/manual/en/hospitality)

---

### What would you like to do?
1. **Use official template** → Set up standard hospitality module
2. **Generate custom solution** → Build from scratch
3. **Combine both** → Extend official template with custom features
```

---

## Official ERPNext Templates Database

The hybrid co-agent has built-in knowledge of official ERPNext templates:

### Available Templates

#### 1. Healthcare
- **DocTypes:** Patient, Patient Appointment, Clinical Procedure, Lab Test
- **Use Case:** Clinics, hospitals, medical centers
- **URL:** https://erpnext.com/docs/user/manual/en/healthcare

#### 2. Education
- **DocTypes:** Student, Program, Course, Fee Structure, Student Attendance
- **Use Case:** Schools, universities, training centers
- **URL:** https://erpnext.com/docs/user/manual/en/education

#### 3. Manufacturing
- **DocTypes:** BOM, Work Order, Job Card, Production Plan
- **Use Case:** Factories, production facilities
- **URL:** https://erpnext.com/docs/user/manual/en/manufacturing

#### 4. Retail
- **DocTypes:** POS Profile, POS Invoice, Item, Stock Entry
- **Use Case:** Retail stores, shops
- **URL:** https://erpnext.com/docs/user/manual/en/accounts/pos-invoice

#### 5. Hospitality
- **DocTypes:** Hotel Room, Hotel Room Reservation, Restaurant, Restaurant Menu
- **Use Case:** Hotels, restaurants, resorts
- **URL:** https://erpnext.com/docs/user/manual/en/hospitality

#### 6. Agriculture
- **DocTypes:** Crop, Crop Cycle, Land Unit, Weather, Soil Analysis
- **Use Case:** Farms, agricultural operations
- **URL:** https://erpnext.com/docs/user/manual/en/agriculture

#### 7. Non-Profit
- **DocTypes:** Member, Membership, Donor, Grant Application, Volunteer
- **Use Case:** NGOs, charities, associations
- **URL:** https://erpnext.com/docs/user/manual/en/non_profit

---

## Usage Examples

### Example 1: Simple Prompt with Recommendation

```typescript
import { HybridCoAgent, ArtifactType } from './coagents';
import { openRouterProvider } from './ai/providers';

const hybrid = new HybridCoAgent(openRouterProvider);

// Step 1: User provides simple prompt
const response1 = await hybrid.generateResponse({
    prompt: "Build school management system",
    artifactType: ArtifactType.ERPNEXT_APP,
    analyzeFirst: true, // Enable analysis
});

// Co-agent returns recommendation instead of generating
console.log(response1.explanation);
// → "I've analyzed your request and created a comprehensive recommendation..."

console.log(response1.artifacts[0].content);
// → Full recommendation document with DocTypes, workflows, features

// Step 2: User approves recommendation
const response2 = await hybrid.continueWithApprovedRecommendation(
    {
        prompt: response1.artifacts[0].content, // Use recommended structure
        artifactType: ArtifactType.ERPNEXT_APP,
        threadId: response1.threadId,
    },
    response1.artifacts[0].content
);

// Now generates complete school management app
console.log(response2.artifacts[0].title);
// → "School Management System"
```

### Example 2: PRD Document

```typescript
const prd = `
Product Requirements Document: Veterinary Clinic

1. Core Features
   - Pet registration with owner details
   - Appointment scheduling
   - Medical records and vaccination tracking
   - Prescription management
   
2. DocTypes Required
   - Pet (name, species, breed, owner)
   - Owner (name, contact, address)
   - Appointment (pet, doctor, date, reason)
   - Medical Record (pet, diagnosis, treatment)
   - Vaccination (pet, vaccine, date, next_due)

3. Workflows
   - Appointment: Scheduled → Confirmed → In Progress → Completed
   - Vaccination: Due → Scheduled → Administered
`;

const response = await hybrid.generateResponse({
    prompt: prd,
    artifactType: ArtifactType.ERPNEXT_APP,
    prdDocument: prd,
    analyzeFirst: true,
});

// Co-agent detects PRD and generates immediately
console.log(response.artifacts.length);
// → Generates Pet, Owner, Appointment, Medical Record, Vaccination DocTypes
```

### Example 3: Template Request

```typescript
const response = await hybrid.generateResponse({
    prompt: "Show me official ERPNext hotel management template",
    artifactType: ArtifactType.ERPNEXT_APP,
    analyzeFirst: true,
});

// Co-agent suggests Hospitality template
console.log(response.explanation);
// → Shows official Hospitality module details with DocTypes

// User decides to use template
const response2 = await hybrid.generateResponse({
    prompt: "Use official hospitality template and add custom room service tracking",
    artifactType: ArtifactType.ERPNEXT_APP,
    useTemplate: true,
    templateName: 'hospitality',
});

// Generates app based on official template + custom features
```

### Example 4: Detailed Prompt (Direct Generation)

```typescript
const response = await hybrid.generateResponse({
    prompt: `Create restaurant management app with Table, Reservation, 
Order, and MenuItem DocTypes. Include order workflow (Placed → Confirmed 
→ Preparing → Served → Completed). Add kitchen display dashboard and 
daily sales reports.`,
    artifactType: ArtifactType.ERPNEXT_APP,
    analyzeFirst: true,
});

// Co-agent detects detailed prompt and generates immediately
console.log(response.artifacts[0].type);
// → ArtifactType.ERPNEXT_APP (complete restaurant app)
```

---

## Input Analysis Logic

The hybrid co-agent uses AI + heuristics to analyze input:

### AI-Powered Analysis
```typescript
// Sends to LLM for classification
const analysis = await analyzeInput(prompt);

// Returns:
{
  type: 'simple_prompt',
  domain: 'education',
  confidence: 0.85,
  entities: ['student', 'course', 'teacher'],
  missingInfo: ['Workflows', 'Reports'],
  clarificationQuestions: [
    'What workflows do you need?',
    'What reports are important?'
  ]
}
```

### Fallback Heuristics
If AI analysis fails, uses rules:

```typescript
// PRD detection
if (prompt.length > 500 || prompt.includes('requirements')) {
    return { type: 'PRD', ... };
}

// Template request
if (prompt.includes('official') || prompt.includes('template')) {
    return { type: 'template_request', ... };
}

// Simple prompt
if (prompt.split(' ').length < 10) {
    return { type: 'simple_prompt', ... };
}

// Detailed prompt
return { type: 'detailed_prompt', ... };
```

### Domain Detection
```typescript
const domains = {
    healthcare: ['clinic', 'hospital', 'patient', 'doctor'],
    education: ['school', 'student', 'course', 'university'],
    retail: ['pos', 'shop', 'store', 'sales'],
    // ... more domains
};

// Finds matching keywords
for (const [domain, keywords] of Object.entries(domains)) {
    if (keywords.some(k => prompt.includes(k))) {
        return domain;
    }
}
```

---

## Architecture

```
┌─────────────────┐
│  User Input     │
└────────┬────────┘
         │
         ▼
┌─────────────────────────────────┐
│  HybridCoAgent                  │
│  ┌──────────────────────────┐  │
│  │  analyzeInput()          │  │
│  │  - AI classification     │  │
│  │  - Heuristic fallback    │  │
│  │  - Domain detection      │  │
│  └──────────┬───────────────┘  │
│             │                   │
│             ▼                   │
│  ┌──────────────────────────┐  │
│  │  Route based on type:    │  │
│  │                          │  │
│  │  PRD → generateFromPRD() │  │
│  │  Simple → recommend()    │  │
│  │  Detailed → generate()   │  │
│  │  Template → suggest()    │  │
│  └──────────┬───────────────┘  │
│             │                   │
│             ▼                   │
│  ┌──────────────────────────┐  │
│  │  Generate/Recommend      │  │
│  └──────────────────────────┘  │
└─────────────────────────────────┘
         │
         ▼
┌─────────────────┐
│  Response       │
│  - Artifacts    │
│  - Explanation  │
│  - Questions    │
└─────────────────┘
```

---

## Benefits

### 1. Better User Experience
✅ Beginners get guidance  
✅ Experts can skip recommendations  
✅ Everyone gets production-ready apps

### 2. Higher Quality Output
✅ Comprehensive requirements captured  
✅ Nothing missed in simple prompts  
✅ Follows ERPNext best practices

### 3. Flexibility
✅ Works with any input style  
✅ Adapts to user expertise level  
✅ Supports official templates

### 4. Time Savings
✅ Simple prompts → Get structure in seconds  
✅ PRDs → Immediate generation  
✅ Templates → Quick setup

---

## Next Steps

### Phase 2: Backend Streaming API
Integrate HybridCoAgent into streaming endpoint:

```typescript
POST /api/coagent/generate
{
  "prompt": "Build school system",
  "analyzeFirst": true
}

// First response (if simple prompt):
{
  "type": "recommendation",
  "content": "... comprehensive structure ..."
}

// User approves:
POST /api/coagent/continue
{
  "approved": true
}

// Second response (streaming):
→ "Generating Student DocType..."
→ "Creating enrollment workflow..."
→ Complete!
```

### Phase 3: UI Integration
Add recommendation UI component:

```tsx
{analysis.type === 'simple_prompt' && (
  <RecommendationCard
    recommendation={recommendation}
    onApprove={() => generate(recommendation.prompt)}
    onModify={(changes) => updateRecommendation(changes)}
    onUseTemplate={(template) => generateFromTemplate(template)}
  />
)}
```

---

## Summary

✅ **HybridCoAgent intelligently handles 4 input types**  
✅ **Recommends structure for simple prompts**  
✅ **Suggests official ERPNext templates**  
✅ **Generates from PRDs and detailed prompts**  
✅ **TypeScript compilation passing**  
✅ **Ready for backend integration**

**The hybrid co-agent ensures users always get complete, production-ready ERPNext applications, regardless of their input style!**

---

**Status:** ✅ COMPLETE  
**Next:** Integrate into Phase 2 (Backend Streaming API)
