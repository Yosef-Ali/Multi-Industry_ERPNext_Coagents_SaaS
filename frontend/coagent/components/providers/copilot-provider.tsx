'use client';

import { CopilotKit } from '@copilotkit/react-core';
import { CopilotSidebar } from '@copilotkit/react-ui';
import '@copilotkit/react-ui/styles.css';
import { useAppCopilot } from '@/hooks/use-app-copilot';
import { useErpNextCopilot } from '@/hooks/use-erpnext-copilot';
import {
	INDUSTRY_CAPABILITIES,
	INDUSTRY_DISPLAY_NAMES,
	normalizeIndustry,
	toDisplayName,
} from '@/lib/types/industry';
import { RecommendationCards } from '../copilot/recommendation-cards';
import { WorkflowStreamPanel } from '../workflow-stream-panel';

interface AppCopilotProviderProps {
	children: React.ReactNode;
	appContext: {
		appType:
			| 'school'
			| 'education'
			| 'clinic'
			| 'hospital'
			| 'warehouse'
			| 'manufacturing'
			| 'hotel'
			| 'retail'
			| string;
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
	const { workflowEvents, isWorkflowStreaming } = useErpNextCopilot({
		appType: appContext.appType,
		currentPage: appContext.currentPage,
		userRole: appContext.userRole,
		appData: appContext.appData,
	});

	const canonicalIndustry = normalizeIndustry(appContext.appType);
	const appDisplayName = canonicalIndustry
		? INDUSTRY_DISPLAY_NAMES[canonicalIndustry]
		: toDisplayName(appContext.appType);
	const capabilitySummary = canonicalIndustry
		? INDUSTRY_CAPABILITIES[canonicalIndustry]
		: 'managing your ERPNext application';
	const agentSlug = canonicalIndustry
		? `${canonicalIndustry}_management_agent`
		: `${appContext.appType}_management_agent`;

	return (
		<CopilotKit
			runtimeUrl="/api/copilot/runtime"
			agent={agentSlug}
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
					initial: `Hi! I'm your ${appDisplayName} management assistant. I can help you with ${capabilitySummary}. What would you like to do?`,
				}}
			>
				{/* Inject recommendation cards above chat */}
				<div className="copilot-sidebar-content">
					<WorkflowStreamPanel events={workflowEvents} isStreaming={isWorkflowStreaming} />
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
