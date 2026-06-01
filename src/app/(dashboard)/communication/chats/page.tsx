import { TeamChatsList } from "@/features/communication/components/communication-panels";
import { getDashboardContext, requireCommunicationReadAccess } from "@/lib/auth/session";
import { getTeamChats } from "@/lib/communication/loaders";

export default async function ChatsPage() {
  const { access } = await getDashboardContext();
  requireCommunicationReadAccess(access);
  const chats = await getTeamChats(access.clubId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Czaty</h1>
        <p className="text-sm text-muted-foreground">
          Kanały drużynowe, zarządu i sponsorów — tekst, emoji i zdjęcia (bez audio/wideo).
        </p>
      </div>
      <TeamChatsList chats={chats} />
    </div>
  );
}
