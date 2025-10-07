'use client';

import { PlusIcon } from 'lucide-react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import type { AppUser } from '@/lib/session';
import { Button } from '@/components/ui/button';
import {
	Sidebar,
	SidebarContent,
	SidebarFooter,
	SidebarHeader,
	SidebarMenu,
	useSidebar,
} from '@/components/ui/sidebar';
import { Tooltip, TooltipContent, TooltipTrigger } from '@/components/ui/tooltip';
import { SidebarHistory } from '@/components/sidebar-history';

export function AppSidebar({ user }: { user: AppUser | null }) {
	const router = useRouter();
	const { setOpenMobile } = useSidebar();

	return (
		<Sidebar className="group-data-[side=left]:border-r-0">
			<SidebarHeader>
				<SidebarMenu>
					<div className="flex flex-row items-center justify-between">
						<Link
							className="flex flex-row items-center gap-3"
							href="/developer"
							onClick={() => {
								setOpenMobile(false);
							}}
						>
							<span className="cursor-pointer rounded-md px-2 font-semibold text-lg hover:bg-muted">
								ERPNext Chatbot
							</span>
						</Link>
						<Tooltip>
							<TooltipTrigger asChild>
								<Button
									className="h-8 p-1 md:h-fit md:p-2"
									onClick={() => {
										setOpenMobile(false);
										router.push('/developer');
										router.refresh();
									}}
									type="button"
									variant="ghost"
								>
									<PlusIcon />
								</Button>
							</TooltipTrigger>
							<TooltipContent align="end" className="hidden md:block">
								New Chat
							</TooltipContent>
						</Tooltip>
					</div>
				</SidebarMenu>
			</SidebarHeader>
			<SidebarContent>
				<SidebarHistory />
			</SidebarContent>
			<SidebarFooter>
				<div className="px-2 py-2 text-xs text-muted-foreground">
					{user?.email ? `Signed in as ${user.email}` : 'Guest user'}
				</div>
			</SidebarFooter>
		</Sidebar>
	);
}
