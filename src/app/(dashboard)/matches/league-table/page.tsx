import { LeagueTableView } from "@/features/matches/components/league-table-view";
import { canManageMatches } from "@/config/permissions";
import {
  getDashboardContext,
  getLeagueTable,
  MATCH_DEFAULT_COMPETITION,
  MATCH_DEFAULT_SEASON,
  requireMatchReadAccess,
} from "@/lib/auth/session";

export default async function LeagueTablePage() {
  const { access } = await getDashboardContext();
  requireMatchReadAccess(access);

  const entries = await getLeagueTable(MATCH_DEFAULT_COMPETITION, MATCH_DEFAULT_SEASON);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Tabela ligowa</h1>
        <p className="text-sm text-muted-foreground">
          {MATCH_DEFAULT_COMPETITION} · Sezon {MATCH_DEFAULT_SEASON} — edycja ręczna, architektura pod DZPN/PZPN.
        </p>
      </div>
      <LeagueTableView
        entries={entries}
        competition={MATCH_DEFAULT_COMPETITION}
        season={MATCH_DEFAULT_SEASON}
        canManage={canManageMatches(access.roles)}
      />
    </div>
  );
}
