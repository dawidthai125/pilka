import { AttendanceAiPanel } from "@/features/attendance/components/attendance-ai-panel";
import { generateAttendanceInsights } from "@/lib/attendance/insights";
import {
  getAttendanceDashboardWidgets,
  getPlayerFrequencyStats,
} from "@/lib/attendance/loaders";
import { getDashboardContext, requireAttendanceReadAccess } from "@/lib/auth/session";
import { canViewAttendanceReports } from "@/config/permissions";
import { redirect } from "next/navigation";

export default async function AttendanceAiPage() {
  const { access } = await getDashboardContext();
  requireAttendanceReadAccess(access);
  if (!canViewAttendanceReports(access.roles)) redirect("/attendance");

  const [widgets, stats] = await Promise.all([
    getAttendanceDashboardWidgets(access.clubId),
    getPlayerFrequencyStats(access.clubId),
  ]);
  const insights = generateAttendanceInsights(widgets, stats);

  return <AttendanceAiPanel insights={insights} />;
}
