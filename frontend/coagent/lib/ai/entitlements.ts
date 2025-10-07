import type { UserType } from '@/lib/session';
import type { ChatModel } from './models';

type Entitlements = {
	maxMessagesPerDay: number;
	availableChatModelIds: ChatModel['id'][];
};

export const entitlementsByUserType: Record<UserType, Entitlements> = {
	/*
	 * For users without an account (guest)
	 */
	guest: {
		maxMessagesPerDay: 20,
		availableChatModelIds: [
			'gemini-2.5-pro',
			'google/gemini-2.5-flash-lite-preview-09-2025',
			'z-ai/glm-4.6',
		],
	},

	/*
	 * For users with an account
	 */
	regular: {
		maxMessagesPerDay: 100,
		availableChatModelIds: [
			'gemini-2.5-pro',
			'google/gemini-2.5-flash-lite-preview-09-2025',
			'z-ai/glm-4.6',
		],
	},

	/*
	 * TODO: For users with an account and a paid membership
	 */
};
