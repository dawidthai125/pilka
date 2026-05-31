import Link from "next/link";
import { notFound } from "next/navigation";

import { MatchDetailView } from "@/features/matches/components/match-detail-view";
import { MatchForm } from "@/features/matches/components/match-form";
import { TeamFormStatsPanel } from "@/features/matches/components/team-form-stats-panel";
import { canManageMatches } from "@/config/permissions";
import {
  getClub,
  getDashboardContext,
  getMatchDetail,
  getPlayerFormStats,
  getTeamMatchStats,
  getTeams,
  getPlayers,
  requireMatchReadAccess,
} from "@/lib/auth/session";
import { getClubBrandingName } from "@/lib/club/names";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function MatchDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ edit?: string }>;
}) {
  const { id } = await params;
  const { edit } = await searchParams;
  const { access } = await getDashboardContext();
  requireMatchReadAccess(access);

  const data = await getMatchDetail(id);
  if (!data) notFound();

  const canManage = canManageMatches(access.roles);
  if (edit === "1" && canManage) {
    const [teams, club] = await Promise.all([getTeams(), getClub()]);
    return (
      <div className="mx-auto max-w-3xl space-y-6">
        <MatchForm teams={teams} match={data.match} ownTeamName={club ? getClubBrandingName(club) : "Klub"} mode="edit" />
      </div>
    );
  }

  const [teamStats, playerForm, teamPlayers] = await Promise.all([
    getTeamMatchStats(data.match.teamId, data.match.season),
    getPlayerFormStats(undefined, data.match.teamId),
    getPlayers(),
  ]);

  const roster = teamPlayers
    .filter((p) => p.teamId === data.match.teamId)
    .map((p) => ({ id: p.id, firstName: p.firstName, lastName: p.lastName }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap justify-end gap-2">
        <Link href={`/matches/${id}/report`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
          Raport meczowy
        </Link>
        {canManage ? (
          <Link href={`/matches/${id}?edit=1`} className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
            Edytuj
          </Link>
        ) : null}
      </div>
      <TeamFormStatsPanel teamStats={teamStats} playerForm={playerForm} />
      <MatchDetailView data={data} roster={roster} canManage={canManage} />
    </div>
  );
}
