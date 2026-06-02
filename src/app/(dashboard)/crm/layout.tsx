import { DashboardModuleShell } from "@/components/layout/dashboard-module-shell";
import { CrmSubNav } from "@/features/crm/components/crm-sub-nav";

export default function CrmLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardModuleShell
      title="Club CRM"
      description="Relacje, sponsorzy, rodzice, partnerzy i wydarzenia klubu."
      nav={<CrmSubNav />}
    >
      {children}
    </DashboardModuleShell>
  );
}
