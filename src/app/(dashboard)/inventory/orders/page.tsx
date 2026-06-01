import { InventoryOrdersPanel } from "@/features/inventory/components/inventory-orders-panel";
import { canManageInventory } from "@/config/permissions";
import { todayIsoDate } from "@/lib/dates";
import {
  getDashboardContext,
  getInventoryPurchaseOrders,
  getInventorySuppliers,
  requireInventoryReadAccess,
} from "@/lib/auth/session";

export default async function InventoryOrdersPage() {
  const { access } = await getDashboardContext();
  requireInventoryReadAccess(access);

  const [orders, suppliers] = await Promise.all([
    getInventoryPurchaseOrders(access.clubId),
    getInventorySuppliers(access.clubId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Zamówienia zakupowe</h1>
        <p className="text-sm text-muted-foreground">Zamówienia sprzętu u dostawców</p>
      </div>
      <InventoryOrdersPanel
        orders={orders}
        suppliers={suppliers}
        canManage={canManageInventory(access.roles)}
        defaultDate={todayIsoDate()}
      />
    </div>
  );
}
