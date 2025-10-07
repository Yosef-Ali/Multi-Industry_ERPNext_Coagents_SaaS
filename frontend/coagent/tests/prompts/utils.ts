type PromptMessageContent = {
	type: string;
	text?: string;
};

type PromptMessage = {
	role?: string;
	content?: PromptMessageContent[];
};

type PromptLike = {
	messages?: PromptMessage[];
};

const DEFAULT_RESPONSE = 'This is a mocked streaming response.';

const toStringSafe = (value: unknown) => {
	if (typeof value === 'string') {
		return value;
	}

	if (Array.isArray((value as PromptMessage)?.content)) {
		return extractTextFromMessages([{ content: (value as PromptMessage).content }]);
	}

	if (typeof value === 'object' && value !== null) {
		const maybePrompt = value as PromptLike;
		if (Array.isArray(maybePrompt.messages)) {
			return extractTextFromMessages(maybePrompt.messages);
		}
		return JSON.stringify(value);
	}

	return '';
};

const extractTextFromMessages = (messages: PromptMessage[] = []) => {
	const parts: string[] = [];

	for (const message of messages) {
		if (!Array.isArray(message.content)) continue;

		for (const part of message.content) {
			if (part?.type === 'text' && typeof part.text === 'string') {
				parts.push(part.text);
			}
		}
	}

	return parts.join(' ').trim();
};

const chunkText = (text: string): string[] => {
	const clean = text.trim();
	if (!clean) {
		return [DEFAULT_RESPONSE];
	}

	const words = clean.split(/\s+/);
	const chunks: string[] = [];
	let current = '';

	for (const word of words) {
		const candidate = current ? `${current} ${word}` : word;
		if (candidate.length > 60 && current) {
			chunks.push(current);
			current = word;
		} else {
			current = candidate;
		}
	}

	if (current) {
		chunks.push(current);
	}

	return chunks.length > 0 ? chunks : [DEFAULT_RESPONSE];
};

type StreamChunk =
	| { id: string; type: 'text-start' }
	| { id: string; type: 'text-delta'; delta: string }
	| { id: string; type: 'text-end' }
	| {
			type: 'finish';
			finishReason: 'stop';
			usage: { inputTokens: number; outputTokens: number; totalTokens: number };
	  }
	| { type: 'reasoning-start'; id: string }
	| { type: 'reasoning-delta'; id: string; delta: string }
	| { type: 'reasoning-end'; id: string };

export const getResponseChunksByPrompt = (
	prompt: unknown,
	includeReasoning = false
): StreamChunk[] => {
	const extracted = toStringSafe(prompt);
	const chunksText = chunkText(extracted);
	const baseId = 'mock-response';
	const streamChunks: StreamChunk[] = [{ id: baseId, type: 'text-start' }];

	if (includeReasoning) {
		streamChunks.push({ type: 'reasoning-start', id: `${baseId}-reasoning` });
		streamChunks.push({
			type: 'reasoning-delta',
			id: `${baseId}-reasoning`,
			delta: 'Analyzing request...',
		});
		streamChunks.push({ type: 'reasoning-end', id: `${baseId}-reasoning` });
	}

	for (const delta of chunksText) {
		if (!delta) continue;
		streamChunks.push({ id: baseId, type: 'text-delta', delta });
	}

	streamChunks.push({ id: baseId, type: 'text-end' });

	const outputTokens = chunksText.join(' ').split(/\s+/).filter(Boolean).length * 4;
	const inputTokens = Math.max(8, Math.ceil(extracted.length / 4));
	const totalTokens = inputTokens + outputTokens;

	streamChunks.push({
		type: 'finish',
		finishReason: 'stop',
		usage: { inputTokens, outputTokens, totalTokens },
	});

	return streamChunks;
};
