import { InventoryDamagesPanel } from "@/features/inventory/components/inventory-damages-panel";
import { canIssueInventory } from "@/config/permissions";
import {
  getDashboardContext,
  getInventoryDamages,
  getInventoryItems,
  requireInventoryReadAccess,
} from "@/lib/auth/session";

export default async function InventoryDamagesPage() {
  const { access } = await getDashboardContext();
  requireInventoryReadAccess(access);

  const [items, damages] = await Promise.all([
    getInventoryItems(access.clubId),
    getInventoryDamages(access.clubId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Uszkodzenia sprzętu</h1>
        <p className="text-sm text-muted-foreground">Zgłoszenia i status napraw</p>
      </div>
      <InventoryDamagesPanel
        items={items}
        damages={damages}
        canIssue={canIssueInventory(access.roles)}
      />
    </div>
  );
}
