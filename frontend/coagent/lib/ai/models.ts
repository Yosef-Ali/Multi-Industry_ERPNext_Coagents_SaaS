export const DEFAULT_CHAT_MODEL: string = 'gemini-2.5-pro';

export type ChatModel = {
	id: string;
	name: string;
	description: string;
	provider: 'google' | 'openrouter';
};

export const chatModels: ChatModel[] = [
	{
		id: 'gemini-2.5-pro',
		name: 'Gemini 2.5 Pro (Free)',
		description: 'Google Gemini 2.5 Pro - Free tier via Google API',
		provider: 'google',
	},
	{
		id: 'meta-llama/llama-3.3-70b-instruct:free',
		name: 'Llama 3.3 70B Instruct (Free)',
		description: 'Meta Llama 3.3 70B - Free tier, 65K context',
		provider: 'openrouter',
	},
	{
		id: 'z-ai/glm-4.6',
		name: 'GLM-4.6',
		description: 'Z-AI GLM-4.6 - Paid tier',
		provider: 'openrouter',
	},
	{
		id: 'google/gemini-2.5-flash-lite-preview-09-2025',
		name: 'Gemini 2.5 Flash Lite (Preview)',
		description: 'Google Gemini 2.5 Flash Lite - Paid tier',
		provider: 'openrouter',
	},
	{
		id: 'mistralai/mistral-small-3.2-24b-instruct',
		name: 'Mistral Small 3.2 24B',
		description: 'Mistral Small 3.2 - 131K context, very affordable',
		provider: 'openrouter',
	},
	{
		id: 'mistralai/mixtral-8x7b-instruct',
		name: 'Mixtral 8x7B Instruct',
		description: 'Mistral Mixtral 8x7B - Balanced performance',
		provider: 'openrouter',
	},
];
