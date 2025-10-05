# CopilotKit Integration for Generated ERPNext Apps

**Date:** October 3, 2025  
**Feature:** Embed AI co-agent into every generated ERPNext application

---

## Vision

Every generated ERPNext app (school system, clinic, warehouse, etc.) will have:

1. **Context-Aware Chatbot** - Understands current page and chat history
2. **Active Recommendation Cards** - Suggests actions above chat input
3. **Co-Agent Assistance** - Helps users perform tasks specific to the app
4. **Embedded Experience** - Seamlessly integrated into the app UI

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────┐
│  Generated ERPNext App (e.g., School Management System)     │
│                                                              │
│  ┌────────────────────────────────────────────────────────┐ │
│  │  App Layout (Next.js + ERPNext Integration)            │ │
│  │                                                         │ │
│  │  ┌─────────────────────────────────────────────────┐  │ │
│  │  │  Page Content (Student List, Add Course, etc.)  │  │ │
│  │  │                                                  │  │ │
│  │  │  ┌─────────────────────────────────────┐       │  │ │
│  │  │  │  CopilotKit Provider                │       │  │ │
│  │  │  │  - Context: Current page info        │       │  │ │
│  │  │  │  - State: Chat history, user data    │       │  │ │
│  │  │  │  - Agent: School management co-agent │       │  │ │
│  │  │  └─────────────────────────────────────┘       │  │ │
│  │  │                                                  │  │ │
│  │  │  ┌─────────────────────────────────────┐       │  │ │
│  │  │  │  Active Recommendation Cards        │       │  │ │
│  │  │  │  "Add new student?"                 │       │  │ │
│  │  │  │  "Generate attendance report?"      │       │  │ │
│  │  │  │  [Quick Action Buttons]             │       │  │ │
│  │  │  └─────────────────────────────────────┘       │  │ │
│  │  │                                                  │  │ │
│  │  │  ┌─────────────────────────────────────┐       │  │ │
│  │  │  │  CopilotKit Chat                    │       │  │ │
│  │  │  │  User: "Enroll new student John"    │       │  │ │
│  │  │  │  Bot: "I'll help you enroll John... │       │  │ │
│  │  │  │       What's his grade?"            │       │  │ │
│  │  │  └─────────────────────────────────────┘       │  │ │
│  │  │                                                  │  │ │
│  │  └──────────────────────────────────────────────┘  │ │
│  │                                                     │ │
│  └─────────────────────────────────────────────────────┘ │
│                                                            │
│  Backend: Agent Gateway (Streaming with Anthropic SDK)    │
└────────────────────────────────────────────────────────────┘
```

---

## Implementation Structure

### 1. Base CopilotKit Provider Component

```typescript
// components/providers/copilot-provider.tsx
'use client';

import { CopilotKit } from '@copilotkit/react-core';
import { CopilotSidebar } from '@copilotkit/react-ui';
import '@copilotkit/react-ui/styles.css';

interface AppCopilotProviderProps {
    children: React.ReactNode;
    appContext: {
        appType: 'school' | 'clinic' | 'warehouse' | string;
        currentPage: string;
        userRole: string;
        appData?: any;
    };
}

export function AppCopilotProvider({ children, appContext }: AppCopilotProviderProps) {
    return (
        <CopilotKit
            runtimeUrl="/api/copilot/runtime"
            agent={`${appContext.appType}_management_agent`}
            // Pass context to agent
            publicApiKey={process.env.NEXT_PUBLIC_COPILOT_API_KEY}
        >
            <CopilotSidebar
                defaultOpen={false}
                clickOutsideToClose={true}
                labels={{
                    title: `${appContext.appType} Assistant`,
                    initial: `Hi! I'm your ${appContext.appType} management assistant. How can I help you today?`,
                }}
            >
                {children}
            </CopilotSidebar>
        </CopilotKit>
    );
}
```

### 2. Context-Aware Agent State Management

```typescript
// hooks/use-app-copilot.tsx
'use client';

import { useCoAgent } from '@copilotkit/react-core';
import { useMemo } from 'react';

interface AppState {
    currentPage: string;
    pageData: any;
    userRole: string;
    recentActions: string[];
}

