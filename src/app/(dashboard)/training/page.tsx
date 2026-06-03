import { Suspense } from "react";

import { TrainingCalendar } from "@/features/training/components/training-calendar";
import { canManageTrainings } from "@/config/permissions";
import {
  getCoaches,
  getDashboardContext,
  getTeams,
  getTrainings,
  requireTrainingReadAccess,
} from "@/lib/auth/session";
import type { CalendarView } from "@/types/trainings";

type SearchParams = Promise<{
  view?: string;
  date?: string;
  team?: string;
  coach?: string;
}>;

function parseView(value: string | undefined): CalendarView {
  if (value === "week" || value === "day") return value;
  return "month";
}

async function TrainingCalendarSection({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  const params = await searchParams;
  const view = parseView(params.view);
  const date = params.date ?? new Date().toISOString().slice(0, 10);
  const teamId = params.team;
  const coachUserId = params.coach;

  const { access } = await getDashboardContext();
  requireTrainingReadAccess(access);

  const [trainings, teams, coaches] = await Promise.all([
    getTrainings(undefined, view, date, { teamId, coachUserId }),
    getTeams(access.clubId),
    getCoaches(access.clubId),
  ]);

  return (
    <TrainingCalendar
      trainings={trainings}
      teams={teams}
      coaches={coaches}
      initialView={view}
      initialDate={date}
      initialTeamId={teamId}
      initialCoachId={coachUserId}
      canManage={canManageTrainings(access.roles)}
    />
  );
}

export default function TrainingPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Treningi</h1>
        <p className="text-sm text-muted-foreground">
          Kalendarz treningów — widoki miesiąc, tydzień i dzień z filtrowaniem drużyny i trenera.
        </p>
      </div>

      <Suspense fallback={<p className="text-sm text-muted-foreground">Ładowanie kalendarza...</p>}>
        <TrainingCalendarSection searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
