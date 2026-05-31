import { InventoryItemsPanel } from "@/features/inventory/components/inventory-items-panel";
import { canManageInventory } from "@/config/permissions";
import {
  getDashboardContext,
  getInventoryCategories,
  getInventoryItems,
  getInventorySuppliers,
  requireInventoryReadAccess,
} from "@/lib/auth/session";

export default async function InventoryItemsPage() {
  const { access } = await getDashboardContext();
  requireInventoryReadAccess(access);

  const [items, categories, suppliers] = await Promise.all([
    getInventoryItems(access.clubId),
    getInventoryCategories(access.clubId),
    getInventorySuppliers(access.clubId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Pozycje magazynowe</h1>
        <p className="text-sm text-muted-foreground">Katalog sprzętu klubowego</p>
      </div>
      <InventoryItemsPanel
        items={items}
        categories={categories}
        suppliers={suppliers}
        canManage={canManageInventory(access.roles)}
      />
    </div>
  );
}
