import type { SponsorDashboardStats } from "@/types/sponsors";

export function SponsorsDashboardStats({ stats }: { stats: SponsorDashboardStats }) {
  const items = [
    { label: "Sponsorzy", value: stats.totalSponsors },
    { label: "Aktywne umowy", value: stats.activeContracts },
    { label: "Wygasające", value: stats.expiringContracts },
    {
      label: "Wartość umów",
      value: `${stats.activeContractValue.toLocaleString("pl-PL")} PLN`,
    },
    { label: "Otwarte leady", value: stats.openLeads },
    { label: "Publikacje (miesiąc)", value: stats.publicationsThisMonth },
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
