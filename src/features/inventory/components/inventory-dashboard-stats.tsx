import { StatsGrid } from "@/components/ui/stats-grid";
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

  return <StatsGrid items={items} />;
}
