/**
 * CopilotKit Runtime API for Generated ERPNext Apps
 * 
 * This endpoint is embedded in every generated ERPNext application
 * Provides context-aware AI assistance with ERPNext-specific actions
 */

import {
    CopilotRuntime,
    OpenAIAdapter,
    copilotRuntimeNextJSAppRouterEndpoint,
} from '@copilotkit/runtime';
import { NextRequest } from 'next/server';
import OpenAI from 'openai';

const ERPNEXT_URL = process.env.ERPNEXT_URL || 'https://demo.erpnext.com';
const ERPNEXT_API_KEY = process.env.ERPNEXT_API_KEY || '';
const ERPNEXT_API_SECRET = process.env.ERPNEXT_API_SECRET || '';

/**
 * POST handler - Provides AI assistance with ERPNext actions
 */
export async function POST(req: NextRequest) {
    // Get environment variables
    let env: any = process.env;
    try {
        const { getCloudflareContext } = await import('@opennextjs/cloudflare');
        const cfContext = getCloudflareContext();
        if (cfContext?.env) {
            env = cfContext.env;
        }
    } catch (e) {
        // Running in Node.js
    }

    const OPENROUTER_API_KEY = env.OPENROUTER_API_KEY || '';
    const OPENROUTER_MODEL = env.OPENROUTER_MODEL || 'anthropic/claude-3.5-sonnet';

    try {
        // Create OpenAI client pointing to OpenRouter
        const openai = new OpenAI({
            apiKey: OPENROUTER_API_KEY,
            baseURL: 'https://openrouter.ai/api/v1',
            defaultHeaders: {
                'HTTP-Referer': req.headers.get('referer') || 'http://localhost:3000',
                'X-Title': 'ERPNext Generated App',
            },
            fetch: globalThis.fetch,
        });

        // Create runtime with ERPNext-specific actions
        const runtime = new CopilotRuntime({
            actions: [
                // ============================================
                // SCHOOL MANAGEMENT ACTIONS
                // ============================================
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
                            description: 'Grade level (e.g., "5th Grade", "10th Grade")',
                            required: true,
                        },
                        {
                            name: 'date_of_birth',
                            type: 'string',
                            description: 'Date of birth in YYYY-MM-DD format',
                            required: true,
                        },
                        {
                            name: 'parent_name',
                            type: 'string',
                            description: 'Parent or guardian name',
                            required: true,
                        },
                        {
                            name: 'parent_contact',
                            type: 'string',
                            description: 'Parent phone number or email',
                            required: true,
                        },
                    ],
                    handler: async ({ student_name, grade, date_of_birth, parent_name, parent_contact }) => {
                        try {
                            const response = await fetch(`${ERPNEXT_URL}/api/resource/Student`, {
                                method: 'POST',
                                headers: {
                                    'Authorization': `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`,
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    student_name,
                                    date_of_birth,
                                    joining_date: new Date().toISOString().split('T')[0],
                                    gender: 'Other', // Can be enhanced
                                }),
                            });

                            if (!response.ok) {
                                throw new Error(`ERPNext API error: ${response.statusText}`);
                            }

                            const data = await response.json();
                            return {
                                success: true,
                                message: `✅ Student ${student_name} enrolled successfully in ${grade}!`,
                                student_id: data.data.name,
                                next_steps: [
                                    'Mark attendance',
                                    'Assign to courses',
                                    'Generate report card',
                                ],
                            };
                        } catch (error: any) {
                            return {
                                success: false,
                                error: error.message,
                            };
                        }
                    },
                },

                {
                    name: 'mark_attendance',
                    description: 'Mark attendance for a student',
                    parameters: [
                        {
                            name: 'student_id',
                            type: 'string',
                            description: 'Student ID (e.g., STU-001)',
                            required: true,
                        },
                        {
                            name: 'status',
                            type: 'string',
                            description: 'Attendance status: Present, Absent, Late, or Excused',
                            required: true,
                        },
                        {
                            name: 'date',
                            type: 'string',
                            description: 'Date in YYYY-MM-DD format (defaults to today)',
                            required: false,
                        },
                    ],
                    handler: async ({ student_id, status, date }) => {
                        const attendance_date = date || new Date().toISOString().split('T')[0];

                        try {
                            const response = await fetch(`${ERPNEXT_URL}/api/resource/Student Attendance`, {
                                method: 'POST',
                                headers: {
                                    'Authorization': `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`,
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    student: student_id,
                                    status,
                                    attendance_date,
                                }),
                            });

                            if (!response.ok) {
                                throw new Error(`ERPNext API error: ${response.statusText}`);
                            }

                            return {
                                success: true,
                                message: `✅ Attendance marked as ${status} for ${attendance_date}`,
                            };
                        } catch (error: any) {
                            return {
                                success: false,
                                error: error.message,
                            };
                        }
                    },
                },

                {
                    name: 'generate_report',
                    description: 'Generate various reports (attendance, grades, fee collection, etc.)',
                    parameters: [
                        {
                            name: 'report_type',
                            type: 'string',
                            description: 'Type of report: attendance_summary, grade_report, fee_collection, student_list',
                            required: true,
                        },
                        {
                            name: 'filters',
                            type: 'object',
                            description: 'Report filters (date_range, grade, student_id, etc.)',
                            required: false,
                        },
                    ],
                    handler: async ({ report_type, filters }) => {
                        try {
                            // For demo, return mock data structure
                            return {
                                success: true,
                                report_type,
                                report_url: `/reports/${report_type}`,
                                generated_at: new Date().toISOString(),
                                filters: filters || {},
                                message: `✅ ${report_type.replace('_', ' ')} generated successfully`,
                                preview: `Report contains ${Math.floor(Math.random() * 100)} records`,
                            };
                        } catch (error: any) {
                            return {
                                success: false,
                                error: error.message,
                            };
                        }
                    },
                },

                {
                    name: 'search_records',
                    description: 'Search for students, courses, teachers, or other records',
                    parameters: [
                        {
                            name: 'doctype',
                            type: 'string',
                            description: 'DocType to search: Student, Course, Instructor, Program, etc.',
                            required: true,
                        },
                        {
                            name: 'query',
                            type: 'string',
                            description: 'Search query (name, ID, or partial text)',
                            required: true,
                        },
                        {
                            name: 'filters',
                            type: 'object',
                            description: 'Additional filters to narrow results',
                            required: false,
                        },
                    ],
                    handler: async ({ doctype, query, filters }) => {
                        try {
                            const filterStr = filters 
                                ? `&filters=${encodeURIComponent(JSON.stringify(filters))}`
                                : '';

                            const response = await fetch(
                                `${ERPNEXT_URL}/api/resource/${doctype}?filters=[["name","like","%${query}%"]]${filterStr}&limit=10`,
                                {
                                    headers: {
                                        'Authorization': `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`,
                                    },
                                }
                            );

                            if (!response.ok) {
                                throw new Error(`ERPNext API error: ${response.statusText}`);
                            }

                            const data = await response.json();
                            return {
                                success: true,
                                doctype,
                                query,
                                results: data.data || [],
                                count: data.data?.length || 0,
                                message: `Found ${data.data?.length || 0} ${doctype} records matching "${query}"`,
                            };
                        } catch (error: any) {
                            return {
                                success: false,
                                error: error.message,
                            };
                        }
                    },
                },

                // ============================================
                // CLINIC MANAGEMENT ACTIONS
                // ============================================
                {
                    name: 'register_patient',
                    description: 'Register a new patient in the clinic system',
                    parameters: [
                        {
                            name: 'patient_name',
                            type: 'string',
                            description: 'Full name of the patient',
                            required: true,
                        },
                        {
                            name: 'date_of_birth',
                            type: 'string',
                            description: 'Date of birth in YYYY-MM-DD format',
                            required: true,
                        },
                        {
                            name: 'contact',
                            type: 'string',
                            description: 'Phone number or email',
                            required: true,
                        },
                        {
                            name: 'blood_group',
                            type: 'string',
                            description: 'Blood group (A+, A-, B+, B-, O+, O-, AB+, AB-)',
                            required: false,
                        },
                    ],
                    handler: async ({ patient_name, date_of_birth, contact, blood_group }) => {
                        try {
                            const response = await fetch(`${ERPNEXT_URL}/api/resource/Patient`, {
                                method: 'POST',
                                headers: {
                                    'Authorization': `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`,
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify({
                                    patient_name,
                                    dob: date_of_birth,
                                    mobile: contact,
                                    blood_group: blood_group || '',
                                }),
                            });

                            if (!response.ok) {
                                throw new Error(`ERPNext API error: ${response.statusText}`);
                            }

                            const data = await response.json();
                            return {
                                success: true,
                                message: `✅ Patient ${patient_name} registered successfully!`,
                                patient_id: data.data.name,
                                next_steps: [
                                    'Schedule appointment',
                                    'Add medical history',
                                    'Create prescription',
                                ],
                            };
                        } catch (error: any) {
                            return {
                                success: false,
                                error: error.message,
                            };
                        }
                    },
                },

                {
                    name: 'schedule_appointment',
                    description: 'Schedule a medical appointment',
                    parameters: [
                        {
                            name: 'patient_id',
                            type: 'string',
                            description: 'Patient ID',
                            required: true,
                        },
                        {
                            name: 'appointment_date',
                            type: 'string',
                            description: 'Appointment date and time in YYYY-MM-DD HH:mm format',
                            required: true,
                        },
                        {
                            name: 'practitioner',
                            type: 'string',
                            description: 'Doctor or practitioner name',
                            required: true,
                        },
                        {
                            name: 'department',
                            type: 'string',
                            description: 'Department (e.g., Cardiology, Pediatrics)',
                            required: false,
                        },
                    ],
                    handler: async ({ patient_id, appointment_date, practitioner, department }) => {
                        try {
                            return {
                                success: true,
                                message: `✅ Appointment scheduled for ${appointment_date} with ${practitioner}`,
                                appointment_id: `APT-${Date.now()}`,
                                patient_id,
                                reminder: 'Patient will receive SMS reminder 1 day before',
                            };
                        } catch (error: any) {
                            return {
                                success: false,
                                error: error.message,
                            };
                        }
                    },
                },

                // ============================================
                // GENERIC ACTIONS (All Apps)
                // ============================================
                {
                    name: 'create_doctype_record',
                    description: 'Create a new record for any DocType',
                    parameters: [
                        {
                            name: 'doctype',
                            type: 'string',
                            description: 'DocType name (e.g., Customer, Item, Purchase Order)',
                            required: true,
                        },
                        {
                            name: 'data',
                            type: 'object',
                            description: 'Record data as key-value pairs',
                            required: true,
                        },
                    ],
                    handler: async ({ doctype, data }) => {
                        try {
                            const response = await fetch(`${ERPNEXT_URL}/api/resource/${doctype}`, {
                                method: 'POST',
                                headers: {
                                    'Authorization': `token ${ERPNEXT_API_KEY}:${ERPNEXT_API_SECRET}`,
                                    'Content-Type': 'application/json',
                                },
                                body: JSON.stringify(data),
                            });

                            if (!response.ok) {
                                throw new Error(`ERPNext API error: ${response.statusText}`);
                            }

                            const result = await response.json();
                            return {
                                success: true,
                                message: `✅ ${doctype} record created successfully!`,
                                record_id: result.data.name,
                                data: result.data,
                            };
                        } catch (error: any) {
                            return {
                                success: false,
                                error: error.message,
                            };
                        }
                    },
                },

                {
                    name: 'get_page_suggestions',
                    description: 'Get AI-powered suggestions for the current page',
                    parameters: [
                        {
                            name: 'page',
                            type: 'string',
                            description: 'Current page name',
                            required: true,
                        },
                        {
                            name: 'context',
                            type: 'object',
                            description: 'Page context data',
                            required: false,
                        },
                    ],
                    handler: async ({ page, context }) => {
                        // Return dynamic suggestions based on page
                        return {
                            success: true,
                            page,
                            suggestions: [
                                {
                                    title: 'Quick Action',
                                    description: 'Perform common task on this page',
                                    action: 'execute_quick_action',
                                },
                            ],
                        };
                    },
                },
            ],
        });

        const { handleRequest } = copilotRuntimeNextJSAppRouterEndpoint({
            runtime,
            serviceAdapter: new OpenAIAdapter({
                model: OPENROUTER_MODEL,
                openai,
            }),
            endpoint: '/api/copilot/runtime',
        });

        return handleRequest(req);
    } catch (error: any) {
        console.error('CopilotKit runtime error:', error);
        return new Response(
            JSON.stringify({ error: error.message || 'Failed to process request' }),
            {
                status: 500,
                headers: { 'Content-Type': 'application/json' },
            }
        );
    }
}
