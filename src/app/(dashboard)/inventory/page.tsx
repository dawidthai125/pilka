import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import { InventoryAlerts } from "@/features/inventory/components/inventory-alerts";
import { InventoryDashboardStats } from "@/features/inventory/components/inventory-dashboard-stats";
import { cn } from "@/lib/utils";
import {
  getDashboardContext,
  getInventoryDashboardStats,
  requireInventoryReadAccess,
} from "@/lib/auth/session";
import { INVENTORY_DAMAGE_STATUS_LABELS, INVENTORY_RECIPIENT_TYPE_LABELS } from "@/lib/inventory/constants";

export default async function InventoryPage() {
  const { access } = await getDashboardContext();
  requireInventoryReadAccess(access);
  const stats = await getInventoryDashboardStats(access.clubId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Magazyn klubu</h1>
          <p className="text-sm text-muted-foreground">
            Dashboard magazyniera — {stats.availableQuantity} szt. dostępnych
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/inventory/items" className={cn(buttonVariants({ variant: "outline" }))}>Pozycje</Link>
          <Link href="/inventory/issues" className={cn(buttonVariants({ variant: "outline" }))}>Wydania</Link>
          <Link href="/inventory/returns" className={cn(buttonVariants({ variant: "outline" }))}>Zwroty</Link>
          <Link href="/inventory/damages" className={cn(buttonVariants({ variant: "outline" }))}>Uszkodzenia</Link>
          <Link href="/inventory/kits" className={cn(buttonVariants({ variant: "outline" }))}>Stroje</Link>
          <Link href="/inventory/stocktakes" className={cn(buttonVariants({ variant: "outline" }))}>Inwentaryzacje</Link>
          <Link href="/inventory/suppliers" className={cn(buttonVariants({ variant: "outline" }))}>Dostawcy</Link>
          <Link href="/inventory/orders" className={cn(buttonVariants({ variant: "outline" }))}>Zamówienia</Link>
          <Link href="/inventory/reports" className={cn(buttonVariants({ variant: "outline" }))}>Raporty</Link>
        </div>
      </div>

      <InventoryDashboardStats stats={stats} />

      <section>
        <h2 className="mb-3 text-lg font-semibold">Alerty</h2>
        <InventoryAlerts alerts={stats.alerts} />
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section>
          <h2 className="mb-3 text-lg font-semibold">Ostatnie wydania</h2>
          <div className="overflow-x-auto rounded-xl border">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="border-b bg-muted/40 text-left">
                <tr>
                  <th className="px-4 py-3">Sprzęt</th>
                  <th className="px-4 py-3">Odbiorca</th>
                  <th className="px-4 py-3">Data</th>
                </tr>
              </thead>
              <tbody>
                {stats.recentIssues.map((tx) => (
                  <tr key={tx.id} className="border-b last:border-0">
                    <td className="px-4 py-3">{tx.itemName ?? "—"}</td>
                    <td className="px-4 py-3">
                      {tx.recipientType === "player"
                        ? tx.playerName ?? "—"
                        : tx.profileName ?? INVENTORY_RECIPIENT_TYPE_LABELS[tx.recipientType]}
                    </td>
                    <td className="px-4 py-3">{tx.issueDate}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <Link href="/inventory/issues" className="mt-3 inline-block text-sm text-primary underline">
            Wszystkie wydania
          </Link>
        </section>

        <section>
          <h2 className="mb-3 text-lg font-semibold">Otwarte uszkodzenia</h2>
          <ul className="space-y-2">
            {stats.recentDamages.map((damage) => (
              <li key={damage.id} className="rounded-lg border px-4 py-3 text-sm">
                <p className="font-medium">{damage.itemName ?? "—"}</p>
                <p className="text-muted-foreground">
                  {INVENTORY_DAMAGE_STATUS_LABELS[damage.status]} · {damage.damageDate}
                </p>
              </li>
            ))}
          </ul>
          <Link href="/inventory/damages" className="mt-3 inline-block text-sm text-primary underline">
            Wszystkie uszkodzenia
          </Link>
        </section>
      </div>
    </div>
  );
}
