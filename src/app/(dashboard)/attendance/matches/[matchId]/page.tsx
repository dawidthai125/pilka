import { notFound } from "next/navigation";

import { MatchSquadPanel } from "@/features/attendance/components/match-squad-panel";
import { canManageMatchSquad } from "@/config/permissions";
import { getMatchSquadCalls } from "@/lib/attendance/loaders";
import { getDashboardContext, requireAttendanceReadAccess } from "@/lib/auth/session";
import { resolveOwnPlayerIds } from "@/lib/players/access";
import { createClient } from "@/lib/supabase/server";

export default async function AttendanceMatchSquadPage({
  params,
}: {
  params: Promise<{ matchId: string }>;
}) {
  const { matchId } = await params;
  const { access } = await getDashboardContext();
  requireAttendanceReadAccess(access);

  const supabase = await createClient();
  const { data: match } = await supabase
    .from("matches")
    .select("id, home_team_name, away_team_name, match_date")
    .eq("id", matchId)
    .eq("club_id", access.clubId)
    .maybeSingle();
  if (!match) notFound();

  const [rows, managedPlayerIds] = await Promise.all([
    getMatchSquadCalls(matchId, access.clubId),
    resolveOwnPlayerIds(access),
  ]);

  return (
    <div className="space-y-4">
      <div>
        <h2 className="text-lg font-semibold">
          {match.home_team_name} – {match.away_team_name}
        </h2>
        <p className="text-sm text-muted-foreground">Match Squad · {match.match_date}</p>
      </div>
      <MatchSquadPanel
        matchId={matchId}
        rows={rows}
        canManage={canManageMatchSquad(access.roles)}
        managedPlayerIds={managedPlayerIds}
      />
    </div>
  );
}
