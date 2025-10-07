import { z } from 'zod';
import { chatModels } from '@/lib/ai/models';

const textPartSchema = z.object({
	type: z.enum(['text']),
	text: z.string().min(1).max(2000),
});

const filePartSchema = z.object({
	type: z.enum(['file']),
	mediaType: z.enum(['image/jpeg', 'image/png']),
	name: z.string().min(1).max(100),
	url: z.string().url(),
});

const partSchema = z.union([textPartSchema, filePartSchema]);

const validModelIds = new Set(chatModels.map((model) => model.id));

export const postRequestBodySchema = z.object({
	id: z.string().uuid(),
	message: z.object({
		id: z.string().uuid(),
		role: z.enum(['user']),
		parts: z.array(partSchema),
	}),
	selectedChatModel: z
		.string()
		.min(1)
		.refine((id) => validModelIds.has(id), {
			message: 'selectedChatModel must be a valid chat model id',
		}),
	selectedVisibilityType: z.enum(['public', 'private']),
});

export type PostRequestBody = z.infer<typeof postRequestBodySchema>;