export function useAppCopilot(appType: string) {
    // Get agent state with context
    const { state, setState, run } = useCoAgent<AppState>({
        name: `${appType}_management_agent`,
        initialState: {
            currentPage: '',
            pageData: {},
            userRole: 'user',
            recentActions: [],
        },
    });

    // Update context when page changes
    const updateContext = (page: string, data: any) => {
        setState({
            ...state,
            currentPage: page,
            pageData: data,
            recentActions: [...state.recentActions, `viewed_${page}`].slice(-10),
        });
    };

    // Context-aware recommendations
    const recommendations = useMemo(() => {
        return getRecommendationsForPage(state.currentPage, state.pageData);
    }, [state.currentPage, state.pageData]);

    return {
        state,
        updateContext,
        recommendations,
        executeAction: run,
    };
}

// Get page-specific recommendations
function getRecommendationsForPage(page: string, data: any) {
    const recommendations: Recommendation[] = [];

    // Example for school system
    if (page === 'student-list') {
        recommendations.push({
            title: 'Add New Student',
            description: 'Enroll a new student with form guidance',
            action: 'navigate:/students/new',
            icon: 'UserPlus',
        });
        
        if (data?.hasLowAttendance) {
            recommendations.push({
                title: 'Check Low Attendance',
                description: 'Review students with attendance below 75%',
                action: 'filter:low-attendance',
                icon: 'AlertTriangle',
                priority: 'high',
            });
        }
    }

    if (page === 'student-detail') {
        recommendations.push({
            title: 'Record Attendance',
            description: 'Mark today\'s attendance for this student',
            action: 'open:attendance-form',
            icon: 'CheckSquare',
        });
        
        recommendations.push({
            title: 'View Report Card',
            description: 'Generate and download student report card',
            action: 'generate:report-card',
            icon: 'FileText',
        });
    }

    return recommendations;
}
```

### 3. Active Recommendation Cards Component

```typescript
// components/copilot/recommendation-cards.tsx
'use client';

import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { 
    UserPlus, 
    AlertTriangle, 
    CheckSquare, 
    FileText,
    ArrowRight 
} from 'lucide-react';

interface Recommendation {
    title: string;
    description: string;
    action: string;
    icon: string;
    priority?: 'low' | 'medium' | 'high';
}

interface RecommendationCardsProps {
    recommendations: Recommendation[];
    onActionClick: (action: string) => void;
}

export function RecommendationCards({ 
    recommendations, 
    onActionClick 
}: RecommendationCardsProps) {
    if (recommendations.length === 0) return null;

    const iconMap = {
        UserPlus,
        AlertTriangle,
        CheckSquare,
        FileText,
    };

    return (
        <div className="mb-4 space-y-2">
            <p className="text-sm text-muted-foreground">
                Suggested actions for this page:
            </p>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {recommendations.map((rec, index) => {
                    const Icon = iconMap[rec.icon as keyof typeof iconMap] || UserPlus;
                    const priorityColors = {
                        low: 'border-gray-200',
                        medium: 'border-blue-200 bg-blue-50',
                        high: 'border-red-200 bg-red-50',
                    };
                    
                    return (
                        <Card 
                            key={index}
                            className={`p-3 cursor-pointer hover:shadow-md transition-shadow ${
                                priorityColors[rec.priority || 'low']
                            }`}
                            onClick={() => onActionClick(rec.action)}
                        >
                            <div className="flex items-start gap-3">
                                <div className="mt-1">
                                    <Icon className="h-5 w-5 text-primary" />
                                </div>
                                <div className="flex-1">
                                    <h4 className="text-sm font-medium">
                                        {rec.title}
                                    </h4>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        {rec.description}
                                    </p>
                                </div>
                                <ArrowRight className="h-4 w-4 text-muted-foreground mt-1" />
                            </div>
                        </Card>
                    );
                })}
            </div>
        </div>
    );
}
```

### 4. Context-Aware Chat Component

```typescript
// components/copilot/context-aware-chat.tsx
'use client';

import { useCopilotChat, useCopilotReadable } from '@copilotkit/react-core';
import { useAppCopilot } from '@/hooks/use-app-copilot';

