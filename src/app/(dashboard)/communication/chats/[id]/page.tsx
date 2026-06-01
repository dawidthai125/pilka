import { notFound } from "next/navigation";

import { ChatThread } from "@/features/communication/components/communication-panels";
import { getDashboardContext, requireCommunicationReadAccess } from "@/lib/auth/session";
import { getChatMessages, getTeamChats } from "@/lib/communication/loaders";

export default async function ChatDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { access } = await getDashboardContext();
  requireCommunicationReadAccess(access);
  const { id } = await params;

  const [chats, messages] = await Promise.all([
    getTeamChats(access.clubId),
    getChatMessages(id),
  ]);

  const chat = chats.find((c) => c.id === id);
  if (!chat) notFound();

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">{chat.name}</h1>
        <p className="text-sm text-muted-foreground">Czat klubowy — widok mobilny priorytetowy.</p>
      </div>
      <ChatThread chatId={id} messages={messages} />
    </div>
  );
}
