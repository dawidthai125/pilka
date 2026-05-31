import { InventoryReturnsPanel } from "@/features/inventory/components/inventory-returns-panel";
import { canIssueInventory } from "@/config/permissions";
import {
  getDashboardContext,
  getInventoryItems,
  getInventoryReturns,
  getInventoryTransactions,
  requireInventoryReadAccess,
} from "@/lib/auth/session";

export default async function InventoryReturnsPage() {
  const { access } = await getDashboardContext();
  requireInventoryReadAccess(access);

  const [items, transactions, returns] = await Promise.all([
    getInventoryItems(access.clubId),
    getInventoryTransactions(access.clubId),
    getInventoryReturns(access.clubId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Zwroty sprzętu</h1>
        <p className="text-sm text-muted-foreground">Rejestracja zwrotów od zawodników i pracowników</p>
      </div>
      <InventoryReturnsPanel
        items={items}
        transactions={transactions}
        returns={returns}
        canIssue={canIssueInventory(access.roles)}
      />
    </div>
  );
}
