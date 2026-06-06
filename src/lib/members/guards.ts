import { canManageMembers, LEADERSHIP_ROLES } from "@/config/permissions";
import type { ClubRole } from "@/types/rbac";

import { isInvitableClubRole } from "./invite-roles";

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

export function canInviteMembers(actorRoles: ClubRole[]): boolean {
  return actorRoles.some((role) => LEADERSHIP_ROLES.includes(role));
}

export function canInviteClubRole(actorRoles: ClubRole[], targetRole: ClubRole): boolean {
  if (!canInviteMembers(actorRoles)) return false;
  if (!isInvitableClubRole(targetRole)) return false;
  return canAssignClubRole(actorRoles, targetRole);
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
