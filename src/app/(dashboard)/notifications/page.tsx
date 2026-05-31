import { NotificationsCenter } from "@/features/training/components/notifications-center";
import { canManageSponsors, canManageTrainings } from "@/config/permissions";
import {
  getDashboardContext,
  getNotifications,
  requireTrainingReadAccess,
  syncSponsorContractReminders,
  syncTrainingReminders,
} from "@/lib/auth/session";

export default async function NotificationsPage() {
  const { access } = await getDashboardContext();
  requireTrainingReadAccess(access);

  if (canManageTrainings(access.roles)) {
    await syncTrainingReminders(access.clubId);
  }
  if (canManageSponsors(access.roles)) {
    await syncSponsorContractReminders(access.clubId);
  }

  const notifications = await getNotifications();

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Centrum powiadomień</h1>
        <p className="text-sm text-muted-foreground">
          Przypomnienia o treningach (48 h, 24 h, 3 h). Architektura gotowa pod email, SMS i push.
        </p>
      </div>
      <NotificationsCenter notifications={notifications} />
    </div>
  );
}
