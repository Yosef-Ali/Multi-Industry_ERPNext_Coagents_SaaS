import Anthropic from '@anthropic-ai/sdk';
import type { Messages } from '@anthropic-ai/sdk/resources/messages';
import { context7Client } from '@/lib/mcp/context7-client';

interface GenerateWithContextOptions {
	prompt: string;
	contextQueries?: string[];
	maxTokens?: number;
	streaming?: boolean;
	metadata?: Record<string, unknown>;
	tools?: any[];
}

interface RefineCodeOptions {
	currentCode: string;
	instruction: string;
	maxTokens?: number;
}

interface GenerateResponse {
	text: string;
	raw: unknown;
}

type AgentInstance = {
	run?: (input: any) => Promise<any>;
	runSingle?: (input: any) => Promise<any>;
	createMessage?: (input: any) => Promise<any>;
	stream?: (input: any) => AsyncIterable<any> | Promise<AsyncIterable<any>>;
};

let agentModulePromise: Promise<AgentInstance | null> | null = null;

async function loadAgentInstance(options: Record<string, unknown>): Promise<AgentInstance | null> {
	if (!agentModulePromise) {
		agentModulePromise = (async () => {
			try {
				// The SDK exposes either createClaudeAgent or ClaudeAgent class depending on version
				// eslint-disable-next-line @typescript-eslint/consistent-type-imports
				const mod: any = await import('@anthropic-ai/claude-agent-sdk');

				if (typeof mod.createClaudeAgent === 'function') {
					return await mod.createClaudeAgent(options);
				}

				if (typeof mod.ClaudeAgent === 'function') {
					return new mod.ClaudeAgent(options);
				}

				return null;
			} catch (error) {
				if (process.env.NODE_ENV !== 'production') {
					console.warn(
						'[ClaudeAgent] Failed to load Agent SDK, falling back to Messages API',
						error
					);
				}
				return null;
			}
		})();
	}

	return agentModulePromise;
}

function buildContextSection(docs: Map<string, string>): string {
	if (docs.size === 0) return '';

	return Array.from(docs.entries())
		.filter(([, content]) => content.trim().length > 0)
		.map(([query, content]) => `### ${query}\n${content}`)
		.join('\n\n');
}

export class ClaudeAgent {
	private readonly apiKey: string;
	private readonly model: string;
	private readonly baseSystemPrompt: string;
	private readonly settingSources: string[];
	private readonly defaultTools: any[];
	private fallbackClient: Anthropic | null = null;
	private agentInstance: Promise<AgentInstance | null> | null = null;

	constructor({
		apiKey = process.env.ANTHROPIC_API_KEY ?? '',
		model = process.env.CLAUDE_AGENT_MODEL ?? 'claude-3-5-sonnet-latest',
		settingSources = ['project'],
		systemPrompt = 'You are an ERPNext expert developer. Produce precise, production-ready ERPNext assets.',
		tools = [],
	}: {
		apiKey?: string;
		model?: string;
		settingSources?: string[];
		systemPrompt?: string; // Agent can be domain-specific (e.g., ERPNext)
		tools?: any[]; // Agent can use generic tools (Context7 fetches any library docs)
	} = {}) {
		this.apiKey = apiKey;
		this.model = model;
		this.baseSystemPrompt = systemPrompt;
		this.settingSources = settingSources;
		this.defaultTools = tools;

		if (!this.apiKey && process.env.NODE_ENV !== 'production') {
			console.warn('[ClaudeAgent] Missing ANTHROPIC_API_KEY environment variable.');
		}
	}

