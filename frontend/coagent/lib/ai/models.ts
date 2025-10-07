export const DEFAULT_CHAT_MODEL: string = 'meta-llama/llama-3.3-70b-instruct:free';

export type ModelProvider = 'google' | 'openrouter' | 'cloudflare' | 'anthropic';
export type ModelTier = 'free' | 'paid';

export type ModelCapabilities = {
	supportsTools: boolean;
	supportsStreaming: boolean;
	supportsVision: boolean;
	supportsJSON: boolean;
	maxContextWindow: number;
};

export type ModelPricing = {
	inputCostPer1K: number;
	outputCostPer1K: number;
	currency: string;
	isFree: boolean;
};

export type ChatModel = {
	id: string;
	name: string;
	description: string;
	provider: ModelProvider;
	tier: ModelTier;
	capabilities: ModelCapabilities;
	pricing: ModelPricing;
	available: boolean;
	legacyIds?: string[];
	metadata?: Record<string, unknown>;
};

const defaultCapabilities: ModelCapabilities = {
	supportsTools: true,
	supportsStreaming: true,
	supportsVision: false,
	supportsJSON: true,
	maxContextWindow: 128000,
};

const defaultPricing: ModelPricing = {
	inputCostPer1K: 0,
	outputCostPer1K: 0,
	currency: 'USD',
	isFree: true,
};

export const chatModels: ChatModel[] = [
	{
		id: 'gemini-2.5-pro',
		name: 'Gemini 2.5 Pro (Free)',
		description: 'Google Gemini 2.5 Pro - Free tier via Google API',
		provider: 'google',
		tier: 'free',
		capabilities: {
			...defaultCapabilities,
			supportsVision: true,
			maxContextWindow: 2000000,
		},
		pricing: {
			...defaultPricing,
			isFree: true,
		},
		available: true,
		legacyIds: ['gemini-2.0-flash-exp'],
	},
	{
		id: 'meta-llama/llama-3.3-70b-instruct:free',
		name: 'Llama 3.3 70B Instruct (Free)',
		description: 'Meta Llama 3.3 70B - Free tier, 65K context',
		provider: 'openrouter',
		tier: 'free',
		capabilities: {
			...defaultCapabilities,
			maxContextWindow: 65000,
		},
		pricing: {
			...defaultPricing,
			isFree: true,
		},
		available: true,
	},
	{
		id: 'z-ai/glm-4.6',
		name: 'GLM-4.6',
		description: 'Z-AI GLM-4.6 - Paid tier',
		provider: 'openrouter',
		tier: 'paid',
		capabilities: {
			...defaultCapabilities,
			maxContextWindow: 200000,
		},
		pricing: {
			inputCostPer1K: 0.09,
			outputCostPer1K: 0.09,
			currency: 'USD',
			isFree: false,
		},
		available: true,
	},
	{
		id: 'google/gemini-2.5-flash-lite-preview-09-2025',
		name: 'Gemini 2.5 Flash Lite (Preview)',
		description: 'Google Gemini 2.5 Flash Lite - Fast paid tier via OpenRouter',
		provider: 'openrouter',
		tier: 'paid',
		capabilities: {
			...defaultCapabilities,
			maxContextWindow: 1000000,
		},
		pricing: {
			inputCostPer1K: 0.075,
			outputCostPer1K: 0.3,
			currency: 'USD',
			isFree: false,
		},
		available: true,
	},
	{
		id: 'mistralai/mistral-small-3.2-24b-instruct',
		name: 'Mistral Small 3.2 24B',
		description: 'Mistral Small 3.2 - 131K context, very affordable',
		provider: 'openrouter',
		tier: 'paid',
		capabilities: {
			...defaultCapabilities,
			maxContextWindow: 131000,
		},
		pricing: {
			inputCostPer1K: 0.06,
			outputCostPer1K: 0.24,
			currency: 'USD',
			isFree: false,
		},
		available: true,
	},
	{
		id: 'mistralai/mixtral-8x7b-instruct',
		name: 'Mixtral 8x7B Instruct',
		description: 'Mistral Mixtral 8x7B - Balanced performance',
		provider: 'openrouter',
		tier: 'paid',
		capabilities: {
			...defaultCapabilities,
			maxContextWindow: 128000,
		},
		pricing: {
			inputCostPer1K: 0.27,
			outputCostPer1K: 0.27,
			currency: 'USD',
			isFree: false,
		},
		available: true,
	},
];

type FetchAvailableModelsOptions = {
	tier?: 'guest' | 'regular' | 'premium';
	fetchOptions?: RequestInit;
};

const MODELS_API_ROUTE = '/api/models';
const DEFAULT_TIMEOUT_MS = 5000;

const normalizeModel = (model: Partial<ChatModel> & { id: string }): ChatModel => {
	return {
		...model,
		name: model.name ?? model.id,
		description: model.description ?? 'No description provided',
		provider: model.provider ?? 'openrouter',
		tier: model.tier ?? ((model.pricing?.isFree ?? true) ? 'free' : 'paid'),
		capabilities: {
			...defaultCapabilities,
			...(model.capabilities ?? {}),
		},
		pricing: {
			...defaultPricing,
			...(model.pricing ?? {}),
		},
		available: model.available ?? true,
		legacyIds: model.legacyIds ?? [],
		metadata: model.metadata,
	};
};

