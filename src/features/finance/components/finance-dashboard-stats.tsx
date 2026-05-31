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