interface ContextAwareChatProps {
    appType: string;
    currentPage: string;
    pageData: any;
}

export function ContextAwareChat({ 
    appType, 
    currentPage, 
    pageData 
}: ContextAwareChatProps) {
    const { state, updateContext } = useAppCopilot(appType);

    // Make page context readable by the agent
    useCopilotReadable({
        description: 'Current page information',
        value: {
            page: currentPage,
            appType: appType,
            data: pageData,
        },
    });

    // Make user's recent actions readable
    useCopilotReadable({
        description: 'Recent user actions',
        value: state.recentActions,
    });

    // Update context when page changes
    React.useEffect(() => {
        updateContext(currentPage, pageData);
    }, [currentPage, pageData]);

    return (
        <div className="flex flex-col h-full">
            {/* Context indicator */}
            <div className="px-4 py-2 bg-muted border-b">
                <p className="text-xs text-muted-foreground">
                    Context: <span className="font-medium">{currentPage}</span>
                </p>
            </div>

            {/* CopilotKit handles the chat UI */}
        </div>
    );
}
```

### 5. Page Layout with Embedded CopilotKit

```typescript
// app/(school-app)/layout.tsx
'use client';

import { AppCopilotProvider } from '@/components/providers/copilot-provider';
import { RecommendationCards } from '@/components/copilot/recommendation-cards';
import { useAppCopilot } from '@/hooks/use-app-copilot';
import { usePathname } from 'next/navigation';

export default function SchoolAppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const currentPage = pathname.split('/').pop() || 'dashboard';

    return (
        <AppCopilotProvider
            appContext={{
                appType: 'school',
                currentPage,
                userRole: 'admin',
            }}
        >
            <div className="flex h-screen">
                {/* Sidebar Navigation */}
                <aside className="w-64 border-r bg-muted/50">
                    <SchoolAppSidebar />
                </aside>

                {/* Main Content */}
                <main className="flex-1 flex flex-col overflow-hidden">
                    {/* Header */}
                    <header className="border-b px-6 py-4">
                        <h1 className="text-2xl font-bold">School Management System</h1>
                    </header>

                    {/* Content Area */}
                    <div className="flex-1 overflow-auto p-6">
                        {children}
                    </div>

                    {/* CopilotKit Sidebar with Recommendations */}
                    <CopilotSidebarContent currentPage={currentPage} />
                </main>
            </div>
        </AppCopilotProvider>
    );
}

// Sidebar content with recommendations
function CopilotSidebarContent({ currentPage }: { currentPage: string }) {
    const { recommendations } = useAppCopilot('school');

    const handleActionClick = async (action: string) => {
        // Parse action (e.g., "navigate:/students/new")
        const [type, value] = action.split(':');
        
        if (type === 'navigate') {
            window.location.href = value;
        } else if (type === 'filter') {
            // Apply filter logic
        } else if (type === 'generate') {
            // Trigger generation
        }
    };

    return (
        <div className="p-4">
            <RecommendationCards
                recommendations={recommendations}
                onActionClick={handleActionClick}
            />
        </div>
    );
}
```

---

## Backend: CopilotKit Runtime API

### 6. CopilotKit Runtime Endpoint

```typescript
// app/api/copilot/runtime/route.ts
import {
    CopilotRuntime,
    OpenAIAdapter,
    copilotRuntimeNextJSAppRouterEndpoint,
} from '@copilotkit/runtime';
import { HybridCoAgent } from '@/services/agent-gateway/src/coagents';
import { openRouterProvider } from '@/services/agent-gateway/src/ai/providers';

const hybridAgent = new HybridCoAgent(openRouterProvider);

