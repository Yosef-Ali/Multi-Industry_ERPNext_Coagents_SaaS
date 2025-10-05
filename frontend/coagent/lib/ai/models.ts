export const DEFAULT_CHAT_MODEL: string = 'google/gemini-2.0-flash-exp:free';

export type ChatModel = {
	id: string;
	name: string;
	description: string;
	provider: 'google' | 'openrouter';
};

export const chatModels: ChatModel[] = [
	// Google AI Direct models
	{
		id: 'gemini-2.0-flash-exp',
		name: 'Gemini 2.0 Flash',
		description: 'Fast and efficient Google model (Direct API)',
		provider: 'google',
	},
	{
		id: 'gemini-1.5-flash',
		name: 'Gemini 1.5 Flash',
		description: 'Balanced performance Google model (Direct API)',
		provider: 'google',
	},
	{
		id: 'gemini-1.5-pro',
		name: 'Gemini 1.5 Pro',
		description: 'Advanced reasoning Google model (Direct API)',
		provider: 'google',
	},

	// OpenRouter - Free Gemini models
	{
		id: 'google/gemini-2.0-flash-exp:free',
		name: 'Gemini 2.0 Flash (Free)',
		description: 'Latest Gemini via OpenRouter - Free tier',
		provider: 'openrouter',
	},
	{
		id: 'google/gemini-flash-1.5:free',
		name: 'Gemini 1.5 Flash (Free)',
		description: 'Fast Gemini via OpenRouter - Free tier',
		provider: 'openrouter',
	},

	// OpenRouter - Paid Gemini models
	{
		id: 'google/gemini-2.5-flash-lite-preview-09-2025',
		name: 'Gemini 2.5 Flash Lite',
		description: 'Latest lightweight Gemini preview model',
		provider: 'openrouter',
	},
	{
		id: 'google/gemini-pro-1.5',
		name: 'Gemini Pro 1.5',
		description: 'Advanced Gemini Pro via OpenRouter',
		provider: 'openrouter',
	},

	// OpenRouter - Other models
	{
		id: 'anthropic/claude-3.5-sonnet',
		name: 'Claude 3.5 Sonnet',
		description: 'Anthropic Claude via OpenRouter',
		provider: 'openrouter',
	},
	{
		id: 'z-ai/glm-4.6',
		name: 'GLM-4.6',
		description: 'Zhipu AI GLM-4.6 via OpenRouter',
		provider: 'openrouter',
	},
];
