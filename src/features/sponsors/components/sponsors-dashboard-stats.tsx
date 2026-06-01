import { StatsGrid } from "@/components/ui/stats-grid";
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

  return <StatsGrid items={items} />;
}
