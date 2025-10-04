'use client';

import { useCopilotReadable, useCopilotAction } from '@copilotkit/react-core';
import { useEffect, useState, useMemo, useCallback } from 'react';
import { usePathname, useRouter } from 'next/navigation';
import type { Recommendation } from '@/components/copilot/recommendation-cards';
import { normalizeIndustry } from '@/lib/types/industry';

interface AppState {
    currentPage: string;
    pageData: any;
    userRole: string;
    recentActions: string[];
}

/**
 * useAppCopilot - Main hook for CopilotKit integration in generated apps
 * 
 * Features:
 * - Tracks current page and context
 * - Generates context-aware recommendations
 * - Makes app state readable by the AI agent
 * - Handles action execution
 * 
 * Usage:
 * ```tsx
 * const { state, updateContext, recommendations, handleActionClick } = useAppCopilot('school');
 * ```
 */
export function useAppCopilot(appType: string) {
    const pathname = usePathname();
    const router = useRouter();

    const [state, setState] = useState<AppState>({
        currentPage: '',
        pageData: {},
        userRole: 'user',
        recentActions: [],
    });

    // Make current page context readable by the agent
    useCopilotReadable({
        description: 'Current page information and user context',
        value: {
            appType,
            page: state.currentPage,
            pathname,
            data: state.pageData,
            userRole: state.userRole,
        },
    });

    // Make recent actions readable by the agent
    useCopilotReadable({
        description: 'Recent user actions and navigation history',
        value: {
            recentActions: state.recentActions,
            lastAction: state.recentActions[state.recentActions.length - 1],
        },
    });

    // Update context when page changes
    const updateContext = useCallback((page: string, data: any) => {
        setState(prev => ({
            ...prev,
            currentPage: page,
            pageData: data,
            recentActions: [...prev.recentActions, `viewed_${page}`].slice(-10),
        }));
    }, []);

    // Auto-update context on pathname change
    useEffect(() => {
        const page = pathname.split('/').filter(Boolean).pop() || 'dashboard';
        updateContext(page, {});
    }, [pathname, updateContext]);

    // Generate context-aware recommendations
    const recommendations = useMemo(() => {
        const industryOrApp = normalizeIndustry(appType) ?? appType;
        return getRecommendationsForPage(
            industryOrApp,
            state.currentPage,
            state.pageData,
            state.userRole
        );
    }, [appType, state.currentPage, state.pageData, state.userRole]);

    // Handle recommendation action clicks
    const handleActionClick = useCallback(async (action: string) => {
        const [type, value] = action.split(':', 2);

        // Update recent actions
        setState(prev => ({
            ...prev,
            recentActions: [...prev.recentActions, `clicked_${action}`].slice(-10),
        }));

        switch (type) {
            case 'navigate':
                router.push(value);
                break;

            case 'filter':
                // Trigger filter event
                window.dispatchEvent(new CustomEvent('apply-filter', { detail: value }));
                break;

            case 'open':
                // Trigger modal/dialog event
                window.dispatchEvent(new CustomEvent('open-dialog', { detail: value }));
                break;

            case 'generate':
                // Trigger generation event
                window.dispatchEvent(new CustomEvent('generate-report', { detail: value }));
                break;

            case 'api':
                // Direct API call
                try {
                    const response = await fetch(value, { method: 'POST' });
                    const result = await response.json();
                    window.dispatchEvent(new CustomEvent('api-result', { detail: result }));
                } catch (error) {
                    console.error('Action API call failed:', error);
                }
                break;

            default:
                console.warn('Unknown action type:', type);
        }
    }, [router]);

    return {
        state,
        updateContext,
        recommendations,
        handleActionClick,
    };
}

/**
 * Get page-specific recommendations based on app type and current page
 */
