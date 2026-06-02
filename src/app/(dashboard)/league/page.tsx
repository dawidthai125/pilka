import {
  LeagueDashboardStatsCards,
  LeagueFixturesList,
  LeagueTableView,
} from "@/features/league/components/league-panels";
import { canSyncLeague } from "@/config/permissions";
import { getDashboardContext, requireLeagueReadAccess } from "@/lib/auth/session";
import {
  getActiveLeagueSeason,
  getLeagueCompetitions,
  getLeagueDashboardStats,
  getLeagueRecentResults,
  getLeagueTeams,
  getLeagueUpcoming,
} from "@/lib/league/loaders";
import { buildLeagueAiInsightsFromData, formatLeagueInsightsSummary } from "@/lib/league/insights";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

export default async function LeagueDashboardPage() {
  const { access } = await getDashboardContext();
  requireLeagueReadAccess(access);

  const season = await getActiveLeagueSeason(access.clubId);
  const competitions = await getLeagueCompetitions(access.clubId, season?.id);
  const competition = competitions[0];

  if (!competition || !season) {
    return (
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">League Hub</h1>
        <p className="mt-2 text-sm text-muted-foreground">Brak skonfigurowanych rozgrywek — uruchom seed ETAP 15B.</p>
      </div>
    );
  }

  const [stats, recent, upcoming, teams] = await Promise.all([
    getLeagueDashboardStats(access.clubId, competition.id),
    getLeagueRecentResults(access.clubId, competition.id, 5),
    getLeagueUpcoming(access.clubId, competition.id, 5),
    getLeagueTeams(access.clubId, competition.id),
  ]);

  const table = stats.table;
  const insights = buildLeagueAiInsightsFromData(season, competition, table, recent, upcoming, teams);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">League Hub</h1>
        <p className="text-sm text-muted-foreground">
          {season.name} · {competition.name} · centralne zarządzanie rozgrywkami
        </p>
      </div>

      <LeagueDashboardStatsCards stats={stats} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Tabela ligowa</h2>
          <LeagueTableView rows={table} />
        </div>
        {insights ? (
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">AI Match Insights</CardTitle>
              <CardDescription>Analiza wyników, serii i pozycji w tabeli.</CardDescription>
            </CardHeader>
            <CardContent className="whitespace-pre-wrap text-sm text-muted-foreground">
              {formatLeagueInsightsSummary(insights)}
            </CardContent>
          </Card>
        ) : null}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <LeagueFixturesList title="Ostatnie wyniki" matches={recent} />
        <LeagueFixturesList title="Następne mecze" matches={upcoming} />
      </div>

      {canSyncLeague(access.roles) ? (
        <p className="text-xs text-muted-foreground">
          Po synchronizacji wyników AI w Content Hub może wygenerować relację — powiąż materiał z match_id w module Mecze.
        </p>
      ) : null}
    </div>
  );
}
