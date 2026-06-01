import { EquipmentDashboardPanel } from "@/features/equipment/components/equipment-dashboard-panel";
import { EquipmentQuickActions } from "@/features/equipment/components/equipment-quick-actions";
import { canIssueEquipment } from "@/config/permissions";
import { getDashboardContext, requireEquipmentReadAccess } from "@/lib/auth/session";
import { getEquipmentDashboardStats } from "@/lib/equipment/loaders";

export default async function EquipmentPage() {
  const { access } = await getDashboardContext();
  requireEquipmentReadAccess(access);

  const stats = await getEquipmentDashboardStats(access.clubId);

  return (
    <div className="space-y-6">
      <EquipmentDashboardPanel stats={stats} />
      {canIssueEquipment(access.roles) ? (
        <div>
          <h2 className="mb-2 text-lg font-semibold">Szybkie akcje</h2>
          <EquipmentQuickActions />
        </div>
      ) : null}
    </div>
  );
}
