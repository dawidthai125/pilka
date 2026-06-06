import { canManageMembers } from "@/config/permissions";
import type { ClubRole } from "@/types/rbac";

export function canManageMemberTarget(
  actorRoles: ClubRole[],
  targetRole: ClubRole,
): boolean {
  if (!canManageMembers(actorRoles)) {
    return false;
  }

  if (targetRole === "owner" && !actorRoles.includes("owner")) {
    return false;
  }

  return true;
}

export function canAssignClubRole(
  actorRoles: ClubRole[],
  newRole: ClubRole,
): boolean {
  if (!canManageMembers(actorRoles)) {
    return false;
  }

  if (actorRoles.includes("owner")) {
    return true;
  }

  return newRole !== "owner";
}
