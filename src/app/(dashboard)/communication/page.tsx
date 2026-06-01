import {
  AnnouncementsList,
  CoachMessagesList,
  CommunicationStatsCards,
  TeamChatsList,
} from "@/features/communication/components/communication-panels";
import {
  canManageCommunication,
  canPublishCommunication,
} from "@/config/permissions";
import { getDashboardContext, requireCommunicationReadAccess } from "@/lib/auth/session";
import {
  getAnnouncements,
  getCoachMessages,
  getCommunicationDashboardStats,
  getTeamChats,
} from "@/lib/communication/loaders";

export default async function CommunicationDashboardPage() {
  const { access } = await getDashboardContext();
  requireCommunicationReadAccess(access);

  const [stats, announcements, coachMessages, chats] = await Promise.all([
    getCommunicationDashboardStats(access.clubId, access.userId),
    getAnnouncements(access.clubId, access.userId, { readStatus: "all" }),
    getCoachMessages(access.clubId, access.userId),
    getTeamChats(access.clubId),
  ]);

  const canManage = canManageCommunication(access.roles) || canPublishCommunication(access.roles);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Communication Hub</h1>
        <p className="text-sm text-muted-foreground">
          Centralna komunikacja klubu — ogłoszenia, komunikaty trenerów i czaty drużynowe.
        </p>
      </div>

      <CommunicationStatsCards stats={stats} />

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Ostatnie ogłoszenia</h2>
        <AnnouncementsList items={announcements.slice(0, 3)} canManage={canManage} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Komunikaty trenera</h2>
        <CoachMessagesList items={coachMessages.slice(0, 3)} canCoach={canManageCommunication(access.roles)} />
      </section>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Czaty</h2>
        <TeamChatsList chats={chats.slice(0, 4)} />
      </section>
    </div>
  );
}
