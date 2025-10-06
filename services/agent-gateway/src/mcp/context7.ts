import { z } from 'zod';

/**
 * Context7 MCP Client (stub)
 *
 * Provides a typed wrapper to fetch library documentation/snippets/examples for grounding.
 * Supports any library: CopilotKit, LangGraph, React, ERPNext/Frappe, etc.
 * Real network calls should be implemented behind the `fetcher` function; for now,
 * this returns a safe mock if env/config is missing.
 */

export const Context7SearchInput = z.object({
  query: z.string().min(1),
  libraryId: z.string().optional(), // e.g., "/frappe/frappe" or autodetected
  limit: z.number().int().min(1).max(50).default(10),
});

export const Context7SearchResultItem = z.object({
  title: z.string(),
  snippet: z.string().optional(),
  url: z.string().url().optional(),
  score: z.number().optional(),
});

export const Context7SearchOutput = z.object({
  items: z.array(Context7SearchResultItem),
});

export type Context7SearchInput = z.infer<typeof Context7SearchInput>;
export type Context7SearchOutput = z.infer<typeof Context7SearchOutput>;

export interface Context7ClientOptions {
  apiKey?: string;
  baseUrl?: string; // optional override
  fetcher?: typeof fetch;
}

export class Context7Client {
  private apiKey?: string;
  private baseUrl: string;
  private fetcher: typeof fetch;

  constructor(options: Context7ClientOptions = {}) {
    this.apiKey = options.apiKey ?? process.env.CONTEXT7_API_KEY;
    this.baseUrl = options.baseUrl ?? (process.env.CONTEXT7_BASE_URL || '');
    this.fetcher = options.fetcher ?? globalThis.fetch.bind(globalThis);
  }

  /**
   * Search library documentation snippets (CopilotKit, LangGraph, React, ERPNext/Frappe, etc.).
   * Returns mock data if not configured to avoid hard-failing dev.
   */
  async searchDocs(input: Context7SearchInput): Promise<Context7SearchOutput> {
    const validated = Context7SearchInput.parse(input);

    if (!this.apiKey || !this.baseUrl) {
      return {
        items: [
          {
            title: 'Context7 not configured — returning mock result',
            snippet:
              `Query: ${validated.query}${validated.libraryId ? ` (library: ${validated.libraryId})` : ''}. Configure CONTEXT7_API_KEY and CONTEXT7_BASE_URL to enable live documentation search.`,
          },
        ],
      };
    }

    try {
      const url = new URL('/search', this.baseUrl);
      url.searchParams.set('q', validated.query);
      if (validated.libraryId) url.searchParams.set('lib', validated.libraryId);
      url.searchParams.set('limit', String(validated.limit));

      const res = await this.fetcher(url.toString(), {
        headers: {
          Authorization: `Bearer ${this.apiKey}`,
        },
      });

      if (!res.ok) {
        throw new Error(`Context7 error ${res.status}: ${await res.text()}`);
      }

      const data = await res.json();
      // Best-effort normalization
      const items = Array.isArray(data?.items)
        ? data.items.map((it: any) => ({
            title: String(it.title ?? 'Untitled'),
            snippet: typeof it.snippet === 'string' ? it.snippet : undefined,
            url: typeof it.url === 'string' ? it.url : undefined,
            score: typeof it.score === 'number' ? it.score : undefined,
          }))
        : [];
      return { items };
    } catch (error) {
      // Safe fallback
      return {
        items: [
          {
            title: 'Context7 request failed — using fallback',
            snippet: String((error as Error)?.message ?? 'Unknown error'),
          },
        ],
      };
    }
  }
}

