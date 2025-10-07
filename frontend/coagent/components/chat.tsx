'use client';

import { useCopilotChatHeadless_c } from '@copilotkit/react-core';
import { useSearchParams } from 'next/navigation';
import { useEffect, useRef, useState } from 'react';
import useSWR, { useSWRConfig } from 'swr';
import { unstable_serialize } from 'swr/infinite';
import { ChatHeader } from '@/components/chat-header';
import {
	AlertDialog,
	AlertDialogAction,
	AlertDialogCancel,
	AlertDialogContent,
	AlertDialogDescription,
	AlertDialogFooter,
	AlertDialogHeader,
	AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useArtifactSelector } from '@/hooks/use-artifact';
import { useAutoResume } from '@/hooks/use-auto-resume';
import { useChatVisibility } from '@/hooks/use-chat-visibility';
import { DEFAULT_CHAT_MODEL, chatModels } from '@/lib/ai/models';
import type { Vote } from '@/lib/db/schema';
import { ChatSDKError } from '@/lib/errors';
import type { Attachment, ChatMessage } from '@/lib/types';
import type { AppUsage } from '@/lib/usage';
import { fetcher, fetchWithErrorHandlers, generateUUID, persistChatIdInUrl } from '@/lib/utils';
import { Artifact } from './artifact';
import { useDataStream } from './data-stream-provider';
import { Messages } from './messages';
import { MultimodalInput } from './multimodal-input';
import { getChatHistoryPaginationKey } from './sidebar-history';
import { toast } from './toast';
import type { VisibilityType } from './visibility-selector';

