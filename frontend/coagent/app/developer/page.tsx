import { CopilotKit } from '@copilotkit/react-core';
import { cookies } from 'next/headers';
import { AppSidebar } from '@/components/app-sidebar';
import { DataStreamProvider } from '@/components/data-stream-provider';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import { generateUUID } from '@/lib/utils';
import { DeveloperChatWithArtifacts } from '@/components/developer/developer-chat-with-artifacts';

export default async function Page({
	searchParams,
}: {
	searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
	const params = await searchParams;
	const existingChatId = params.chatId as string | undefined;
	const id = existingChatId ?? generateUUID();

	// Get saved model from cookie
	const cookieStore = await cookies();
	const savedModel = cookieStore.get('chat-model')?.value || DEFAULT_CHAT_MODEL;

	// Skip authentication for development - use guest mode
	const guestUser = {
		id: 'guest',
		email: 'guest@erpnext.local',
		name: 'Guest User',
		type: 'guest' as const,
	};

	return (
		<CopilotKit runtimeUrl="/api/copilot/developer">
			<DataStreamProvider>
				<SidebarProvider defaultOpen={true}>
					<AppSidebar user={guestUser} />
					<SidebarInset>
						<DeveloperChatWithArtifacts
							autoResume={false}
							id={id}
							initialChatModel={savedModel}
							initialMessages={[]}
							initialVisibilityType="private"
							isReadonly={false}
						/>
					</SidebarInset>
				</SidebarProvider>
			</DataStreamProvider>
		</CopilotKit>
	);
}
