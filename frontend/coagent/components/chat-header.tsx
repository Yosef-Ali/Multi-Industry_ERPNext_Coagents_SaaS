'use client';

import type { UseChatHelpers } from '@ai-sdk/react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { memo, useEffect, useMemo, useState } from 'react';
import { SidebarToggle } from '@/components/sidebar-toggle';
import type { ChatMessage } from '@/lib/types';
import { Button } from '@/components/ui/button';
import { LoaderIcon, PlusIcon, VercelIcon } from './icons';
import { useSidebar } from './ui/sidebar';
import { VisibilitySelector, type VisibilityType } from './visibility-selector';

function PureChatHeader({
	chatId,
	selectedVisibilityType,
	isReadonly,
	status,
}: {
	chatId: string;
	selectedVisibilityType: VisibilityType;
	isReadonly: boolean;
	status: UseChatHelpers<ChatMessage>['status'];
}) {
	const router = useRouter();
	const { open } = useSidebar();
	const [showNewChatButton, setShowNewChatButton] = useState(false);
	const statusMessage = useMemo(() => {
		if (status === 'streaming') {
			return 'Generating response…';
		}
		if (status === 'submitted') {
			return 'Waiting for response…';
		}
		if (status === 'error') {
			return 'Something went wrong';
		}
		return null;
	}, [status]);

	const statusStyles = useMemo(() => {
		if (status === 'error') {
			return 'border-destructive/40 bg-destructive/10 text-destructive';
		}

		return 'border-border bg-muted text-muted-foreground';
	}, [status]);

	useEffect(() => {
		function updateButtonState() {
			const width = typeof window !== 'undefined' ? window.innerWidth : 0;
			setShowNewChatButton(!open || width < 768);
		}

		updateButtonState();

		if (typeof window !== 'undefined') {
			window.addEventListener('resize', updateButtonState);
			return () => {
				window.removeEventListener('resize', updateButtonState);
			};
		}

		return undefined;
	}, [open]);

	return (
		<header className="sticky top-0 flex items-center gap-2 bg-background px-2 py-1.5 md:px-2">
			<SidebarToggle />

			{showNewChatButton && (
				<Button
					className="order-2 ml-auto h-8 px-2 md:order-1 md:ml-0 md:h-fit md:px-2"
					onClick={() => {
						router.push('/');
						router.refresh();
					}}
					variant="outline"
				>
					<PlusIcon />
					<span className="md:sr-only">New Chat</span>
				</Button>
			)}

			{!isReadonly && (
				<VisibilitySelector
					chatId={chatId}
					className="order-1 md:order-2"
					selectedVisibilityType={selectedVisibilityType}
				/>
			)}

			{statusMessage && (
				<div
					className={`order-4 flex items-center gap-2 rounded-full border px-3 py-1 text-xs md:ml-auto md:text-sm ${statusStyles}`}
				>
					<div
						aria-hidden="true"
						className={status === 'error' ? undefined : 'animate-spin'}
					>
						<LoaderIcon size={12} />
					</div>
					<span>{statusMessage}</span>
				</div>
			)}

			<Button
				asChild
				className="order-5 hidden bg-zinc-900 px-2 text-zinc-50 hover:bg-zinc-800 md:ml-auto md:flex md:h-fit dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-200"
			>
				<Link
					href={'https://vercel.com/templates/next.js/nextjs-ai-chatbot'}
					rel="noreferrer"
					target="_noblank"
				>
					<VercelIcon size={16} />
					Deploy with Vercel
				</Link>
			</Button>
		</header>
	);
}

export const ChatHeader = memo(PureChatHeader, (prevProps, nextProps) => {
	return (
		prevProps.chatId === nextProps.chatId &&
		prevProps.selectedVisibilityType === nextProps.selectedVisibilityType &&
		prevProps.isReadonly === nextProps.isReadonly &&
		prevProps.status === nextProps.status
	);
});
