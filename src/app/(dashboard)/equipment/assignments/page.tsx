import { EquipmentAssignmentsPanel } from "@/features/equipment/components/equipment-assignments-panel";
import { canIssueEquipment } from "@/config/permissions";
import { getDashboardContext, requireEquipmentReadAccess } from "@/lib/auth/session";
import { getAssetAssignments, getAssets } from "@/lib/equipment/loaders";

export default async function EquipmentAssignmentsPage() {
  const { access } = await getDashboardContext();
  requireEquipmentReadAccess(access);

  const [assignments, assets] = await Promise.all([
    getAssetAssignments(access.clubId),
    getAssets(access.clubId),
  ]);

  return (
    <EquipmentAssignmentsPanel
      assignments={assignments}
      assets={assets}
      canIssue={canIssueEquipment(access.roles)}
    />
  );
}
