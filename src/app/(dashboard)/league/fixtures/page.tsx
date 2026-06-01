import { LeagueFixturesList } from "@/features/league/components/league-panels";
import { getDashboardContext, requireLeagueReadAccess } from "@/lib/auth/session";
import {
  getActiveLeagueSeason,
  getLeagueCompetitions,
  getLeagueFixtures,
} from "@/lib/league/loaders";

export default async function LeagueFixturesPage() {
  const { access } = await getDashboardContext();
  requireLeagueReadAccess(access);

  const season = await getActiveLeagueSeason(access.clubId);
  const competitions = await getLeagueCompetitions(access.clubId, season?.id);
  const competition = competitions[0];
  const fixtures = competition ? await getLeagueFixtures(access.clubId, competition.id, 100) : [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Terminarz</h1>
        <p className="text-sm text-muted-foreground">Kolejki i terminy meczów ligowych.</p>
      </div>
      <LeagueFixturesList title="Pełny terminarz" matches={fixtures} />
    </div>
  );
}
