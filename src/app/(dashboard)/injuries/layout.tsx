import { DashboardModuleShell } from "@/components/layout/dashboard-module-shell";
import { InjurySubNav } from "@/features/injuries/components/injury-sub-nav";
import { getDashboardContext } from "@/lib/auth/session";
import { INJURY_MODULE_DISCLAIMER } from "@/lib/injuries/constants";

export default async function InjuriesLayout({ children }: { children: React.ReactNode }) {
  const { access } = await getDashboardContext();

  return (
    <DashboardModuleShell
      title="Urazy"
      description={`Zarządzanie dostępnością sportową — ${INJURY_MODULE_DISCLAIMER.toLowerCase()}`}
      nav={<InjurySubNav roles={access.roles} />}
    >
      {children}
    </DashboardModuleShell>
  );
}
