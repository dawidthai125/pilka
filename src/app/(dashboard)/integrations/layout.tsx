import { DashboardModuleShell } from "@/components/layout/dashboard-module-shell";
import { IntegrationsSubNav } from "@/features/integrations/components/integrations-sub-nav";

export default function IntegrationsLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardModuleShell title="Integracje" description="PZPN, DZPN, importy i synchronizacja danych." nav={<IntegrationsSubNav />}>
      {children}
    </DashboardModuleShell>
  );
}
