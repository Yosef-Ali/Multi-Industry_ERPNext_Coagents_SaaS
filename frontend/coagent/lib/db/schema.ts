import type { ArtifactKind } from '@/components/artifact';
import type { AppUsage } from '../usage';

export type User = {
	id: string;
	email: string;
	password?: string | null;
	type?: 'guest' | 'regular';
};

export type Chat = {
	id: string;
	createdAt: Date;
	title: string;
	userId: string;
	visibility: 'public' | 'private';
	lastContext: AppUsage | null;
};

export type DBMessage = {
	id: string;
	chatId: string;
	role: string;
	parts: any[];
	attachments: any[];
	createdAt: Date;
};

export type Vote = {
	chatId: string;
	messageId: string;
	isUpvoted: boolean;
};

export type Document = {
	id: string;
	createdAt: Date;
	title: string;
	content?: string | null;
	kind: ArtifactKind;
	userId: string;
};

export type Suggestion = {
	id: string;
	documentId: string;
	documentCreatedAt: Date;
	originalText: string;
	suggestedText: string;
	description?: string | null;
	isResolved: boolean;
	userId: string;
	createdAt: Date;
};

export type Stream = {
	id: string;
	chatId: string;
	createdAt: Date;
};
