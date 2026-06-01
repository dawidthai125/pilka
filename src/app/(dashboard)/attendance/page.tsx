import { AttendanceDashboardWidgetsPanel } from "@/features/attendance/components/attendance-dashboard-widgets";
import { getAttendanceDashboardWidgets } from "@/lib/attendance/loaders";
import { getDashboardContext, requireAttendanceReadAccess } from "@/lib/auth/session";

export default async function AttendancePage() {
  const { access } = await getDashboardContext();
  requireAttendanceReadAccess(access);

  const widgets = await getAttendanceDashboardWidgets(access.clubId);

  return <AttendanceDashboardWidgetsPanel widgets={widgets} />;
}
