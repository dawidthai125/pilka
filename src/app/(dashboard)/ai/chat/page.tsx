import { Suspense } from "react";

import { AiChatList } from "@/features/ai/components/ai-chat-list";
import { getAiConversations, getDashboardContext, requireAiReadAccess } from "@/lib/auth/session";

type SearchParams = Promise<{ q?: string }>;

async function ChatListSection({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const { access } = await getDashboardContext();
  requireAiReadAccess(access);
  const conversations = await getAiConversations(undefined, params.q);
  return <AiChatList conversations={conversations} />;
}

export default function AiChatPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <Suspense fallback={<p className="text-sm text-muted-foreground">Ładowanie...</p>}>
      <ChatListSection searchParams={searchParams} />
    </Suspense>
  );
}
