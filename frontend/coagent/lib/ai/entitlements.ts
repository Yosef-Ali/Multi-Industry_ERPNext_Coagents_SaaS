import type { UserType } from '@/app/(auth)/auth';
import type { ChatModel } from './models';

type Entitlements = {
	maxMessagesPerDay: number;
	availableChatModelIds: ChatModel['id'][];
};

export const entitlementsByUserType: Record<UserType, Entitlements> = {
	/*
	 * For users without an account
	 */
	guest: {
		maxMessagesPerDay: 20,
		availableChatModelIds: [
			'gemini-2.0-flash-exp',
			'gemini-1.5-flash',
			'google/gemini-2.0-flash-exp:free',
			'google/gemini-flash-1.5:free',
		],
	},

	/*
	 * For users with an account
	 */
	regular: {
		maxMessagesPerDay: 100,
		availableChatModelIds: [
			'gemini-2.0-flash-exp',
			'gemini-1.5-flash',
			'gemini-1.5-pro',
			'google/gemini-2.0-flash-exp:free',
			'google/gemini-flash-1.5:free',
			'google/gemini-2.5-flash-lite-preview-09-2025',
			'google/gemini-pro-1.5',
			'anthropic/claude-3.5-sonnet',
			'z-ai/glm-4.6',
		],
	},

	/*
	 * TODO: For users with an account and a paid membership
	 */
};