const normalizeModels = (models: unknown): ChatModel[] => {
	if (!Array.isArray(models)) {
		return chatModels;
	}

	return models
		.filter((entry): entry is Partial<ChatModel> & { id: string } => Boolean(entry?.id))
		.map(normalizeModel);
};

const createTimeoutSignal = (timeoutMs: number): AbortSignal | undefined => {
	if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout === 'function') {
		return AbortSignal.timeout(timeoutMs);
	}

	if (typeof AbortController === 'undefined') {
		return undefined;
	}

	const controller = new AbortController();
	setTimeout(() => controller.abort(), timeoutMs);
	return controller.signal;
};

const isBrowser = typeof window !== 'undefined';

const resolveBaseUrl = (): string => {
	if (isBrowser) {
		return '';
	}

	const deploymentUrl = process.env.NEXT_PUBLIC_APP_URL || process.env.VERCEL_URL;
	if (deploymentUrl) {
		return deploymentUrl.startsWith('http') ? deploymentUrl : `https://${deploymentUrl}`;
	}

	const protocol = process.env.HTTPS === 'true' ? 'https' : 'http';
	const host = process.env.HOST || 'localhost';
	const port = process.env.PORT || '3000';
	return `${protocol}://${host}:${port}`;
};

const fetchFromApiRoute = async (options: FetchAvailableModelsOptions): Promise<ChatModel[] | null> => {
	try {
		const searchParams = new URLSearchParams();
		if (options.tier) {
			searchParams.set('tier', options.tier);
		}

		const path = searchParams.size > 0 ? `${MODELS_API_ROUTE}?${searchParams.toString()}` : MODELS_API_ROUTE;
		const requestUrl = isBrowser ? path : new URL(path, resolveBaseUrl()).toString();

		const fetchInit: RequestInit = {
			cache: 'no-store',
			signal: options.fetchOptions?.signal ?? createTimeoutSignal(DEFAULT_TIMEOUT_MS),
			...(options.fetchOptions ?? {}),
		};

		if (isBrowser) {
			fetchInit.credentials = 'include';
		}

		const response = await fetch(requestUrl, fetchInit);

		if (!response.ok) {
			throw new Error(`Models API returned ${response.status}`);
		}

		const data = await response.json();
		return normalizeModels((data as { models?: unknown }).models);
	} catch (error) {
		console.warn('[Models] Failed to load models from API route:', error);
		return null;
	}
};

const fetchFromGateway = async (options: FetchAvailableModelsOptions): Promise<ChatModel[] | null> => {
	const gatewayUrl = process.env.AGENT_GATEWAY_URL || process.env.NEXT_PUBLIC_AGENT_GATEWAY_URL;

	if (!gatewayUrl) {
		return null;
	}

	try {
		const url = new URL('/api/models', gatewayUrl);
		url.searchParams.set('tier', options.tier ?? 'guest');

		const response = await fetch(url.toString(), {
			cache: 'no-store',
			headers: {
				'Content-Type': 'application/json',
			},
			signal: options.fetchOptions?.signal ?? createTimeoutSignal(DEFAULT_TIMEOUT_MS),
			...(options.fetchOptions ?? {}),
		});

		if (!response.ok) {
			throw new Error(`Gateway returned ${response.status}`);
		}

		const data = await response.json();
		return normalizeModels((data as { models?: unknown }).models);
	} catch (error) {
		console.warn('[Models] Failed to load models from gateway:', error);
		return null;
	}
};

export async function fetchAvailableModels(options: FetchAvailableModelsOptions = {}): Promise<ChatModel[]> {
	if (isBrowser) {
		const models = await fetchFromApiRoute(options);
		return models && models.length > 0 ? models : chatModels;
	}

	const gatewayModels = await fetchFromGateway(options);
	if (gatewayModels && gatewayModels.length > 0) {
		return gatewayModels;
	}

	const apiModels = await fetchFromApiRoute(options);
	if (apiModels && apiModels.length > 0) {
		return apiModels;
	}

	return chatModels;
}

export function getModelById(modelId: string, models: ChatModel[] = chatModels): ChatModel | undefined {
	return models.find(model => model.id === modelId);
}

export function getModelByIdWithFallback(
	modelId: string,
	models: ChatModel[] = chatModels
): ChatModel | undefined {
	if (!modelId) {
		return undefined;
	}

	const trimmedId = modelId.trim();
	const directMatch = getModelById(trimmedId, models);
	if (directMatch) {
		return directMatch;
	}

	const legacyMatch = models.find(model => model.legacyIds?.includes(trimmedId));
	if (legacyMatch) {
		console.log(`[Models] Mapped legacy model id '${trimmedId}' to '${legacyMatch.id}'`);
		return legacyMatch;
	}

	return undefined;
}

export function listModelIds(models: ChatModel[] = chatModels): string[] {
	return models.map(model => model.id);
}
