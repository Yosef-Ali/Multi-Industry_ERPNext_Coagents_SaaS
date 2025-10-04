'use client';

import { useCopilotChatInternal } from '@copilotkit/react-core';
import type { Message } from '@copilotkit/shared';
import { Loader2, Plus, RefreshCcw, Send, Sparkles } from 'lucide-react';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

const instructions = `You are an ERPNext development assistant. Help users generate DocTypes, Workflows, and ERPNext applications inside ERPNext. Always produce three distinct implementation variants ordered by increasing complexity, highlighting key trade-offs.`;

const staticConversations = [
	{
		id: 'inventory-sync',
		title: "Dijkstra's Algorithm Code Document",
		subtitle: 'Today • 12:40 PM',
	},
	{
		id: 'purchase-automation',
		title: 'Hotel check-in automations',
		subtitle: 'Yesterday • 9:15 PM',
	},
	{
		id: 'doc-apr',
		title: 'Retail restock workflow',
		subtitle: 'Oct 2, 2025',
	},
	{
		id: 'erpnext-scripts',
		title: 'DocType approval policies',
		subtitle: 'Pinned • Template',
	},
];

export function DeveloperChatPanel() {
	const [input, setInput] = useState('');

	const { messages, sendMessage, isLoading, stopGeneration, reloadMessages, reset } =
		useCopilotChatInternal({
			makeSystemMessage: (contextString, additional) =>
				[
					instructions,
					additional ? `Additional instructions:\n${additional}` : undefined,
					contextString ? `Context:\n${contextString}` : undefined,
				]
					.filter(Boolean)
					.join('\n\n'),
		});

	const chatMessages = useMemo(
		() => messages.filter((message) => message.role !== 'system' && message.role !== 'developer'),
		[messages]
	);

	const scrollRef = useRef<HTMLDivElement | null>(null);

	useEffect(() => {
		if (!scrollRef.current) return;
		scrollRef.current.scrollTo({
			top: scrollRef.current.scrollHeight,
			behavior: 'smooth',
		});
	}, []);

	const lastAssistantMessage = useMemo(
		() => [...chatMessages].reverse().find((message) => message.role === 'assistant'),
		[chatMessages]
	);

	const handleSubmit = useCallback(async () => {
		const trimmed = input.trim();
		if (!trimmed) return;

		await sendMessage({
			id: crypto.randomUUID(),
			role: 'user',
			content: trimmed,
		});

		setInput('');
	}, [input, sendMessage]);

	const handleReset = useCallback(() => {
		reset();
		setInput('');
	}, [reset]);

	const handleRegenerate = useCallback(() => {
		if (!lastAssistantMessage) return;
		void reloadMessages(lastAssistantMessage.id);
	}, [lastAssistantMessage, reloadMessages]);

	return (
		<div className="flex h-full min-h-dvh bg-[#F7F7F8] text-[#0B1220]">
			<Sidebar onNewChat={handleReset} />

			<main className="flex min-w-0 flex-1 flex-col bg-white">
				<ChatHeader />

				<div className="flex-1 overflow-y-auto bg-[#F7F7F8]">
					<div
						ref={scrollRef}
						className="mx-auto flex w-full max-w-3xl flex-col gap-6 px-6 pb-32 pt-10 sm:px-12"
					>
						{chatMessages.length === 0 ? (
							<WelcomePanel onNewChat={handleReset} />
						) : (
							chatMessages.map((message) => (
								<MessageBubble
									key={message.id}
									message={message}
									isAssistant={message.role === 'assistant'}
									isStreaming={Boolean(
										isLoading && lastAssistantMessage && message.id === lastAssistantMessage.id
									)}
								/>
							))
						)}
					</div>
				</div>

				<ChatComposer
					input={input}
					isLoading={isLoading}
					onChange={setInput}
					onSubmit={handleSubmit}
					onStop={stopGeneration}
					onRegenerate={handleRegenerate}
					canRegenerate={Boolean(lastAssistantMessage)}
				/>
			</main>
		</div>
	);
}

function Sidebar({ onNewChat }: { onNewChat: () => void }) {
	return (
		<aside className="hidden w-[300px] flex-col border-r border-slate-200 bg-white lg:flex">
			<div className="flex items-center justify-between px-6 pb-4 pt-6">
				<div>
					<p className="text-xs font-semibold uppercase tracking-wide text-slate-500">Chatbot</p>
					<p className="text-xs text-slate-400">You have reached the end of your chat history.</p>
				</div>
				<Button
					variant="outline"
					size="icon"
					onClick={onNewChat}
					className="h-9 w-9 rounded-lg border-slate-200"
				>
					<Plus className="h-4 w-4" />
					<span className="sr-only">Start a new chat</span>
				</Button>
			</div>

			<div className="px-6 pb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">
				Today
			</div>

			<div className="flex-1 space-y-1 overflow-y-auto px-3 pb-8">
				{staticConversations.map((conversation) => (
					<button
						key={conversation.id}
						type="button"
						className="flex w-full flex-col gap-1 rounded-xl border border-transparent bg-[#F1F1F3] px-4 py-3 text-left text-sm font-semibold text-slate-800 transition hover:border-slate-200 hover:bg-white"
					>
						{conversation.title}
						<span className="text-xs font-normal text-slate-500">{conversation.subtitle}</span>
					</button>
				))}
			</div>

			<div className="border-t border-slate-200 px-6 py-4">
				<button
					type="button"
					className="flex w-full items-center justify-between rounded-xl border border-slate-200 bg-[#F7F7F8] px-4 py-3 text-left text-sm font-medium text-slate-700"
				>
					Guest
					<span className="text-xs text-slate-500">Upgrade</span>
				</button>
			</div>
		</aside>
	);
}

