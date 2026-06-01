import { LeagueImportForm } from "@/features/league/components/league-panels";
import { canSyncLeague } from "@/config/permissions";
import { getDashboardContext, requireLeagueReadAccess } from "@/lib/auth/session";
import {
  getLeagueCompetitions,
  getLeagueSeasons,
  getLeagueSources,
} from "@/lib/league/loaders";

export default async function LeagueImportPage() {
  const { access } = await getDashboardContext();
  requireLeagueReadAccess(access);

  const [seasons, competitions, sources] = await Promise.all([
    getLeagueSeasons(access.clubId),
    getLeagueCompetitions(access.clubId),
    getLeagueSources(access.clubId),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Import danych</h1>
        <p className="text-sm text-muted-foreground">CSV, JSON, Excel — mapowanie przez warstwę adapterów.</p>
      </div>
      <LeagueImportForm
        canSync={canSyncLeague(access.roles)}
        seasons={seasons}
        competitions={competitions}
        sources={sources}
      />
    </div>
  );
}
