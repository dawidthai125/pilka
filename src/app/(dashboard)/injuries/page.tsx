import { InjuryDashboardPanel } from "@/features/injuries/components/injury-dashboard-panel";
import { InjuryQuickActions } from "@/features/injuries/components/injury-quick-actions";
import { canManageInjuryStaff } from "@/config/permissions";
import { getDashboardContext, requireInjuryStaffAccess } from "@/lib/auth/session";
import { getInjuryDashboardStats } from "@/lib/injuries/loaders";

export default async function InjuriesPage() {
  const { access } = await getDashboardContext();
  requireInjuryStaffAccess(access);

  const stats = await getInjuryDashboardStats(access.clubId);

  return (
    <div className="space-y-6">
      <InjuryDashboardPanel stats={stats} />
      {canManageInjuryStaff(access.roles) ? (
        <div>
          <h2 className="mb-2 text-lg font-semibold">Szybkie akcje</h2>
          <InjuryQuickActions />
        </div>
      ) : null}
    </div>
  );
}
