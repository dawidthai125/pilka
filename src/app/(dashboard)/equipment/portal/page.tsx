import { EquipmentPortalPanel } from "@/features/equipment/components/equipment-portal-panel";
import { getDashboardContext, requireEquipmentPortalAccess } from "@/lib/auth/session";
import { getPortalEquipment } from "@/lib/equipment/loaders";

export default async function EquipmentPortalPage() {
  const { access } = await getDashboardContext();
  requireEquipmentPortalAccess(access);

  const { assignments, kits } = await getPortalEquipment(access.clubId);

  return (
    <div className="space-y-2">
      <div>
        <h1 className="text-2xl font-semibold">Mój sprzęt</h1>
        <p className="text-sm text-muted-foreground">Wydania i stroje przypisane do Ciebie lub dziecka.</p>
      </div>
      <EquipmentPortalPanel assignments={assignments} kits={kits} />
    </div>
  );
}
