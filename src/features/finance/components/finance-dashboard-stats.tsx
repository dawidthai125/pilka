import { StatsGrid } from "@/components/ui/stats-grid";
import { formatMoney } from "@/lib/finance/constants";
import type { FinanceDashboardStats } from "@/types/finance";

export function FinanceDashboardStats({ stats }: { stats: FinanceDashboardStats }) {
  const items = [
    { label: "Saldo klubu", value: formatMoney(stats.balance) },
    { label: "Przychody", value: formatMoney(stats.totalIncome) },
    { label: "Koszty", value: formatMoney(stats.totalExpenses) },
    { label: "Zaległe składki", value: stats.overdueFeesCount },
    { label: "Przychody od sponsorów", value: formatMoney(stats.sponsorIncomeTotal) },
    { label: "Zebrane składki", value: formatMoney(stats.totalFeesPaid) },
  ];

  return <StatsGrid items={items} />;
}