export function Chat({
	id,
	initialMessages,
	initialChatModel,
	initialVisibilityType,
	isReadonly,
	autoResume,
	initialLastContext,
}: {
	id: string;
	initialMessages: ChatMessage[];
	initialChatModel: string;
	initialVisibilityType: VisibilityType;
	isReadonly: boolean;
	autoResume: boolean;
	initialLastContext?: AppUsage;
}) {
	const { visibilityType } = useChatVisibility({
		chatId: id,
		initialVisibilityType,
	});

	const { mutate } = useSWRConfig();
	const { setDataStream } = useDataStream();

	const [input, setInput] = useState<string>('');
	const [usage, setUsage] = useState<AppUsage | undefined>(initialLastContext);
	const [showCreditCardAlert, setShowCreditCardAlert] = useState(false);
	const [currentModelId, setCurrentModelId] = useState(() =>
		chatModels.some((model) => model.id === initialChatModel) ? initialChatModel : DEFAULT_CHAT_MODEL
	);
	const currentModelIdRef = useRef(currentModelId);

	useEffect(() => {
		currentModelIdRef.current = currentModelId;
	}, [currentModelId]);

	// Use CopilotKit's headless hook instead of Vercel's useChat
	const { messages, sendMessage, isLoading, stopGeneration } = useCopilotChatHeadless_c();

	// Map CopilotKit's status to Vercel's format for UI compatibility
	const status = isLoading ? 'streaming' : 'idle';
	const stop = stopGeneration;

	// Map messages to match existing ChatMessage type
	const setMessages = (msgs: any) => {
		// CopilotKit manages messages internally
		console.log('[Chat] setMessages called (using CopilotKit):', msgs);
	};

	const regenerate = () => {
		console.log('[Chat] regenerate called (not yet implemented for CopilotKit)');
	};

	const resumeStream = () => {
		console.log('[Chat] resumeStream called (not yet implemented for CopilotKit)');
	};

	// Handle data stream events (compatibility layer)
	useEffect(() => {
		if (isLoading) {
			setDataStream((ds) => (ds ? [...ds, { type: 'loading' }] : [{ type: 'loading' }]));
		}
	}, [isLoading, setDataStream]);

	// Handle completion - refresh sidebar
	useEffect(() => {
		if (!isLoading && messages.length > 0) {
			mutate(unstable_serialize(getChatHistoryPaginationKey));
		}
	}, [isLoading, messages.length, mutate]);

	const searchParams = useSearchParams();
	const query = searchParams.get('query');

	const [hasAppendedQuery, setHasAppendedQuery] = useState(false);

	useEffect(() => {
		if (query && !hasAppendedQuery) {
			// Convert to CopilotKit message format
			sendMessage({
				id: generateUUID(),
				role: 'user',
				content: query,
			});

			setHasAppendedQuery(true);
			// Disabled for /developer testing - don't navigate away
			// window.history.replaceState({}, "", `/chat/${id}`);
		}
	}, [query, sendMessage, hasAppendedQuery]);

	const { data: votes } = useSWR<Vote[]>(
		messages.length >= 2 ? `/api/vote?chatId=${id}` : null,
		fetcher
	);

	useEffect(() => {
		persistChatIdInUrl(id);
	}, [id]);

	const [attachments, setAttachments] = useState<Attachment[]>([]);
	const isArtifactVisible = useArtifactSelector((state) => state.isVisible);

	useAutoResume({
		autoResume,
		initialMessages,
		resumeStream,
		setMessages,
	});

	// Removed debug log - messages update tracking
	// useEffect(() => {
	// 	console.log('Messages updated:', messages);
	// }, [messages]);

	const safeInitialModelId = chatModels.some((model) => model.id === initialChatModel)
		? initialChatModel
		: DEFAULT_CHAT_MODEL;

	return (
		<>
			<div className="overscroll-behavior-contain flex h-dvh min-w-0 touch-pan-y flex-col bg-background">
				<ChatHeader
					chatId={id}
					isReadonly={isReadonly}
					selectedVisibilityType={initialVisibilityType}
					status={status}
				/>

				<Messages
					chatId={id}
					isArtifactVisible={isArtifactVisible}
					isReadonly={isReadonly}
					messages={messages}
					regenerate={regenerate}
					selectedModelId={safeInitialModelId}
					setMessages={setMessages}
					status={status}
					votes={votes}
				/>

				<div className="sticky bottom-0 z-1 mx-auto flex w-full max-w-4xl gap-2 border-t-0 bg-background px-2 pb-3 md:px-4 md:pb-4">
					{!isReadonly && (
						<MultimodalInput
							attachments={attachments}
							chatId={id}
							input={input}
							messages={messages}
							onModelChange={setCurrentModelId}
							selectedModelId={currentModelId}
							selectedVisibilityType={visibilityType}
							sendMessage={sendMessage}
							setAttachments={setAttachments}
							setInput={setInput}
							setMessages={setMessages}
							status={status}
							stop={stop}
							usage={usage}
						/>
					)}
				</div>
			</div>

			<Artifact
				attachments={attachments}
				chatId={id}
				input={input}
				isReadonly={isReadonly}
				messages={messages}
				regenerate={regenerate}
				selectedModelId={currentModelId}
				selectedVisibilityType={visibilityType}
				sendMessage={sendMessage}
				setAttachments={setAttachments}
				setInput={setInput}
				setMessages={setMessages}
				status={status}
				stop={stop}
				votes={votes}
			/>

			<AlertDialog onOpenChange={setShowCreditCardAlert} open={showCreditCardAlert}>
				<AlertDialogContent>
					<AlertDialogHeader>
						<AlertDialogTitle>Activate AI Gateway</AlertDialogTitle>
						<AlertDialogDescription>
							This application requires{' '}
							{process.env.NODE_ENV === 'production' ? 'the owner' : 'you'} to activate Vercel AI
							Gateway.
						</AlertDialogDescription>
					</AlertDialogHeader>
					<AlertDialogFooter>
						<AlertDialogCancel>Cancel</AlertDialogCancel>
						<AlertDialogAction
							onClick={() => {
								window.open(
									'https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fai%3Fmodal%3Dadd-credit-card',
									'_blank'
								);
								window.location.href = '/';
							}}
						>
							Activate
						</AlertDialogAction>
					</AlertDialogFooter>
				</AlertDialogContent>
			</AlertDialog>
		</>
	);
}
