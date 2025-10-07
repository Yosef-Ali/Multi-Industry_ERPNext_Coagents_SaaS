import equal from 'fast-deep-equal';
import { memo } from 'react';
import { toast } from 'sonner';
import { useSWRConfig } from 'swr';
import { useCopyToClipboard } from 'usehooks-ts';
import type { UseChatHelpers } from '@ai-sdk/react';
import type { Vote } from '@/lib/db/schema';
import type { ChatMessage } from '@/lib/types';
import { Action, Actions } from './elements/actions';
import { CopyIcon, PencilEditIcon, RedoIcon, ThumbDownIcon, ThumbUpIcon } from './icons';
import { Trash } from 'lucide-react';

export function PureMessageActions({
	chatId,
	message,
	vote,
	isLoading,
	setMode,
	regenerate,
	setMessages,
}: {
	chatId: string;
	message: ChatMessage;
	vote: Vote | undefined;
	isLoading: boolean;
	setMode?: (mode: 'view' | 'edit') => void;
	regenerate?: UseChatHelpers<ChatMessage>['regenerate'];
	setMessages?: UseChatHelpers<ChatMessage>['setMessages'];
}) {
	const { mutate } = useSWRConfig();
	const [_, copyToClipboard] = useCopyToClipboard();

	if (isLoading) {
		return null;
	}

	const textFromParts = message.parts
		?.filter((part) => part.type === 'text')
		.map((part) => part.text)
		.join('\n')
		.trim();

	const handleCopy = async () => {
		if (!textFromParts) {
			toast.error("There's no text to copy!");
			return;
		}

		await copyToClipboard(textFromParts);
		toast.success('Copied to clipboard!');
	};

	const handleDeleteFromHere = () => {
		if (!setMessages) return;
		setMessages((messages) => {
			const index = messages.findIndex((m) => m.id === message.id);
			if (index === -1) return messages;
			// Remove this message and all that follow
			return messages.slice(0, index);
		});
		toast.success('Deleted message and following messages');
	};

	// User messages get edit (on hover), re-run, and copy actions
	if (message.role === 'user') {
		return (
			<Actions className="-mr-0.5 justify-end">
				<div className="relative flex gap-0.5">
					{setMode && (
						<Action
							className="-left-[4.5rem] absolute top-0 opacity-0 transition-opacity group-hover/message:opacity-100"
							onClick={() => setMode('edit')}
							tooltip="Edit"
						>
							<PencilEditIcon />
						</Action>
					)}
					{regenerate && (
						<Action
							className="-left-9 absolute top-0 opacity-0 transition-opacity group-hover/message:opacity-100"
							onClick={() => {
								regenerate();
								toast.success('Re-running prompt...');
							}}
							tooltip="Re-run prompt"
						>
							<RedoIcon />
						</Action>
					)}
					<Action onClick={handleCopy} tooltip="Copy">
						<CopyIcon />
					</Action>
					<Action onClick={handleDeleteFromHere} tooltip="Delete from here">
						<Trash className="h-4 w-4" />
					</Action>
				</div>
			</Actions>
		);
	}

	return (
		<Actions className="-ml-0.5">
			<Action onClick={handleCopy} tooltip="Copy">
				<CopyIcon />
			</Action>

			<Action onClick={handleDeleteFromHere} tooltip="Delete from here">
				<Trash className="h-4 w-4" />
			</Action>

			<Action
				data-testid="message-upvote"
				disabled={vote?.isUpvoted}
				onClick={() => {
					const upvote = fetch('/api/vote', {
						method: 'PATCH',
						body: JSON.stringify({
							chatId,
							messageId: message.id,
							type: 'up',
						}),
					});

					toast.promise(upvote, {
						loading: 'Upvoting Response...',
						success: () => {
							mutate<Vote[]>(
								`/api/vote?chatId=${chatId}`,
								(currentVotes) => {
									if (!currentVotes) {
										return [];
									}

									const votesWithoutCurrent = currentVotes.filter(
										(currentVote) => currentVote.messageId !== message.id
									);

									return [
										...votesWithoutCurrent,
										{
											chatId,
											messageId: message.id,
											isUpvoted: true,
										},
									];
								},
								{ revalidate: false }
							);

							return 'Upvoted Response!';
						},
						error: 'Failed to upvote response.',
					});
				}}
				tooltip="Upvote Response"
			>
				<ThumbUpIcon />
			</Action>

			<Action
				data-testid="message-downvote"
				disabled={vote && !vote.isUpvoted}
				onClick={() => {
					const downvote = fetch('/api/vote', {
						method: 'PATCH',
						body: JSON.stringify({
							chatId,
							messageId: message.id,
							type: 'down',
						}),
					});

					toast.promise(downvote, {
						loading: 'Downvoting Response...',
						success: () => {
							mutate<Vote[]>(
								`/api/vote?chatId=${chatId}`,
								(currentVotes) => {
									if (!currentVotes) {
										return [];
									}

									const votesWithoutCurrent = currentVotes.filter(
										(currentVote) => currentVote.messageId !== message.id
									);

									return [
										...votesWithoutCurrent,
										{
											chatId,
											messageId: message.id,
											isUpvoted: false,
										},
									];
								},
								{ revalidate: false }
							);

							return 'Downvoted Response!';
						},
						error: 'Failed to downvote response.',
					});
				}}
				tooltip="Downvote Response"
			>
				<ThumbDownIcon />
			</Action>
		</Actions>
	);
}

export const MessageActions = memo(PureMessageActions, (prevProps, nextProps) => {
	if (!equal(prevProps.vote, nextProps.vote)) {
		return false;
	}
	if (prevProps.isLoading !== nextProps.isLoading) {
		return false;
	}

	return true;
});
