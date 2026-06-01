import { EquipmentMaintenancePanel } from "@/features/equipment/components/equipment-maintenance-panel";
import { canIssueEquipment, canManageEquipment } from "@/config/permissions";
import { getDashboardContext, requireEquipmentReadAccess } from "@/lib/auth/session";
import { getAssetMaintenanceList, getAssets } from "@/lib/equipment/loaders";

export default async function EquipmentMaintenancePage() {
  const { access } = await getDashboardContext();
  requireEquipmentReadAccess(access);

  const [maintenance, assets] = await Promise.all([
    getAssetMaintenanceList(access.clubId),
    getAssets(access.clubId),
  ]);

  return (
    <EquipmentMaintenancePanel
      maintenance={maintenance}
      assets={assets}
      canIssue={canIssueEquipment(access.roles)}
      canManage={canManageEquipment(access.roles)}
    />
  );
}
