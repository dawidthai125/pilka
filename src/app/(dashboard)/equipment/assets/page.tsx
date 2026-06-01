import Link from "next/link";

import { EquipmentAssetsList } from "@/features/equipment/components/equipment-assets-list";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { canManageEquipment } from "@/config/permissions";
import { getDashboardContext, requireEquipmentReadAccess } from "@/lib/auth/session";
import { getAssets } from "@/lib/equipment/loaders";

export default async function EquipmentAssetsPage() {
  const { access } = await getDashboardContext();
  requireEquipmentReadAccess(access);

  const assets = await getAssets(access.clubId);

  return (
    <div className="space-y-4">
      {canManageEquipment(access.roles) ? (
        <Link href="/equipment/assets/new" className={cn(buttonVariants())}>
          Dodaj sprzęt
        </Link>
      ) : null}
      <EquipmentAssetsList assets={assets} />
    </div>
  );
}