export const POST = async (req: Request) => {
    const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
        runtime: new CopilotRuntime({
            actions: [
                // School Management Actions
                {
                    name: 'enroll_student',
                    description: 'Enroll a new student in the school system',
                    parameters: [
                        {
                            name: 'student_name',
                            type: 'string',
                            description: 'Full name of the student',
                            required: true,
                        },
                        {
                            name: 'grade',
                            type: 'string',
                            description: 'Grade level (e.g., "5th Grade")',
                            required: true,
                        },
                        {
                            name: 'parent_contact',
                            type: 'string',
                            description: 'Parent phone number or email',
                            required: true,
                        },
                    ],
                    handler: async ({ student_name, grade, parent_contact }) => {
                        // Call ERPNext API to create Student DocType
                        const response = await fetch(`${ERPNEXT_URL}/api/resource/Student`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `token ${ERPNEXT_API_KEY}`,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                student_name,
                                grade,
                                parent_contact,
                                enrollment_date: new Date().toISOString().split('T')[0],
                            }),
                        });

                        const data = await response.json();
                        return {
                            success: true,
                            message: `Student ${student_name} enrolled successfully!`,
                            student_id: data.data.name,
                        };
                    },
                },

                {
                    name: 'mark_attendance',
                    description: 'Mark attendance for a student',
                    parameters: [
                        {
                            name: 'student_id',
                            type: 'string',
                            description: 'Student ID',
                            required: true,
                        },
                        {
                            name: 'status',
                            type: 'string',
                            description: 'Attendance status: Present, Absent, Late',
                            required: true,
                        },
                        {
                            name: 'date',
                            type: 'string',
                            description: 'Date in YYYY-MM-DD format',
                            required: false,
                        },
                    ],
                    handler: async ({ student_id, status, date }) => {
                        const attendance_date = date || new Date().toISOString().split('T')[0];
                        
                        const response = await fetch(`${ERPNEXT_URL}/api/resource/Student Attendance`, {
                            method: 'POST',
                            headers: {
                                'Authorization': `token ${ERPNEXT_API_KEY}`,
                                'Content-Type': 'application/json',
                            },
                            body: JSON.stringify({
                                student: student_id,
                                status,
                                attendance_date,
                            }),
                        });

                        const data = await response.json();
                        return {
                            success: true,
                            message: `Attendance marked as ${status} for ${attendance_date}`,
                        };
                    },
                },

                {
                    name: 'generate_report',
                    description: 'Generate various reports (attendance, grades, fee collection)',
                    parameters: [
                        {
                            name: 'report_type',
                            type: 'string',
                            description: 'Type of report: attendance_summary, grade_report, fee_collection',
                            required: true,
                        },
                        {
                            name: 'filters',
                            type: 'object',
                            description: 'Report filters (date range, grade, etc.)',
                            required: false,
                        },
                    ],
                    handler: async ({ report_type, filters }) => {
                        // Generate report using ERPNext Report API
                        const response = await fetch(
                            `${ERPNEXT_URL}/api/method/frappe.desk.query_report.run`,
                            {
                                method: 'POST',
                                headers: {
                                    'Authorization': `token ${ERPNEXT_API_KEY}`,
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    report_name: report_type,
                                    filters: filters || {},
                                }),
                            }
                        );

                        const data = await response.json();
                        return {
                            success: true,
                            report_url: `/reports/${report_type}`,
                            preview: data.message.result.slice(0, 5), // First 5 rows
                        };
                    },
                },

                {
                    name: 'search_records',
                    description: 'Search for students, courses, or other records',
                    parameters: [
                        {
                            name: 'doctype',
                            type: 'string',
                            description: 'DocType to search: Student, Course, Teacher, etc.',
                            required: true,
                        },
                        {
                            name: 'query',
                            type: 'string',
                            description: 'Search query',
                            required: true,
                        },
                    ],
                    handler: async ({ doctype, query }) => {
                        const response = await fetch(
                            `${ERPNEXT_URL}/api/resource/${doctype}?filters=[["name","like","%${query}%"]]`,
                            {
                                headers: {
                                    'Authorization': `token ${ERPNEXT_API_KEY}`,
                                },
                            }
                        );

                        const data = await response.json();
                        return {
                            success: true,
                            results: data.data,
                            count: data.data.length,
                        };
                    },
                },
            ],
        }),
    });

    return handleRequest(req);
};
```

---

## Example: School Management System Page

### 7. Student List Page with CopilotKit

```typescript
// app/(school-app)/students/page.tsx
'use client';

