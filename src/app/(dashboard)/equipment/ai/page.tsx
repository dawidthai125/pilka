import { EquipmentAiPanel } from "@/features/equipment/components/equipment-ai-panel";
import { generateEquipmentInsights } from "@/lib/equipment/insights";
import {
  getAssetMaintenanceList,
  getAssets,
  getEquipmentDashboardStats,
} from "@/lib/equipment/loaders";
import { getDashboardContext, requireEquipmentManageAccess } from "@/lib/auth/session";

export default async function EquipmentAiPage() {
  const { access } = await getDashboardContext();
  requireEquipmentManageAccess(access);

  const [stats, assets, maintenance] = await Promise.all([
    getEquipmentDashboardStats(access.clubId),
    getAssets(access.clubId),
    getAssetMaintenanceList(access.clubId),
  ]);

  const insights = generateEquipmentInsights(stats, assets, maintenance);

  return <EquipmentAiPanel insights={insights} />;
}
