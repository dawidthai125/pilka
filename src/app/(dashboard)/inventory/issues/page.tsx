import { InventoryIssuesPanel } from "@/features/inventory/components/inventory-issues-panel";
import { canIssueInventory } from "@/config/permissions";
import { todayIsoDate } from "@/lib/dates";
import {
  getClubMembers,
  getDashboardContext,
  getInventoryItems,
  getInventoryTransactions,
  getPlayers,
  requireInventoryReadAccess,
} from "@/lib/auth/session";

export default async function InventoryIssuesPage() {
  const { access } = await getDashboardContext();
  requireInventoryReadAccess(access);

  const [items, players, members, transactions] = await Promise.all([
    getInventoryItems(access.clubId),
    getPlayers(access.clubId),
    getClubMembers(access.clubId),
    getInventoryTransactions(access.clubId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Wydania sprzętu</h1>
        <p className="text-sm text-muted-foreground">Rejestracja wydań zawodnikom i pracownikom</p>
      </div>
      <InventoryIssuesPanel
        items={items}
        players={players}
        members={members}
        transactions={transactions}
        canIssue={canIssueInventory(access.roles)}
        defaultDate={todayIsoDate()}
      />
    </div>
  );
}
