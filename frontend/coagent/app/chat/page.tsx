'use client';

import { useSearchParams } from 'next/navigation';
import { useEffect, useState } from 'react';
import { AppSidebar } from '@/components/app-sidebar';
import { Chat } from '@/components/chat';
import { DataStreamHandler } from '@/components/data-stream-handler';
import { DataStreamProvider } from '@/components/data-stream-provider';
import { SidebarInset, SidebarProvider } from '@/components/ui/sidebar';
import { DEFAULT_CHAT_MODEL } from '@/lib/ai/models';
import { generateUUID, persistChatIdInUrl } from '@/lib/utils';

export default function Page() {
	const searchParams = useSearchParams();
	const existingChatId = searchParams.get('chatId');
	const [id] = useState(() => existingChatId ?? generateUUID());

	useEffect(() => {
		persistChatIdInUrl(id);
	}, [id]);

	return (
		<DataStreamProvider>
			<SidebarProvider defaultOpen={true}>
				<AppSidebar user={null} />
				<SidebarInset>
					<Chat
						autoResume={false}
						id={id}
						initialChatModel={DEFAULT_CHAT_MODEL}
						initialMessages={[]}
						initialVisibilityType="private"
						isReadonly={false}
					/>
				</SidebarInset>
			</SidebarProvider>
			<DataStreamHandler />
		</DataStreamProvider>
	);
}
