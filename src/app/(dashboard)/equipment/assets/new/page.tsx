import { EquipmentAssetForm } from "@/features/equipment/components/equipment-asset-form";
import { getDashboardContext, requireEquipmentManageAccess } from "@/lib/auth/session";
import { getEquipmentCategories } from "@/lib/equipment/loaders";

export default async function EquipmentAssetNewPage() {
  const { access } = await getDashboardContext();
  requireEquipmentManageAccess(access);

  const categories = await getEquipmentCategories(access.clubId);

  return <EquipmentAssetForm categories={categories} />;
}
