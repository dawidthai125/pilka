import { canReadAcademy, canReadOwnDevelopment } from "@/config/permissions";
import { createClient } from "@/lib/supabase/server";
import type { UserAccessContext } from "@/types/rbac";
import type { ClubRole } from "@/types/rbac";

const CLUB_WIDE_PLAYER_ROLES: ClubRole[] = [
  "owner",
  "president",
  "sports_director",
  "coach",
];

export function canReadPlayersClubWide(roles: ClubRole[]): boolean {
  return roles.some((role) => CLUB_WIDE_PLAYER_ROLES.includes(role));
}

export async function resolveOwnPlayerIds(access: UserAccessContext): Promise<string[]> {
  if (!canReadOwnDevelopment(access.roles)) return [];

  const supabase = await createClient();
  const ids: string[] = [];

  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", access.userId)
    .maybeSingle();

  if (profile?.email) {
    const { data: ownPlayer } = await supabase
      .from("players")
      .select("id")
      .eq("club_id", access.clubId)
      .ilike("email", profile.email)
      .maybeSingle();
    if (ownPlayer?.id) ids.push(String(ownPlayer.id));
  }

  const { data: guardians } = await supabase
    .from("player_guardians")
    .select("player_id")
    .eq("club_id", access.clubId)
    .eq("profile_id", access.userId);
  for (const g of guardians ?? []) ids.push(String(g.player_id));

  return [...new Set(ids)];
}

export function canAccessPlayerRow(
  access: UserAccessContext,
  playerId: string,
  ownPlayerIds: string[],
): boolean {
  if (canReadPlayersClubWide(access.roles)) return true;
  if (canReadOwnDevelopment(access.roles)) return ownPlayerIds.includes(playerId);
  return false;
}

/** @deprecated use canAccessPlayerRow — alias for academy module */
export function canAccessPlayerDevelopment(
  access: UserAccessContext,
  playerId: string,
  ownPlayerIds: string[],
): boolean {
  if (canReadAcademy(access.roles)) return true;
  return canAccessPlayerRow(access, playerId, ownPlayerIds);
}
