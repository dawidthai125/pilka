import type {
  AssetMaintenanceRow,
  AssetRow,
  EquipmentAiInsight,
  EquipmentDashboardStats,
} from "@/types/equipment";

export function generateEquipmentInsights(
  stats: EquipmentDashboardStats,
  assets: AssetRow[],
  maintenance: AssetMaintenanceRow[],
): EquipmentAiInsight[] {
  const insights: EquipmentAiInsight[] = [];

  if (stats.needsRepair > 0) {
    insights.push({
      id: "repair-needed",
      title: "Sprzęt wymaga naprawy",
      body: `${stats.needsRepair} pozycji ma status „do naprawy” lub „uszkodzony”. Zaplanuj serwis lub wymianę.`,
      severity: "warning",
    });
  }

  const lowStock = assets.filter((a) => a.quantityAvailable <= 2 && a.quantity > 2);
  if (lowStock.length) {
    insights.push({
      id: "low-stock",
      title: "Niski stan magazynowy",
      body: `${lowStock.length} pozycji ma mało dostępnych sztuk: ${lowStock.map((a) => a.name).slice(0, 3).join(", ")}.`,
      severity: "warning",
    });
  }

  const overdueMaintenance = maintenance.filter(
    (m) =>
      m.status !== "completed" &&
      m.scheduledAt &&
      new Date(m.scheduledAt).getTime() < Date.now(),
  );
  if (overdueMaintenance.length) {
    insights.push({
      id: "maintenance-overdue",
      title: "Przeterminowane przeglądy",
      body: `${overdueMaintenance.length} zgłoszeń konserwacji po terminie.`,
      severity: "critical",
    });
  }

  if (stats.loanedOut >= 5) {
    insights.push({
      id: "many-loans",
      title: "Dużo wypożyczeń aktywnych",
      body: `${stats.loanedOut} aktywnych wydań — upewnij się, że zwroty są rejestrowane.`,
      severity: "info",
    });
  }

  if (stats.totalValue > 50000) {
    insights.push({
      id: "asset-value",
      title: "Wartość majątku klubowego",
      body: `Szacunkowa wartość aktywów: ${stats.totalValue.toLocaleString("pl-PL")} PLN. Rozważ ubezpieczenie sprzętu.`,
      severity: "info",
    });
  }

  const replaceCandidates = assets.filter(
    (a) => a.condition === "damaged" || a.condition === "retired",
  );
  if (replaceCandidates.length) {
    insights.push({
      id: "replace-candidates",
      title: "Sprzęt do wymiany",
      body: `${replaceCandidates.length} pozycji kwalifikuje się do wymiany w najbliższym budżecie.`,
      severity: "warning",
    });
  }

  return insights;
}
