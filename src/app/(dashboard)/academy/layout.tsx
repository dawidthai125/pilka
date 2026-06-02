import { DashboardModuleShell } from "@/components/layout/dashboard-module-shell";
import { AcademySubNav } from "@/features/academy/components/academy-sub-nav";
import { getAcademyNavItems } from "@/lib/academy/constants";
import { getDashboardContext } from "@/lib/auth/session";

export default async function AcademyLayout({ children }: { children: React.ReactNode }) {
  const { access } = await getDashboardContext();
  const navItems = getAcademyNavItems(access.roles);

  return (
    <DashboardModuleShell title="Akademia" description="Grupy, talenty, scouting i rozwój zawodników." nav={<AcademySubNav items={navItems} />}>
      {children}
    </DashboardModuleShell>
  );
}
