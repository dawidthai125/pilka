import { LeagueTableView } from "@/features/league/components/league-panels";
import { getDashboardContext, requireLeagueReadAccess } from "@/lib/auth/session";
import {
  getActiveLeagueSeason,
  getLatestLeagueTable,
  getLeagueCompetitions,
} from "@/lib/league/loaders";

export default async function LeagueTablePage() {
  const { access } = await getDashboardContext();
  requireLeagueReadAccess(access);

  const season = await getActiveLeagueSeason(access.clubId);
  const competitions = await getLeagueCompetitions(access.clubId, season?.id);
  const competition = competitions[0];
  const table = competition ? await getLatestLeagueTable(access.clubId, competition.id) : [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Tabela ligowa</h1>
        <p className="text-sm text-muted-foreground">
          Historia snapshotów w league_tables — widok bieżący.
        </p>
      </div>
      <LeagueTableView rows={table} />
    </div>
  );
}
