'use server';

import { type UIMessage } from 'ai';
import { cookies } from 'next/headers';
import type { VisibilityType } from '@/components/visibility-selector';
import {
	deleteMessagesByChatIdAfterTimestamp,
	getMessageById,
	updateChatVisiblityById,
} from '@/lib/db/queries';

export async function saveChatModelAsCookie(model: string) {
	const cookieStore = await cookies();
	cookieStore.set('chat-model', model);
}

export async function getChatModelFromCookie(): Promise<string | undefined> {
	const cookieStore = await cookies();
	return cookieStore.get('chat-model')?.value;
}

export async function generateTitleFromUserMessage({ message }: { message: UIMessage }) {
	const textContent = message.parts
		.filter((part) => part.type === 'text')
		.map((part) => part.text.trim())
		.join(' ')
		.trim();

	if (!textContent) {
		return 'New chat';
	}

	const words = textContent.split(/\s+/);
	const truncated = words.slice(0, 6).join(' ');
	return words.length > 6 ? `${truncated}…` : truncated;
}

export async function deleteTrailingMessages({ id }: { id: string }) {
	const [message] = await getMessageById({ id });

	await deleteMessagesByChatIdAfterTimestamp({
		chatId: message.chatId,
		timestamp: message.createdAt,
	});
}

export async function updateChatVisibility({
	chatId,
	visibility,
}: {
	chatId: string;
	visibility: VisibilityType;
}) {
	await updateChatVisiblityById({ chatId, visibility });
}
