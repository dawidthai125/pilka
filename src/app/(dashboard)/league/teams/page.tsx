import { LeagueTeamsPanel } from "@/features/league/components/league-panels";
import { canManageLeague } from "@/config/permissions";
import { getDashboardContext, getTeams, requireLeagueReadAccess } from "@/lib/auth/session";
import { getLeagueCompetitions, getLeagueTeams, getActiveLeagueSeason } from "@/lib/league/loaders";

export default async function LeagueTeamsPage() {
  const { access } = await getDashboardContext();
  requireLeagueReadAccess(access);

  const season = await getActiveLeagueSeason(access.clubId);
  const competitions = await getLeagueCompetitions(access.clubId, season?.id);
  const competition = competitions[0];
  const [teams, clubTeams] = await Promise.all([
    competition ? getLeagueTeams(access.clubId, competition.id) : Promise.resolve([]),
    getTeams(access.clubId),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Drużyny ligowe</h1>
        <p className="text-sm text-muted-foreground">Mapowanie nazw brandingowych i ligowych.</p>
      </div>
      <LeagueTeamsPanel
        canManage={canManageLeague(access.roles)}
        teams={teams}
        competitions={competitions}
        clubTeams={clubTeams}
      />
    </div>
  );
}
