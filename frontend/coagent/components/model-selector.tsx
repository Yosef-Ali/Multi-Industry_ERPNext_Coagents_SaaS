'use client';

import { startTransition, useMemo, useOptimistic, useState, useEffect } from 'react';
import type { AppSession } from '@/lib/session';
import { saveChatModelAsCookie } from '@/app/(chat)/actions';
import { Button } from '@/components/ui/button';
import {
	DropdownMenu,
	DropdownMenuContent,
	DropdownMenuItem,
	DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { entitlementsByUserType } from '@/lib/ai/entitlements';
import { chatModels, fetchAvailableModels, type ChatModel } from '@/lib/ai/models';
import { cn } from '@/lib/utils';
import { CheckCircleFillIcon, ChevronDownIcon } from './icons';

export function ModelSelector({
	session,
	selectedModelId,
	className,
}: {
	session: AppSession;
	selectedModelId: string;
} & React.ComponentProps<typeof Button>) {
	const [open, setOpen] = useState(false);
	const [optimisticModelId, setOptimisticModelId] = useOptimistic(selectedModelId);
	const [availableModels, setAvailableModels] = useState<ChatModel[]>(chatModels);
	const [isLoading, setIsLoading] = useState(false);

	const userType = session.user.type;
	const { availableChatModelIds } = entitlementsByUserType[userType];

	// Fetch available models on mount
	useEffect(() => {
		let mounted = true;

		async function loadModels() {
			setIsLoading(true);
			try {
				const models = await fetchAvailableModels();
				if (mounted) {
					setAvailableModels(models);
				}
			} catch (error) {
				console.error('[ModelSelector] Failed to load models:', error);
				// Keep using static chatModels as fallback
			} finally {
				if (mounted) {
					setIsLoading(false);
				}
			}
		}

		loadModels();

		return () => {
			mounted = false;
		};
	}, []);

	const availableChatModels = availableModels.filter((chatModel) =>
		availableChatModelIds.includes(chatModel.id)
	);

	const selectedChatModel = useMemo(
		() => availableChatModels.find((chatModel) => chatModel.id === optimisticModelId),
		[optimisticModelId, availableChatModels]
	);

	return (
		<DropdownMenu onOpenChange={setOpen} open={open}>
			<DropdownMenuTrigger
				asChild
				className={cn(
					'w-fit data-[state=open]:bg-accent data-[state=open]:text-accent-foreground',
					className
				)}
			>
				<Button className="md:h-[34px] md:px-2" data-testid="model-selector" variant="outline">
					{selectedChatModel?.name}
					<ChevronDownIcon />
				</Button>
			</DropdownMenuTrigger>
			<DropdownMenuContent align="start" className="min-w-[280px] max-w-[90vw] sm:min-w-[300px]">
				{availableChatModels.map((chatModel) => {
					const { id } = chatModel;

					return (
						<DropdownMenuItem
							asChild
							data-active={id === optimisticModelId}
							data-testid={`model-selector-item-${id}`}
							key={id}
							onSelect={() => {
								setOpen(false);

								startTransition(() => {
									setOptimisticModelId(id);
									saveChatModelAsCookie(id);
								});
							}}
						>
							<button
								className="group/item flex w-full flex-row items-center justify-between gap-2 sm:gap-4"
								type="button"
							>
								<div className="flex flex-col items-start gap-1.5 flex-1">
									<div className="flex items-center gap-2 flex-wrap">
										<div className="text-sm sm:text-base font-medium">{chatModel.name}</div>
										{chatModel.pricing?.isFree && (
											<span className="inline-flex items-center rounded-md bg-green-50 px-2 py-0.5 text-xs font-medium text-green-700 ring-1 ring-inset ring-green-600/20 dark:bg-green-500/10 dark:text-green-400 dark:ring-green-500/20">
												Free
											</span>
										)}
										{chatModel.available === false && (
											<span className="inline-flex items-center rounded-md bg-gray-50 px-2 py-0.5 text-xs font-medium text-gray-600 ring-1 ring-inset ring-gray-500/10 dark:bg-gray-400/10 dark:text-gray-400 dark:ring-gray-400/20">
												Unavailable
											</span>
										)}
									</div>
									<div className="line-clamp-2 text-muted-foreground text-xs">
										{chatModel.description}
									</div>
									{(chatModel.capabilities || chatModel.pricing) && (
										<div className="flex items-center gap-2 text-xs text-muted-foreground flex-wrap">
											{chatModel.capabilities?.maxContextWindow && (
												<span>
													{chatModel.capabilities.maxContextWindow >= 1000000
														? `${(chatModel.capabilities.maxContextWindow / 1000000).toFixed(1)}M`
														: `${(chatModel.capabilities.maxContextWindow / 1000).toFixed(0)}K`}{' '}
													context
												</span>
											)}
											{chatModel.capabilities?.supportsVision && <span>• Vision</span>}
											{!chatModel.capabilities?.supportsTools && <span>• No tools</span>}
											{chatModel.pricing && !chatModel.pricing.isFree && (
												<span className="font-medium text-amber-600 dark:text-amber-400">
													• ${chatModel.pricing.inputCostPer1K.toFixed(4)}/1K in, ${chatModel.pricing.outputCostPer1K.toFixed(4)}/1K out
												</span>
											)}
										</div>
									)}
								</div>

								<div className="shrink-0 text-foreground opacity-0 group-data-[active=true]/item:opacity-100 dark:text-foreground">
									<CheckCircleFillIcon />
								</div>
							</button>
						</DropdownMenuItem>
					);
				})}
			</DropdownMenuContent>
		</DropdownMenu>
	);
}
