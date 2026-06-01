import { LeagueSourcesPanel } from "@/features/league/components/league-panels";
import { canManageLeague } from "@/config/permissions";
import { getDashboardContext, requireLeagueReadAccess } from "@/lib/auth/session";
import { getLeagueCompetitions, getLeagueSources } from "@/lib/league/loaders";

export default async function LeagueSourcesPage() {
  const { access } = await getDashboardContext();
  requireLeagueReadAccess(access);

  const [sources, competitions] = await Promise.all([
    getLeagueSources(access.clubId),
    getLeagueCompetitions(access.clubId),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Źródła danych</h1>
        <p className="text-sm text-muted-foreground">Adaptery: CSV, JSON, API, Extranet (placeholder).</p>
      </div>
      <LeagueSourcesPanel
        canManage={canManageLeague(access.roles)}
        sources={sources}
        competitions={competitions}
      />
    </div>
  );
}
