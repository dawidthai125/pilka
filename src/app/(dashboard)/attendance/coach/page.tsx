import { CoachAttendanceReportPanel } from "@/features/attendance/components/coach-attendance-report";
import { canViewAttendanceReports } from "@/config/permissions";
import { getCoachAttendanceReport } from "@/lib/attendance/loaders";
import { getDashboardContext, requireAttendanceReadAccess } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function AttendanceCoachPage() {
  const { access } = await getDashboardContext();
  requireAttendanceReadAccess(access);
  if (!canViewAttendanceReports(access.roles)) redirect("/attendance");

  const report = await getCoachAttendanceReport(access.clubId);

  return <CoachAttendanceReportPanel report={report} />;
}
