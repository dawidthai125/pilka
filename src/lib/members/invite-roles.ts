import type { ClubRole } from "@/types/rbac";

/** Roles that club leadership can assign via invite (owner excluded). */
export const INVITABLE_CLUB_ROLES: ClubRole[] = [
  "president",
  "sports_director",
  "coach",
  "treasurer",
  "scout",
  "website_admin",
  "parent",
  "player",
  "sponsor",
];

export function isInvitableClubRole(role: ClubRole): boolean {
  return INVITABLE_CLUB_ROLES.includes(role);
}
