import { InventoryStocktakesPanel } from "@/features/inventory/components/inventory-stocktakes-panel";
import { canManageInventory } from "@/config/permissions";
import {
  getDashboardContext,
  getInventoryStocktakes,
  requireInventoryReadAccess,
} from "@/lib/auth/session";

export default async function InventoryStocktakesPage() {
  const { access } = await getDashboardContext();
  requireInventoryReadAccess(access);
  const stocktakes = await getInventoryStocktakes(access.clubId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Inwentaryzacje</h1>
        <p className="text-sm text-muted-foreground">Spisy magazynowe i rozbieżności</p>
      </div>
      <InventoryStocktakesPanel
        stocktakes={stocktakes}
        canManage={canManageInventory(access.roles)}
      />
    </div>
  );
}
