import { InventorySuppliersPanel } from "@/features/inventory/components/inventory-suppliers-panel";
import { canManageInventory } from "@/config/permissions";
import {
  getDashboardContext,
  getInventorySuppliers,
  requireInventoryReadAccess,
} from "@/lib/auth/session";

export default async function InventorySuppliersPage() {
  const { access } = await getDashboardContext();
  requireInventoryReadAccess(access);
  const suppliers = await getInventorySuppliers(access.clubId);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Dostawcy</h1>
        <p className="text-sm text-muted-foreground">Baza dostawców sprzętu</p>
      </div>
      <InventorySuppliersPanel
        suppliers={suppliers}
        canManage={canManageInventory(access.roles)}
      />
    </div>
  );
}
