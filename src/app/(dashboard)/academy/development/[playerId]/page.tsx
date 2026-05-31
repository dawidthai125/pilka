import { notFound } from "next/navigation";

import { PlayerDevelopmentPanel } from "@/features/academy/components/academy-panels";
import { canManageAcademy } from "@/config/permissions";
import {
  canAccessPlayerDevelopment,
  getPlayerDevelopmentDetail,
  requireAcademyReadAccess,
  resolveOwnPlayerIds,
} from "@/lib/academy/loaders";
import { getDashboardContext, getPlayer } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export default async function PlayerDevelopmentPage({
  params,
}: {
  params: Promise<{ playerId: string }>;
}) {
  const { playerId } = await params;
  const { access } = await getDashboardContext();
  requireAcademyReadAccess(access);

  const ownIds = await resolveOwnPlayerIds(access);
  if (!canAccessPlayerDevelopment(access, playerId, ownIds)) notFound();

  const [player, detail] = await Promise.all([
    getPlayer(playerId, access.clubId),
    getPlayerDevelopmentDetail(playerId, access.clubId),
  ]);
  if (!player || !detail) notFound();

  const supabase = await createClient();
  let teamRows: Array<{ overall_rating: number }> = [];
  if (player.teamId) {
    const { data: teamPlayers } = await supabase
      .from("players")
      .select("id")
      .eq("club_id", access.clubId)
      .eq("team_id", player.teamId);
    const playerIds = (teamPlayers ?? []).map((r) => r.id);
    if (playerIds.length) {
      const { data } = await supabase
        .from("player_development")
        .select("overall_rating")
        .eq("club_id", access.clubId)
        .in("player_id", playerIds);
      teamRows = (data ?? []) as Array<{ overall_rating: number }>;
    }
  }

  const teamAverage =
    teamRows.length
      ? Math.round(teamRows.reduce((s, r) => s + Number(r.overall_rating), 0) / teamRows.length)
      : undefined;

  return (
    <PlayerDevelopmentPanel
      player={player}
      detail={detail}
      canManage={canManageAcademy(access.roles)}
      teamAverage={teamAverage}
    />
  );
}
