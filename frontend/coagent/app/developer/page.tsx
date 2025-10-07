import { CopilotKit } from '@copilotkit/react-core';
import { cookies } from 'next/headers';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import { generateUUID } from '@/lib/utils';
import { DeveloperChatWithArtifacts } from '@/components/developer/developer-chat-with-artifacts';
import { getChatById, getMessagesByChatId } from '@/lib/db/queries';
import type { ChatMessage } from '@/lib/types';

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

	// Fetch existing chat messages if chatId is provided
	let initialMessages: ChatMessage[] = [];
	if (existingChatId) {
		try {
			const chat = await getChatById({ id: existingChatId });
			if (chat) {
				const messages = await getMessagesByChatId({ id: existingChatId });
				initialMessages = messages as ChatMessage[];
			}
		} catch (error) {
			console.error('Failed to load chat:', error);
			// Fall back to empty messages
		}
	}

	return (
		<CopilotKit
			runtimeUrl="/api/copilot/developer"
			publicApiKey={process.env.NEXT_PUBLIC_COPILOTKIT_PUBLIC_API_KEY}
		>
			<DeveloperChatWithArtifacts
				autoResume={false}
				id={id}
				initialChatModel={savedModel}
				initialMessages={initialMessages}
				initialVisibilityType="private"
				isReadonly={false}
			/>
		</CopilotKit>
	);
}
