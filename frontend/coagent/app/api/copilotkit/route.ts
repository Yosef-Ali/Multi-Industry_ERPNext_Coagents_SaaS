import { CopilotRuntime, GoogleGenerativeAIAdapter } from '@copilotkit/runtime';
import type { NextRequest } from 'next/server';

export const maxDuration = 60;

export async function POST(req: NextRequest) {
	const copilotKit = new CopilotRuntime();

	const model = process.env.GOOGLE_GENERATIVE_AI_MODEL ?? 'gemini-2.5-flash';
	const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;

	const serviceAdapter = new GoogleGenerativeAIAdapter({
		model,
		...(apiKey ? { apiKey } : {}),
	});

	return copilotKit.response(req, serviceAdapter);
}
