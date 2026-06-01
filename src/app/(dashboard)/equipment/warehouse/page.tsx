import { EquipmentWarehousePanel } from "@/features/equipment/components/equipment-warehouse-panel";
import { getDashboardContext, requireEquipmentReadAccess } from "@/lib/auth/session";
import { getAssets, getEquipmentCategories } from "@/lib/equipment/loaders";

export default async function EquipmentWarehousePage() {
  const { access } = await getDashboardContext();
  requireEquipmentReadAccess(access);

  const [assets, categories] = await Promise.all([
    getAssets(access.clubId),
    getEquipmentCategories(access.clubId),
  ]);

  return <EquipmentWarehousePanel assets={assets} categories={categories} />;
}
