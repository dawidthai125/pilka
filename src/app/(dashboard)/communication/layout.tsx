import { DashboardModuleShell } from "@/components/layout/dashboard-module-shell";
import { CommunicationSubNav } from "@/features/communication/components/communication-sub-nav";

export default function CommunicationLayout({ children }: { children: React.ReactNode }) {
  return (
    <DashboardModuleShell title="Komunikacja" description="Ogłoszenia, czaty i kanały klubowe." nav={<CommunicationSubNav />}>
      {children}
    </DashboardModuleShell>
  );
}
