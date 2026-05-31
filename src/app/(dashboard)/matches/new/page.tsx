import { redirect } from "next/navigation";

import { MatchForm } from "@/features/matches/components/match-form";
import { canManageMatches } from "@/config/permissions";
import { getClub, getDashboardContext, getTeams, requireMatchReadAccess } from "@/lib/auth/session";
import { getClubBrandingName } from "@/lib/club/names";

export default async function NewMatchPage() {
  const { access } = await getDashboardContext();
  requireMatchReadAccess(access);
  if (!canManageMatches(access.roles)) redirect("/matches");

  const [teams, club] = await Promise.all([getTeams(), getClub()]);

  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nowy mecz</h1>
        <p className="text-sm text-muted-foreground">Zaplanuj mecz ligowy lub towarzyski.</p>
      </div>
      <MatchForm teams={teams} ownTeamName={club ? getClubBrandingName(club) : "Klub"} mode="create" />
    </div>
  );
}
