import { DashboardModuleShell } from "@/components/layout/dashboard-module-shell";
import { AttendanceSubNav } from "@/features/attendance/components/attendance-sub-nav";
import { canViewAttendanceReports } from "@/config/permissions";
import { getDashboardContext } from "@/lib/auth/session";

export default async function AttendanceLayout({ children }: { children: React.ReactNode }) {
  const { access } = await getDashboardContext();
  const showStaffTabs = canViewAttendanceReports(access.roles);

  return (
    <DashboardModuleShell
      title="Frekwencja & dostępność"
      description="Dostępność zawodników, powołania meczowe i raporty trenera."
      nav={<AttendanceSubNav showStaffTabs={showStaffTabs} />}
    >
      {children}
    </DashboardModuleShell>
  );
}
