import { AnnouncementsList } from "@/features/communication/components/communication-panels";
import { AnnouncementComposeForm } from "@/features/communication/components/communication-forms";
import {
  canManageCommunication,
  canPublishCommunication,
} from "@/config/permissions";
import { getDashboardContext, requireCommunicationReadAccess } from "@/lib/auth/session";
import { getAnnouncements, getTeamsForCommunication } from "@/lib/communication/loaders";

export default async function AnnouncementsPage({
  searchParams,
}: {
  searchParams: Promise<{ teamId?: string; priority?: string; read?: string }>;
}) {
  const { access } = await getDashboardContext();
  requireCommunicationReadAccess(access);
  const params = await searchParams;

  const filters = {
    teamId: params.teamId,
    priority: params.priority as "low" | "normal" | "high" | "urgent" | undefined,
    readStatus: (params.read as "read" | "unread" | "all") ?? "all",
  };

  const [items, teams] = await Promise.all([
    getAnnouncements(access.clubId, access.userId, filters),
    getTeamsForCommunication(access.clubId),
  ]);

  const canManage = canManageCommunication(access.roles) || canPublishCommunication(access.roles);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Ogłoszenia klubowe</h1>
        <p className="text-sm text-muted-foreground">Broadcast do wybranych grup — z potwierdzeniem odczytu.</p>
      </div>

      {canManage ? <AnnouncementComposeForm teams={teams} /> : null}

      <AnnouncementsList items={items} canManage={canManage} />
    </div>
  );
}
