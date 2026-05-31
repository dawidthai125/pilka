import { PlayerInventoryPortal } from "@/features/inventory/components/player-inventory-portal";
import {
  getDashboardContext,
  getPlayerInventoryPortalData,
  requireInventoryPortalAccess,
} from "@/lib/auth/session";

export default async function InventoryPortalPage() {
  const { access } = await getDashboardContext();
  requireInventoryPortalAccess(access);
  const data = await getPlayerInventoryPortalData(access.clubId);

  if (!data) {
    return (
      <div className="rounded-xl border p-6 text-center text-muted-foreground">
        Brak powiązanego profilu zawodnika. Skontaktuj się z klubem.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Mój sprzęt</h1>
        <p className="text-sm text-muted-foreground">Panel zawodnika — wyłącznie Twoje wyposażenie</p>
      </div>
      <PlayerInventoryPortal data={data} />
    </div>
  );
}
