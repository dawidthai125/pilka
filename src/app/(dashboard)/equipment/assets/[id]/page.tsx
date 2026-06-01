import { notFound } from "next/navigation";

import { EquipmentAssetDetail } from "@/features/equipment/components/equipment-asset-detail";
import { canIssueEquipment } from "@/config/permissions";
import { getDashboardContext, requireEquipmentReadAccess } from "@/lib/auth/session";
import { getAssetDetail } from "@/lib/equipment/loaders";

export default async function EquipmentAssetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { access } = await getDashboardContext();
  requireEquipmentReadAccess(access);

  const detail = await getAssetDetail(access.clubId, id);
  if (!detail) notFound();

  return (
    <EquipmentAssetDetail
      asset={detail.asset}
      assignments={detail.assignments}
      maintenance={detail.maintenance}
      canIssue={canIssueEquipment(access.roles)}
    />
  );
}
