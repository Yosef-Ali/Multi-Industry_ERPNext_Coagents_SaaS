import 'server-only';

import type { ArtifactKind } from '@/components/artifact';
import { getDefaultUser } from '@/lib/session';
import type { AppUsage } from '@/lib/usage';
import { generateUUID } from '@/lib/utils';

import type { Chat, DBMessage, Document, Suggestion, Stream, User, Vote } from './schema';
import { ChatSDKError } from '../errors';

const usersById = new Map<string, User>();
const usersByEmail = new Map<string, User>();
const chatsById = new Map<string, Chat>();
const messagesById = new Map<string, DBMessage>();
const messagesByChatId = new Map<string, DBMessage[]>();
const votesByChatId = new Map<string, Map<string, Vote>>();
const documentsById = new Map<string, Document[]>();
const suggestionsByDocumentId = new Map<string, Suggestion[]>();
const streamsByChatId = new Map<string, Stream[]>();

const defaultUser = getDefaultUser();
usersById.set(defaultUser.id, defaultUser);
usersByEmail.set(defaultUser.email, defaultUser);

function ensureChatChatArray(chatId: string) {
	if (!messagesByChatId.has(chatId)) {
		messagesByChatId.set(chatId, []);
	}
}

function ensureVoteMap(chatId: string) {
	if (!votesByChatId.has(chatId)) {
		votesByChatId.set(chatId, new Map());
	}
}

function ensureDocumentArray(documentId: string) {
	if (!documentsById.has(documentId)) {
		documentsById.set(documentId, []);
	}
}

function ensureSuggestionArray(documentId: string) {
	if (!suggestionsByDocumentId.has(documentId)) {
		suggestionsByDocumentId.set(documentId, []);
	}
}

function ensureStreamArray(chatId: string) {
	if (!streamsByChatId.has(chatId)) {
		streamsByChatId.set(chatId, []);
	}
}

export async function getUser(email: string): Promise<User[]> {
	const user = usersByEmail.get(email);
	return user ? [user] : [];
}

export async function createUser(email: string, password: string) {
	const existingUser = usersByEmail.get(email);
	if (existingUser) {
		return existingUser;
	}

	const newUser: User = {
		id: generateUUID(),
		email,
		password,
		type: 'regular',
	};

	usersById.set(newUser.id, newUser);
	usersByEmail.set(email, newUser);

	return newUser;
}

export async function createGuestUser() {
	return [defaultUser];
}

export async function saveChat({
	id,
	userId,
	title,
	visibility,
}: {
	id: string;
	userId: string;
	title: string;
	visibility: 'public' | 'private';
}) {
	const chat: Chat = {
		id,
		createdAt: new Date(),
		title,
		userId,
		visibility,
		lastContext: null,
	};

	chatsById.set(id, chat);
	ensureChatChatArray(id);
	ensureStreamArray(id);

	return chat;
}

export async function deleteChatById({ id }: { id: string }) {
	const chat = chatsById.get(id);
	if (!chat) {
		throw new ChatSDKError('not_found:chat', `Chat with id ${id} not found`);
	}

	chatsById.delete(id);
	messagesByChatId.delete(id);
	votesByChatId.delete(id);
	streamsByChatId.delete(id);

	for (const [messageId, message] of messagesById) {
		if (message.chatId === id) {
			messagesById.delete(messageId);
		}
	}

	return chat;
}

export async function getChatsByUserId({
	id,
	limit,
	startingAfter,
	endingBefore,
}: {
	id: string;
	limit: number;
	startingAfter: string | null;
	endingBefore: string | null;
}) {
	const chats = Array.from(chatsById.values())
		.filter((chat) => chat.userId === id)
		.sort((a, b) => b.createdAt.getTime() - a.createdAt.getTime());

	let filteredChats = chats;

	if (startingAfter) {
		const index = chats.findIndex((chat) => chat.id === startingAfter);
		if (index === -1) {
			throw new ChatSDKError('not_found:chat', `Chat with id ${startingAfter} not found`);
		}

		const referenceChat = chats[index];
		filteredChats = chats.filter(
			(chat) => chat.createdAt.getTime() > referenceChat.createdAt.getTime()
		);
	} else if (endingBefore) {
		const index = chats.findIndex((chat) => chat.id === endingBefore);
		if (index === -1) {
			throw new ChatSDKError('not_found:chat', `Chat with id ${endingBefore} not found`);
		}

		const referenceChat = chats[index];
		filteredChats = chats.filter(
			(chat) => chat.createdAt.getTime() < referenceChat.createdAt.getTime()
		);
	}

	const hasMore = filteredChats.length > limit;
	const paginatedChats = hasMore ? filteredChats.slice(0, limit) : filteredChats;

	return {
		chats: paginatedChats,
		hasMore,
	};
}

export async function getChatById({ id }: { id: string }) {
	return chatsById.get(id) ?? null;
}

export async function saveMessages({ messages }: { messages: DBMessage[] }) {
	for (const message of messages) {
		const storedMessage: DBMessage = { ...message };
		messagesById.set(storedMessage.id, storedMessage);
		ensureChatChatArray(storedMessage.chatId);

		const chatMessages = messagesByChatId.get(storedMessage.chatId)!;
		chatMessages.push(storedMessage);
		chatMessages.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
	}
}