function ChatHeader() {
	return (
		<header className="flex items-center justify-between border-b border-slate-200 bg-white px-6 py-4 sm:px-12">
			<div className="flex items-center gap-3">
				<div className="flex h-10 w-10 items-center justify-center rounded-full bg-[#101828] text-white">
					<Sparkles className="h-5 w-5" />
				</div>
				<div>
					<h1 className="text-lg font-semibold text-[#101828]">Chatbot</h1>
					<p className="text-sm text-slate-500">Ask anything about your ERPNext build.</p>
				</div>
			</div>
			<Button className="rounded-lg bg-[#101828] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0B0F19]">
				Deploy with Vercel
			</Button>
		</header>
	);
}

function WelcomePanel({ onNewChat }: { onNewChat: () => void }) {
	return (
		<div className="rounded-2xl border border-dashed border-slate-300 bg-white/80 p-10 text-center shadow-sm">
			<div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-[#101828] text-white">
				<Sparkles className="h-5 w-5" />
			</div>
			<h2 className="mt-6 text-xl font-semibold text-[#101828]">
				Start a new ERPNext conversation
			</h2>
			<p className="mt-2 text-sm text-slate-500">
				Ask for code, workflows, DocTypes, or automation strategies. The assistant will respond with
				three implementation variants every time.
			</p>
			<Button
				onClick={onNewChat}
				className="mt-6 rounded-lg bg-[#101828] px-4 py-2 text-sm font-semibold text-white hover:bg-[#0B0F19]"
			>
				New chat
			</Button>
		</div>
	);
}

function MessageBubble({
	message,
	isAssistant,
	isStreaming,
}: {
	message: Message;
	isAssistant: boolean;
	isStreaming: boolean;
}) {
	const content = typeof message.content === 'string' ? message.content : '';

	if (!content) return null;

	return (
		<div className="flex w-full gap-3">
			<div
				className={cn(
					'flex h-9 w-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold',
					isAssistant ? 'bg-[#111827] text-white' : 'bg-[#2563EB] text-white'
				)}
			>
				{isAssistant ? <Sparkles className="h-4 w-4" /> : <span>U</span>}
			</div>
			<div className="flex-1 space-y-3">
				<div
					className={cn(
						'rounded-3xl border px-6 py-5 text-sm leading-relaxed shadow-sm',
						isAssistant
							? 'border-slate-200 bg-white text-[#101828]'
							: 'border-transparent bg-[#111827] text-white shadow-md'
					)}
				>
					<p className="whitespace-pre-wrap">
						{content}
						{isStreaming && (
							<span className="ml-1 inline-flex h-2 w-2 animate-pulse rounded-full bg-current align-middle" />
						)}
					</p>
				</div>
			</div>
		</div>
	);
}

function ChatComposer({
	input,
	onChange,
	onSubmit,
	onStop,
	onRegenerate,
	isLoading,
	canRegenerate,
}: {
	input: string;
	onChange: (value: string) => void;
	onSubmit: () => void;
	onStop: () => void;
	onRegenerate: () => void;
	isLoading: boolean;
	canRegenerate: boolean;
}) {
	return (
		<div className="border-t border-slate-200 bg-white px-6 py-6 sm:px-12">
			<div className="mx-auto w-full max-w-3xl">
				<div className="rounded-2xl border border-slate-200 bg-white px-4 py-4 shadow-sm">
					<textarea
						value={input}
						onChange={(event) => onChange(event.target.value)}
						onKeyDown={(event) => {
							if (event.key === 'Enter' && !event.shiftKey) {
								event.preventDefault();
								onSubmit();
							}
						}}
						rows={Math.min(6, Math.max(3, Math.ceil(input.length / 80) + 1))}
						placeholder="Send a message..."
						className="min-h-[88px] w-full resize-none rounded-xl border border-transparent bg-[#F7F7F8] px-4 py-3 text-sm text-[#101828] placeholder:text-slate-400 outline-none focus:border-slate-300 focus:bg-white"
					/>

					<div className="mt-3 flex flex-wrap items-center justify-between gap-3 text-xs text-slate-500">
						<span>Shift + Enter to add a new line</span>
						<div className="flex items-center gap-2">
							{isLoading ? (
								<Button
									variant="outline"
									size="sm"
									className="gap-2 border-slate-200"
									onClick={onStop}
								>
									<Loader2 className="h-4 w-4 animate-spin" />
									Stop generating
								</Button>
							) : (
								<>
									{canRegenerate && (
										<Button
											variant="ghost"
											size="sm"
											className="gap-2 text-slate-600 hover:bg-slate-100"
											onClick={onRegenerate}
										>
											<RefreshCcw className="h-4 w-4" />
											Regenerate
										</Button>
									)}
									<Button
										size="sm"
										className="gap-2 rounded-lg bg-[#111827] px-4 text-sm font-semibold text-white hover:bg-[#0B0F19]"
										onClick={onSubmit}
										disabled={!input.trim()}
									>
										Send
										<Send className="h-4 w-4" />
									</Button>
								</>
							)}
						</div>
					</div>
				</div>
			</div>
		</div>
	);
}
