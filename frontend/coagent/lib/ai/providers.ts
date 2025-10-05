import { createGoogleGenerativeAI } from '@ai-sdk/google';
import { createOpenRouter } from '@openrouter/ai-sdk-provider';
import { customProvider } from 'ai';
import { isTestEnvironment } from '../constants';

const google = createGoogleGenerativeAI({
	apiKey: process.env.GOOGLE_GENERATIVE_AI_API_KEY,
});

const openrouter = createOpenRouter({
	apiKey: process.env.OPENROUTER_API_KEY,
});

export const myProvider = isTestEnvironment
	? (() => {
			const { artifactModel, chatModel, reasoningModel, titleModel } = require('./models.mock');
			return customProvider({
				languageModels: {
					'chat-model': chatModel,
					'chat-model-reasoning': reasoningModel,
					'title-model': titleModel,
					'artifact-model': artifactModel,
				},
			});
		})()
	: customProvider({
			languageModels: {
				// Google AI Direct models
				'gemini-2.0-flash-exp': google('gemini-2.0-flash-exp'),
				'gemini-1.5-flash': google('gemini-1.5-flash'),
				'gemini-1.5-pro': google('gemini-1.5-pro'),

				// OpenRouter models
				'google/gemini-2.0-flash-exp:free': openrouter('google/gemini-2.0-flash-exp:free'),
				'google/gemini-flash-1.5:free': openrouter('google/gemini-flash-1.5:free'),
				'google/gemini-2.5-flash-lite-preview-09-2025': openrouter('google/gemini-2.5-flash-lite-preview-09-2025'),
				'google/gemini-pro-1.5': openrouter('google/gemini-pro-1.5'),
				'anthropic/claude-3.5-sonnet': openrouter('anthropic/claude-3.5-sonnet'),
				'z-ai/glm-4.6': openrouter('z-ai/glm-4.6'),

				// Legacy compatibility
				'title-model': google('gemini-1.5-flash'),
				'artifact-model': google('gemini-1.5-flash'),
			},
		});
