import { LeaguePlayersPanel } from "@/features/league/components/league-panels";
import { canManageLeague } from "@/config/permissions";
import { getDashboardContext, requireLeagueReadAccess } from "@/lib/auth/session";
import {
  getLeagueCompetitions,
  getLeaguePlayerRegistry,
  getLeagueSeasons,
} from "@/lib/league/loaders";

export default async function LeaguePlayersPage() {
  const { access } = await getDashboardContext();
  requireLeagueReadAccess(access);

  const [entries, competitions, seasons] = await Promise.all([
    getLeaguePlayerRegistry(access.clubId),
    getLeagueCompetitions(access.clubId),
    getLeagueSeasons(access.clubId),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Rejestr zawodników</h1>
        <p className="text-sm text-muted-foreground">Powiązania zawodników FC OS z danymi rozgrywkowymi.</p>
      </div>
      <LeaguePlayersPanel
        canManage={canManageLeague(access.roles)}
        entries={entries}
        competitions={competitions}
        seasons={seasons}
      />
    </div>
  );
}
