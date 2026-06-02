import { AttendanceSubNav } from "@/features/attendance/components/attendance-sub-nav";
import { canViewAttendanceReports } from "@/config/permissions";
import { getDashboardContext } from "@/lib/auth/session";

export default async function AttendanceLayout({ children }: { children: React.ReactNode }) {
  const { access } = await getDashboardContext();
  const showStaffTabs = canViewAttendanceReports(access.roles);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Frekwencja &amp; dostępność</h1>
        <p className="text-sm text-muted-foreground">
          Dostępność zawodników, powołania meczowe i raporty trenera.
        </p>
      </div>
      <AttendanceSubNav showStaffTabs={showStaffTabs} />
      {children}
    </div>
  );
}
