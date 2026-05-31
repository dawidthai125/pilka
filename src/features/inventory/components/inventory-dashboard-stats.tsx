import type { InventoryDashboardStats } from "@/types/inventory";

export function InventoryDashboardStats({ stats }: { stats: InventoryDashboardStats }) {
  const items = [
    { label: "Pozycje magazynowe", value: stats.totalItems },
    { label: "Sztuk łącznie", value: stats.totalQuantity },
    { label: "Dostępne", value: stats.availableQuantity },
    { label: "Wydane", value: stats.issuedQuantity },
    { label: "Uszkodzone", value: stats.damagedQuantity },
    { label: "Niski stan", value: stats.lowStockCount },
    { label: "Brak na stanie", value: stats.outOfStockCount },
    { label: "Piłki dostępne", value: stats.ballsAvailable },
    { label: "Otwarte uszkodzenia", value: stats.openDamagesCount },
    { label: "Otwarte zamówienia", value: stats.openOrdersCount },
  ];

  return (
    <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((item) => (
        <div key={item.label} className="rounded-xl border bg-card p-4">
          <p className="text-xs text-muted-foreground">{item.label}</p>
          <p className="mt-1 text-2xl font-semibold">{item.value}</p>
        </div>
      ))}
    </div>
  );
}
