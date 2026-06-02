import { DashboardModuleShell } from "@/components/layout/dashboard-module-shell";
import { LeagueSubNav } from "@/features/league/components/league-sub-nav";

export default function LeagueLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardModuleShell title="League Hub" description="Tabela, terminarz, import i synchronizacja lig." nav={<LeagueSubNav />}>
      {children}
    </DashboardModuleShell>
  );
}
