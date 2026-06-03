import { Suspense } from "react";

import { MatchCalendar } from "@/features/matches/components/match-calendar";
import { canManageMatches } from "@/config/permissions";
import {
  getDashboardContext,
  getMatchFilterOptions,
  getMatches,
  getTeams,
  requireMatchReadAccess,
} from "@/lib/auth/session";
import type { MatchCalendarView } from "@/types/matches";

type SearchParams = Promise<{ view?: string; date?: string; team?: string; season?: string; competition?: string }>;

async function CalendarSection({ searchParams }: { searchParams: SearchParams }) {
  const params = await searchParams;
  const view = (params.view === "week" || params.view === "list" ? params.view : "month") as MatchCalendarView;
  const date = params.date ?? new Date().toISOString().slice(0, 10);

  const { access } = await getDashboardContext();
  requireMatchReadAccess(access);

  const [matches, teams, options] = await Promise.all([
    getMatches(undefined, view, date, {
      teamId: params.team,
      season: params.season,
      competition: params.competition,
    }),
    getTeams(access.clubId),
    getMatchFilterOptions(access.clubId),
  ]);

  return (
    <MatchCalendar
      matches={matches}
      seasons={options.seasons}
      competitions={options.competitions}
      teams={teams.map((t) => ({ id: t.id, name: t.name }))}
      initialView={view}
      initialDate={date}
      filters={{ teamId: params.team, season: params.season, competition: params.competition }}
      canManage={canManageMatches(access.roles)}
    />
  );
}

export default function MatchesPage({ searchParams }: { searchParams: SearchParams }) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Mecze</h1>
        <p className="text-sm text-muted-foreground">Kalendarz meczów — widoki miesiąc, tydzień i lista.</p>
      </div>
      <Suspense fallback={<p className="text-sm text-muted-foreground">Ładowanie...</p>}>
        <CalendarSection searchParams={searchParams} />
      </Suspense>
    </div>
  );
}