	async generateWithContext(options: GenerateWithContextOptions): Promise<GenerateResponse> {
		const {
			prompt,
			contextQueries = [],
			maxTokens = 4096,
			streaming = false,
			metadata,
			tools,
		} = options;

		// Fetch library docs via Context7 (generic: CopilotKit, LangGraph, React, ERPNext/Frappe, etc.)
		// Pass sources in fetchDocs options to target specific libraries
		const docs =
			contextQueries.length > 0 ? await context7Client.fetchDocs(contextQueries) : new Map();
		const contextSection = buildContextSection(docs);

		const system = contextSection
			? `${this.baseSystemPrompt}\n\nUse the following reference material when relevant:\n\n${contextSection}`
			: this.baseSystemPrompt;

		const agentInput = {
			model: this.model,
			system,
			messages: [
				{
					role: 'user',
					content: prompt,
				},
			],
			metadata,
			tools: tools ?? this.defaultTools,
			settingSources: this.settingSources,
			maxTokens,
		};

		const agent = await this.getAgentInstance();

		if (agent) {
			const response = await this.runAgent(agent, agentInput, streaming);
			return {
				text: this.extractAgentText(response),
				raw: response,
			};
		}

		const fallback = this.getFallbackClient();
		const result = await fallback.messages.create({
			model: this.model,
			max_tokens: maxTokens,
			system,
			messages: agentInput.messages as Messages.Message[],
		});

		return {
			text: this.extractMessagesText(result),
			raw: result,
		};
	}

	async refineCode(
		options: RefineCodeOptions
	): Promise<{ code: string; diff: string; raw: unknown }> {
		const { currentCode, instruction, maxTokens = 4096 } = options;

		const prompt = `You are refining an ERPNext artifact.\n\nCurrent code:\n\n\`\`\`\n${currentCode}\n\`\`\`\n\nInstructions:\n${instruction}\n\nReturn the updated code. If possible, also include a unified diff snippet.`;

		const response = await this.generateWithContext({ prompt, maxTokens });

		const { code, diff } = this.splitCodeAndDiff(response.text);

		return { code, diff, raw: response.raw };
	}

	private async getAgentInstance(): Promise<AgentInstance | null> {
		if (!this.agentInstance) {
			this.agentInstance = loadAgentInstance({
				apiKey: this.apiKey,
				model: this.model,
				settingSources: this.settingSources,
				permissionMode: 'allow',
				allowedTools: this.defaultTools?.map?.((tool) => tool?.name ?? tool) ?? undefined,
			});
		}

		return this.agentInstance;
	}

	private getFallbackClient(): Anthropic {
		if (!this.fallbackClient) {
			this.fallbackClient = new Anthropic({ apiKey: this.apiKey });
		}
		return this.fallbackClient;
	}

	private async runAgent(agent: AgentInstance, input: any, streaming: boolean): Promise<any> {
		if (streaming) {
			if (typeof agent.stream === 'function') {
				return agent.stream(input);
			}
		}

		if (typeof agent.run === 'function') {
			return agent.run(input);
		}

		if (typeof agent.runSingle === 'function') {
			return agent.runSingle(input);
		}

		if (typeof agent.createMessage === 'function') {
			return agent.createMessage(input);
		}

		return input;
	}

	private extractAgentText(response: any): string {
		if (!response) return '';

		if (typeof response === 'string') {
			return response;
		}

		if (response.text) {
			return response.text;
		}

		if (Array.isArray(response.output?.messages)) {
			return response.output.messages
				.map((message: any) => message.content ?? '')
				.filter(Boolean)
				.join('\n');
		}

		if (Array.isArray(response.messages)) {
			return response.messages
				.map((message: any) => message.content ?? '')
				.filter(Boolean)
				.join('\n');
		}

		return '';
	}

	private extractMessagesText(message: Messages.Message): string {
		if (!message) return '';

		if (Array.isArray(message.content)) {
			return message.content
				.map((part: any) => {
					if (part?.type === 'text') {
						return part.text;
					}
					return '';
				})
				.join('');
		}

		return '';
	}

	private splitCodeAndDiff(text: string): { code: string; diff: string } {
		if (!text) {
			return { code: '', diff: '' };
		}

		const codeMatch = text.match(/```(?:json|python|javascript|ts|tsx)?\n([\s\S]*?)```/);
		const diffMatch = text.match(/```diff\n([\s\S]*?)```/);

		return {
			code: codeMatch ? codeMatch[1].trim() : text.trim(),
			diff: diffMatch ? diffMatch[1].trim() : '',
		};
	}
}

export const claudeAgent = new ClaudeAgent();
