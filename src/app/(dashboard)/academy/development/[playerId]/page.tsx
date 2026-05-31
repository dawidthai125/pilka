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

  let teamAverage: number | undefined;
  if (player.teamId) {
    const { data } = await supabase.rpc("team_development_average", {
      p_club_id: access.clubId,
      p_team_id: player.teamId,
    });
    if (data != null) teamAverage = Number(data);
  }

  return (
    <PlayerDevelopmentPanel
      player={player}
      detail={detail}
      canManage={canManageAcademy(access.roles)}
      teamAverage={teamAverage}
    />
  );
}
