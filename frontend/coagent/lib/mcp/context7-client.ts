/*
 * Context7 MCP client
 * Fetches documentation snippets to enrich Claude prompts.
 */

export type Context7Source =
	| 'erpnext-docs'
	| 'frappe-docs'
	| 'copilotkit-docs'
	| 'langgraph-docs'
	| 'claude-sdk-docs'
	| (string & {});

export interface Context7FetchOptions {
	sources?: Context7Source[];
	maxResults?: number;
	cacheTtlMs?: number;
	signal?: AbortSignal;
}

interface CacheEntry {
	expiresAt: number;
	content: string;
}

function normaliseSources(sources?: Context7Source[]): Context7Source[] {
	return sources && sources.length > 0
		? Array.from(new Set(sources))
		: ['erpnext-docs', 'frappe-docs', 'copilotkit-docs', 'langgraph-docs', 'claude-sdk-docs'];
}

function buildCacheKey(query: string, sources: Context7Source[], maxResults: number) {
	return JSON.stringify({ query, sources: [...sources].sort(), maxResults });
}

export class Context7Client {
	private readonly baseUrl: string;
	private readonly cache = new Map<string, CacheEntry>();
	private readonly defaultMaxResults: number;
	private readonly defaultTtl: number;

	constructor({
		baseUrl = process.env.CONTEXT7_BASE_URL || 'https://api.context7.com/v1',
		defaultMaxResults = 3,
		defaultTtlMs = 1000 * 60 * 60,
	}: {
		baseUrl?: string;
		defaultMaxResults?: number;
		defaultTtlMs?: number;
	} = {}) {
		this.baseUrl = baseUrl.replace(/\/+$/, '');
		this.defaultMaxResults = defaultMaxResults;
		this.defaultTtl = defaultTtlMs;
	}

	async fetchDocs(
		queries: string[],
		options: Context7FetchOptions = {}
	): Promise<Map<string, string>> {
		if (!Array.isArray(queries) || queries.length === 0) {
			return new Map();
		}

		const sources = normaliseSources(options.sources);
		const maxResults = options.maxResults ?? this.defaultMaxResults;
		const ttl = options.cacheTtlMs ?? this.defaultTtl;
		const bearer = process.env.CONTEXT7_API_KEY;

		const results = new Map<string, string>();

		await Promise.all(
			queries.map(async (query) => {
				const trimmedQuery = query.trim();
				if (!trimmedQuery) {
					results.set(query, '');
					return;
				}

				const cacheKey = buildCacheKey(trimmedQuery, sources, maxResults);
				const cached = this.cache.get(cacheKey);
				if (cached && cached.expiresAt > Date.now()) {
					results.set(query, cached.content);
					return;
				}

				try {
					const response = await fetch(`${this.baseUrl}/search`, {
						method: 'POST',
						headers: {
							'Content-Type': 'application/json',
							...(bearer ? { Authorization: `Bearer ${bearer}` } : {}),
						},
						body: JSON.stringify({
							query: trimmedQuery,
							sources,
							maxResults,
						}),
						signal: options.signal,
					});

					if (!response.ok) {
						throw new Error(`Context7 request failed with status ${response.status}`);
					}

					const payload = await response.json().catch(() => ({ content: '' }));
					const content = this.extractContent(payload);

					this.cache.set(cacheKey, {
						expiresAt: Date.now() + ttl,
						content,
					});

					results.set(query, content);
				} catch (error) {
					if (process.env.NODE_ENV !== 'production') {
						console.warn('[Context7Client] fetchDocs error', error);
					}

					// Cache negative result briefly to avoid repeated failures
					this.cache.set(cacheKey, {
						expiresAt: Date.now() + Math.min(ttl, 1000 * 60),
						content: '',
					});
					results.set(query, '');
				}
			})
		);

		return results;
	}

	clearCache() {
		this.cache.clear();
	}

	private extractContent(payload: any): string {
		if (!payload) return '';

		if (typeof payload.content === 'string') {
			return payload.content;
		}

		if (Array.isArray(payload.content)) {
			return payload.content
				.map((entry) => {
					if (typeof entry === 'string') return entry;
					if (entry && typeof entry === 'object') {
						return entry.content || entry.text || '';
					}
					return '';
				})
				.filter(Boolean)
				.join('\n\n');
		}

		if (Array.isArray(payload.results)) {
			return payload.results
				.map((item) => {
					if (typeof item === 'string') return item;
					if (item && typeof item === 'object') {
						return item.content || item.text || '';
					}
					return '';
				})
				.filter(Boolean)
				.join('\n\n');
		}

		return '';
	}
}

export const context7Client = new Context7Client();