function getRecommendationsForPage(
    appIdentifier: string,
    page: string,
    data: any,
    userRole: string
): Recommendation[] {
    const recommendations: Recommendation[] = [];
    const industry = normalizeIndustry(appIdentifier) ?? appIdentifier;

    // School Management System
    if (industry === 'education') {
        if (page === 'students' || page === 'student-list') {
            recommendations.push({
                title: 'Add New Student',
                description: 'Enroll a new student with guided form',
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

            recommendations.push({
                title: 'Import Students',
                description: 'Bulk import students from CSV file',
                action: 'open:import-dialog',
                icon: 'ClipboardList',
            });
        }

        if (page === 'student-detail' || page.startsWith('students/')) {
            recommendations.push({
                title: 'Mark Attendance',
                description: "Mark today's attendance for this student",
                action: 'open:attendance-form',
                icon: 'CheckSquare',
                priority: 'medium',
            });

            recommendations.push({
                title: 'Generate Report Card',
                description: 'Create and download student report card',
                action: 'generate:report-card',
                icon: 'FileText',
            });

            if (data?.studentId) {
                recommendations.push({
                    title: 'View Attendance History',
                    description: 'See attendance records for this student',
                    action: 'navigate:/attendance/' + data.studentId,
                    icon: 'Calendar',
                });
            }
        }

        if (page === 'dashboard') {
            recommendations.push({
                title: 'View All Students',
                description: 'See complete student list',
                action: 'navigate:/students',
                icon: 'Users',
            });

            recommendations.push({
                title: 'Monthly Report',
                description: 'Generate monthly summary report',
                action: 'generate:monthly-report',
                icon: 'TrendingUp',
                priority: 'medium',
            });
        }
    }

    // Clinic Management System
    if (industry === 'hospital') {
        if (page === 'patients' || page === 'patient-list') {
            recommendations.push({
                title: 'Register New Patient',
                description: 'Add a new patient to the system',
                action: 'navigate:/patients/new',
                icon: 'UserPlus',
            });

            recommendations.push({
                title: 'Schedule Appointment',
                description: 'Book a new appointment',
                action: 'open:appointment-dialog',
                icon: 'Calendar',
                priority: 'medium',
            });
        }

        if (page === 'patient-detail' || page.startsWith('patients/')) {
            recommendations.push({
                title: 'Create Prescription',
                description: 'Write prescription for this patient',
                action: 'open:prescription-form',
                icon: 'FileText',
                priority: 'high',
            });

            if (data?.patientId) {
                recommendations.push({
                    title: 'View Medical History',
                    description: 'See complete medical records',
                    action: 'navigate:/medical-history/' + data.patientId,
                    icon: 'ClipboardList',
                });
            }

            recommendations.push({
                title: 'Generate Bill',
                description: 'Create invoice for patient',
                action: 'open:billing-form',
                icon: 'DollarSign',
            });
        }
    }

    // Warehouse Management System
    if (industry === 'manufacturing') {
        if (page === 'inventory' || page === 'stock-list') {
            recommendations.push({
                title: 'Add New Item',
                description: 'Register new inventory item',
                action: 'navigate:/inventory/new',
                icon: 'Package',
            });

            if (data?.hasLowStock) {
                recommendations.push({
                    title: 'Reorder Low Stock',
                    description: 'Create purchase orders for items below threshold',
                    action: 'open:reorder-dialog',
                    icon: 'AlertTriangle',
                    priority: 'high',
                });
            }

            recommendations.push({
                title: 'Stock Transfer',
                description: 'Transfer items between warehouses',
                action: 'open:transfer-form',
                icon: 'TrendingUp',
            });
        }

        if (page === 'dashboard') {
            recommendations.push({
                title: 'View Inventory',
                description: 'See all stock items',
                action: 'navigate:/inventory',
                icon: 'Package',
            });

            recommendations.push({
                title: 'Generate Stock Report',
                description: 'Create inventory summary report',
                action: 'generate:stock-report',
                icon: 'FileText',
                priority: 'medium',
            });
        }
    }

    // Hotel Management System
    if (industry === 'hotel') {
        if (page === 'reservations' || page === 'booking-list') {
            recommendations.push({
                title: 'New Reservation',
                description: 'Create a new room booking',
                action: 'navigate:/reservations/new',
                icon: 'Calendar',
                priority: 'medium',
            });

            recommendations.push({
                title: 'Check-in Guest',
                description: 'Process guest check-in',
                action: 'open:checkin-form',
                icon: 'CheckSquare',
            });
        }

        if (page === 'dashboard') {
            recommendations.push({
                title: 'Available Rooms',
                description: 'View room availability',
                action: 'navigate:/rooms',
                icon: 'Package',
            });

            recommendations.push({
                title: 'Daily Report',
                description: 'Generate occupancy report',
                action: 'generate:daily-report',
                icon: 'FileText',
            });
        }
    }

    // Retail Management System
    if (industry === 'retail') {
        if (page === 'sales' || page === 'orders') {
            recommendations.push({
                title: 'Create Sales Order',
                description: 'New order from customer',
                action: 'navigate:/sales/new',
                icon: 'DollarSign',
                priority: 'medium',
            });

            recommendations.push({
                title: 'Quick POS',
                description: 'Open point of sale interface',
                action: 'open:pos',
                icon: 'CheckSquare',
            });
        }

        if (page === 'dashboard') {
            recommendations.push({
                title: 'View Sales',
                description: 'See all sales orders',
                action: 'navigate:/sales',
                icon: 'TrendingUp',
            });

            recommendations.push({
                title: 'Sales Report',
                description: 'Generate sales summary',
                action: 'generate:sales-report',
                icon: 'FileText',
            });
        }
    }

    return recommendations;
}
