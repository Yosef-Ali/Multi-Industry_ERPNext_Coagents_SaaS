'use client';

import { CopilotKit } from '@copilotkit/react-core';
import { CopilotSidebar } from '@copilotkit/react-ui';
import '@copilotkit/react-ui/styles.css';
import { RecommendationCards } from '../copilot/recommendation-cards';
import { useAppCopilot } from '@/hooks/use-app-copilot';

interface AppCopilotProviderProps {
    children: React.ReactNode;
    appContext: {
        appType: 'school' | 'clinic' | 'warehouse' | 'hotel' | 'retail' | string;
        currentPage: string;
        userRole: string;
        appData?: any;
    };
}

/**
 * AppCopilotProvider - Wraps generated ERPNext apps with CopilotKit
 * 
 * Features:
 * - Context-aware AI chatbot that understands current page
 * - Active recommendation cards above chat input
 * - Streaming responses from backend co-agent
 * - Chat history persistence
 * 
 * Usage:
 * ```tsx
 * <AppCopilotProvider appContext={{ appType: 'school', currentPage: 'students', userRole: 'admin' }}>
 *   <YourApp />
 * </AppCopilotProvider>
 * ```
 */
export function AppCopilotProvider({ children, appContext }: AppCopilotProviderProps) {
    const { recommendations, handleActionClick } = useAppCopilot(appContext.appType);

    // Format app type for display
    const appDisplayName = appContext.appType.charAt(0).toUpperCase() + appContext.appType.slice(1);

    return (
        <CopilotKit
            runtimeUrl="/api/copilot/runtime"
            agent={`${appContext.appType}_management_agent`}
            publicApiKey={process.env.NEXT_PUBLIC_COPILOT_API_KEY}
            // Pass app context to the agent
            properties={{
                appType: appContext.appType,
                currentPage: appContext.currentPage,
                userRole: appContext.userRole,
                appData: appContext.appData,
            }}
        >
            <CopilotSidebar
                defaultOpen={false}
                clickOutsideToClose={true}
                labels={{
                    title: `${appDisplayName} Assistant`,
                    initial: `Hi! I'm your ${appDisplayName} management assistant. I can help you with ${getAppCapabilities(appContext.appType)}. What would you like to do?`,
                }}
            >
                {/* Inject recommendation cards above chat */}
                <div className="copilot-sidebar-content">
                    <RecommendationCards
                        recommendations={recommendations}
                        onActionClick={handleActionClick}
                    />
                    {children}
                </div>
            </CopilotSidebar>
        </CopilotKit>
    );
}

/**
 * Get app-specific capabilities for initial message
 */
function getAppCapabilities(appType: string): string {
    const capabilities: Record<string, string> = {
        school: 'student enrollment, attendance tracking, grade management, and generating reports',
        clinic: 'patient registration, appointment scheduling, prescription management, and billing',
        warehouse: 'inventory management, stock transfers, shipment tracking, and purchase orders',
        hotel: 'room reservations, guest check-ins, billing, and housekeeping management',
        retail: 'sales orders, customer management, inventory, and point of sale operations',
    };

    return capabilities[appType] || 'managing your ERPNext application';
}
