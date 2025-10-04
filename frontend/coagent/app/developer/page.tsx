"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import { CopilotKit } from "@copilotkit/react-core";
import { Chat } from "@/components/chat";
import { DataStreamHandler } from "@/components/data-stream-handler";
import { DataStreamProvider } from "@/components/data-stream-provider";
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar";
import { AppSidebar } from "@/components/app-sidebar";
import { DEFAULT_CHAT_MODEL } from "@/lib/ai/models";
import { generateUUID, persistChatIdInUrl } from "@/lib/utils";

export default function Page() {
  const searchParams = useSearchParams();
  const existingChatId = searchParams.get("chatId");
  const [id] = useState(() => existingChatId ?? generateUUID());

  useEffect(() => {
    persistChatIdInUrl(id);
  }, [id]);

  return (
    <CopilotKit runtimeUrl="/api/copilotkit">
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
    </CopilotKit>
  );
}
