import { AvailabilityCalendarGrid } from "@/features/attendance/components/availability-calendar";
import { getMonthlyAvailabilityCalendar } from "@/lib/attendance/loaders";
import { getDashboardContext, requireAttendanceReadAccess } from "@/lib/auth/session";
import { resolveOwnPlayerIds } from "@/lib/players/access";
import { canViewAttendanceReports } from "@/config/permissions";

export default async function AttendanceCalendarPage({
  searchParams,
}: {
  searchParams: Promise<{ month?: string; view?: string; teamId?: string }>;
}) {
  const { access } = await getDashboardContext();
  requireAttendanceReadAccess(access);
  const params = await searchParams;

  const now = new Date();
  const month = params.month ?? `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
  const view = params.view === "team" || params.view === "coach" ? params.view : "player";
  const ownIds = await resolveOwnPlayerIds(access);
  const playerId = view === "player" ? ownIds[0] : undefined;

  const days = await getMonthlyAvailabilityCalendar(
    access.clubId,
    month,
    canViewAttendanceReports(access.roles) && view === "coach" ? "coach" : view === "team" ? "team" : "player",
    playerId,
    params.teamId,
  );

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        Widok: {view === "coach" ? "trener" : view === "team" ? "drużyna" : "zawodnik"} · {month}
      </p>
      <AvailabilityCalendarGrid month={month} days={days} />
    </div>
  );
}
