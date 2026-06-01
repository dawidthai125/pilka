import { LeagueSyncCenter } from "@/features/league/components/league-panels";
import { canManageLeague, canSyncLeague } from "@/config/permissions";
import { getDashboardContext, requireLeagueReadAccess } from "@/lib/auth/session";
import {
  getLeagueCompetitions,
  getLeagueConflicts,
  getLeagueSyncJobs,
  getLeagueSyncLogs,
} from "@/lib/league/loaders";

export default async function LeagueSyncPage() {
  const { access } = await getDashboardContext();
  requireLeagueReadAccess(access);

  const [jobs, competitions, conflicts] = await Promise.all([
    getLeagueSyncJobs(access.clubId),
    getLeagueCompetitions(access.clubId),
    getLeagueConflicts(access.clubId),
  ]);

  const logs = jobs[0] ? await getLeagueSyncLogs(access.clubId, jobs[0].id) : [];

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Sync Center</h1>
        <p className="text-sm text-muted-foreground">
          Status: oczekuje · zsynchronizowano · błąd — z logami synchronizacji.
        </p>
      </div>
      <LeagueSyncCenter
        canSync={canSyncLeague(access.roles) || canManageLeague(access.roles)}
        jobs={jobs}
        logs={logs}
        competitions={competitions}
        conflicts={conflicts}
      />
    </div>
  );
}