export async function getMessagesByChatId({ id }: { id: string }) {
	ensureChatChatArray(id);
	const messages = messagesByChatId.get(id)!;
	return messages.map((message) => ({ ...message }));
}

export async function voteMessage({
	chatId,
	messageId,
	type,
}: {
	chatId: string;
	messageId: string;
	type: 'up' | 'down';
}) {
	ensureVoteMap(chatId);

	const voteMap = votesByChatId.get(chatId)!;
	const vote: Vote = {
		chatId,
		messageId,
		isUpvoted: type === 'up',
	};

	voteMap.set(messageId, vote);

	return vote;
}

export async function getVotesByChatId({ id }: { id: string }) {
	ensureVoteMap(id);
	return Array.from(votesByChatId.get(id)!.values()).map((vote) => ({ ...vote }));
}

export async function saveDocument({
	id,
	title,
	kind,
	content,
	userId,
}: {
	id: string;
	title: string;
	kind: ArtifactKind;
	content: string;
	userId: string;
}) {
	const document: Document = {
		id,
		title,
		kind,
		content,
		userId,
		createdAt: new Date(),
	};

	ensureDocumentArray(id);
	const docs = documentsById.get(id)!;
	docs.push(document);
	docs.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

	return [document];
}

export async function getDocumentsById({ id }: { id: string }) {
	ensureDocumentArray(id);
	return documentsById.get(id)!.map((doc) => ({ ...doc }));
}

export async function getDocumentById({ id }: { id: string }) {
	ensureDocumentArray(id);
	const docs = documentsById.get(id)!;
	return docs.length ? { ...docs[docs.length - 1] } : null;
}

export async function deleteDocumentsByIdAfterTimestamp({
	id,
	timestamp,
}: {
	id: string;
	timestamp: Date;
}) {
	ensureDocumentArray(id);
	const docs = documentsById.get(id)!;
	const remaining = docs.filter((doc) => doc.createdAt.getTime() <= timestamp.getTime());
	documentsById.set(id, remaining);

	const suggestions = suggestionsByDocumentId.get(id);
	if (suggestions) {
		suggestionsByDocumentId.set(
			id,
			suggestions.filter(
				(suggestion) => suggestion.documentCreatedAt.getTime() <= timestamp.getTime()
			)
		);
	}

	return docs.filter((doc) => doc.createdAt.getTime() > timestamp.getTime());
}

export async function saveSuggestions({ suggestions }: { suggestions: Suggestion[] }) {
	for (const suggestion of suggestions) {
		ensureSuggestionArray(suggestion.documentId);
		const existing = suggestionsByDocumentId.get(suggestion.documentId)!;
		existing.push({ ...suggestion });
	}
}

export async function getSuggestionsByDocumentId({ documentId }: { documentId: string }) {
	ensureSuggestionArray(documentId);
	return suggestionsByDocumentId.get(documentId)!.map((suggestion) => ({ ...suggestion }));
}

export async function getMessageById({ id }: { id: string }) {
	const message = messagesById.get(id);
	return message ? [{ ...message }] : [];
}

export async function deleteMessagesByChatIdAfterTimestamp({
	chatId,
	timestamp,
}: {
	chatId: string;
	timestamp: Date;
}) {
	ensureChatChatArray(chatId);
	const messages = messagesByChatId.get(chatId)!;
	const remaining = messages.filter((message) => message.createdAt.getTime() < timestamp.getTime());
	const removed = messages.filter((message) => message.createdAt.getTime() >= timestamp.getTime());

	messagesByChatId.set(chatId, remaining);

	for (const message of removed) {
		messagesById.delete(message.id);
		const voteMap = votesByChatId.get(chatId);
		if (voteMap) {
			voteMap.delete(message.id);
		}
	}
}

export async function updateChatVisiblityById({
	chatId,
	visibility,
}: {
	chatId: string;
	visibility: 'private' | 'public';
}) {
	const chat = chatsById.get(chatId);
	if (chat) {
		chat.visibility = visibility;
	}
}

export async function updateChatLastContextById({
	chatId,
	context,
}: {
	chatId: string;
	context: AppUsage;
}) {
	const chat = chatsById.get(chatId);
	if (chat) {
		chat.lastContext = context;
	}
}

export async function getMessageCountByUserId({
	id,
	differenceInHours,
}: {
	id: string;
	differenceInHours: number;
}) {
	const threshold = Date.now() - differenceInHours * 60 * 60 * 1000;

	let count = 0;

	for (const message of messagesById.values()) {
		if (message.role !== 'user') {
			continue;
		}

		if (message.createdAt.getTime() < threshold) {
			continue;
		}

		const chat = chatsById.get(message.chatId);
		if (chat?.userId === id) {
			count += 1;
		}
	}

	return count;
}

export async function createStreamId({ streamId, chatId }: { streamId: string; chatId: string }) {
	ensureStreamArray(chatId);
	const streams = streamsByChatId.get(chatId)!;

	const stream: Stream = {
		id: streamId,
		chatId,
		createdAt: new Date(),
	};

	streams.push(stream);
	streams.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());
}

export async function getStreamIdsByChatId({ chatId }: { chatId: string }) {
	ensureStreamArray(chatId);
	return streamsByChatId.get(chatId)!.map((stream) => stream.id);
}