import { useEffect, useState } from 'react';
import { useAppCopilot } from '@/hooks/use-app-copilot';
import { RecommendationCards } from '@/components/copilot/recommendation-cards';
import { Button } from '@/components/ui/button';
import { DataTable } from '@/components/ui/data-table';

export default function StudentsPage() {
    const [students, setStudents] = useState([]);
    const [loading, setLoading] = useState(true);
    const { updateContext, recommendations } = useAppCopilot('school');

    useEffect(() => {
        // Fetch students from ERPNext
        fetchStudents();
        
        // Update copilot context
        updateContext('student-list', {
            totalStudents: students.length,
            hasLowAttendance: students.some(s => s.attendance_percentage < 75),
        });
    }, []);

    const fetchStudents = async () => {
        const response = await fetch('/api/erpnext/students');
        const data = await response.json();
        setStudents(data.students);
        setLoading(false);
    };

    const handleRecommendationAction = async (action: string) => {
        const [type, value] = action.split(':');
        
        if (type === 'navigate') {
            window.location.href = value;
        } else if (type === 'filter') {
            // Apply filter
            const filtered = students.filter(s => 
                value === 'low-attendance' ? s.attendance_percentage < 75 : true
            );
            setStudents(filtered);
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold">Students</h2>
                <Button onClick={() => window.location.href = '/students/new'}>
                    Add Student
                </Button>
            </div>

            {/* Active Recommendations */}
            <RecommendationCards
                recommendations={recommendations}
                onActionClick={handleRecommendationAction}
            />

            {/* Students Table */}
            <DataTable
                columns={[
                    { key: 'name', label: 'Name' },
                    { key: 'grade', label: 'Grade' },
                    { key: 'attendance_percentage', label: 'Attendance %' },
                    { key: 'status', label: 'Status' },
                ]}
                data={students}
                loading={loading}
            />

            {/* CopilotKit Chat is available in the sidebar */}
        </div>
    );
}
```

---

## Generated App Structure

When HybridCoAgent generates a school system, it will create:

```
school-management-app/
├── app/
│   ├── (school-app)/
│   │   ├── layout.tsx              # With CopilotKit provider
│   │   ├── dashboard/page.tsx      # Dashboard with recommendations
│   │   ├── students/
│   │   │   ├── page.tsx            # Student list with context-aware chat
│   │   │   ├── new/page.tsx        # Add student with chat assistance
│   │   │   └── [id]/page.tsx       # Student detail with recommendations
│   │   ├── courses/
│   │   │   ├── page.tsx
│   │   │   └── [id]/page.tsx
│   │   ├── attendance/
│   │   │   └── page.tsx
│   │   └── reports/
│   │       └── page.tsx
│   └── api/
│       ├── copilot/
│       │   └── runtime/route.ts    # CopilotKit runtime with school actions
│       └── erpnext/
│           ├── students/route.ts
│           ├── courses/route.ts
│           └── attendance/route.ts
├── components/
│   ├── providers/
│   │   └── copilot-provider.tsx
│   ├── copilot/
│   │   ├── recommendation-cards.tsx
│   │   └── context-aware-chat.tsx
│   └── ui/
│       └── ... (shadcn components)
├── hooks/
│   └── use-app-copilot.tsx
└── lib/
    ├── erpnext-client.ts
    └── copilot-actions.ts
```

---

## Key Differences from Official ERPNext

### Official ERPNext App:
```
- Traditional ERPNext Desk UI
- No AI assistance
- Manual form filling
- No recommendations
- Standard DocType views
```

### Generated App with CopilotKit:
```
✅ Modern Next.js UI with Tailwind CSS
✅ Context-aware AI chatbot on every page
✅ Active recommendation cards
✅ Conversational interactions ("Enroll John Doe in 5th grade")
✅ Smart suggestions based on page context
✅ Real-time help with form filling
✅ Natural language commands
✅ Embedded AI co-agent understanding app context
```

---

## Next Steps

1. **Create base CopilotKit components** (Provider, Chat, Recommendations)
2. **Implement runtime API** with ERPNext actions
3. **Update HybridCoAgent** to generate apps with CopilotKit
4. **Test with school system** example
5. **Expand to clinic, warehouse, etc.**

Would you like me to start implementing the CopilotKit components?
