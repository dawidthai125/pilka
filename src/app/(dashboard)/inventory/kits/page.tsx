import { InventoryKitsPanel } from "@/features/inventory/components/inventory-kits-panel";
import { canManageInventory } from "@/config/permissions";
import {
  getDashboardContext,
  getInventoryPlayerKits,
  getPlayers,
  requireInventoryReadAccess,
} from "@/lib/auth/session";

export default async function InventoryKitsPage() {
  const { access } = await getDashboardContext();
  requireInventoryReadAccess(access);

  const [kits, players] = await Promise.all([
    getInventoryPlayerKits(access.clubId),
    getPlayers(access.clubId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Stroje zawodników</h1>
        <p className="text-sm text-muted-foreground">Rozmiary i numery na koszulkach</p>
      </div>
      <InventoryKitsPanel
        kits={kits}
        players={players}
        canManage={canManageInventory(access.roles)}
      />
    </div>
  );
}
