import { CoachMessagesList } from "@/features/communication/components/communication-panels";
import { CoachMessageComposeForm } from "@/features/communication/components/communication-forms";
import { canCreateCommunication, canManageCommunication } from "@/config/permissions";
import { getDashboardContext, requireCommunicationReadAccess } from "@/lib/auth/session";
import { getCoachMessages, getTeamsForCommunication } from "@/lib/communication/loaders";

export default async function CoachMessagesPage() {
  const { access } = await getDashboardContext();
  requireCommunicationReadAccess(access);

  const [items, teams] = await Promise.all([
    getCoachMessages(access.clubId, access.userId),
    getTeamsForCommunication(access.clubId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Komunikaty trenera</h1>
        <p className="text-sm text-muted-foreground">Wiadomości tylko dla wybranej drużyny — z opcjonalnym RSVP.</p>
      </div>

      {canCreateCommunication(access.roles) && teams.length ? (
        <CoachMessageComposeForm teams={teams} />
      ) : null}

      <CoachMessagesList items={items} canCoach={canManageCommunication(access.roles)} />
    </div>
  );
}
