import { canManageMemberTarget } from "@/lib/members/guards";
import type { ClubMemberRow } from "@/lib/auth/session";
import type { ClubRole } from "@/types/rbac";

export const OWNER_BULK_EXCLUSION_MESSAGE =
  "Właściciel klubu jest wykluczony z operacji zbiorczych.";

export function isExcludedFromBulkMemberMutation(targetRole: ClubRole): boolean {
  return targetRole === "owner";
}

/** @deprecated Use isExcludedFromBulkMemberMutation */
export function isExcludedFromBulkMemberStatusChange(targetRole: ClubRole): boolean {
  return isExcludedFromBulkMemberMutation(targetRole);
}

export function isEligibleForBulkSuspend(
  member: ClubMemberRow,
  actorRoles: ClubRole[],
): boolean {
  return (
    !isExcludedFromBulkMemberMutation(member.role) &&
    canManageMemberTarget(actorRoles, member.role) &&
    member.status === "active"
  );
}

export function isEligibleForBulkReactivate(
  member: ClubMemberRow,
  actorRoles: ClubRole[],
): boolean {
  return (
    !isExcludedFromBulkMemberMutation(member.role) &&
    canManageMemberTarget(actorRoles, member.role) &&
    member.status === "suspended"
  );
}

export function isEligibleForBulkRoleChange(
  member: ClubMemberRow,
  actorRoles: ClubRole[],
): boolean {
  return (
    !isExcludedFromBulkMemberMutation(member.role) &&
    canManageMemberTarget(actorRoles, member.role)
  );
}

export function countEligibleForBulkSuspend(
  members: ClubMemberRow[],
  actorRoles: ClubRole[],
): number {
  return members.filter((m) => isEligibleForBulkSuspend(m, actorRoles)).length;
}

export function countEligibleForBulkReactivate(
  members: ClubMemberRow[],
  actorRoles: ClubRole[],
): number {
  return members.filter((m) => isEligibleForBulkReactivate(m, actorRoles)).length;
}

export function countOwnersInSelection(members: ClubMemberRow[]): number {
  return members.filter((m) => m.role === "owner").length;
}

export function getBulkSuspendTargetIds(
  members: ClubMemberRow[],
  actorRoles: ClubRole[],
): string[] {
  return members
    .filter((m) => isEligibleForBulkSuspend(m, actorRoles))
    .map((m) => m.id);
}

export function getBulkReactivateTargetIds(
  members: ClubMemberRow[],
  actorRoles: ClubRole[],
): string[] {
  return members
    .filter((m) => isEligibleForBulkReactivate(m, actorRoles))
    .map((m) => m.id);
}

export function countEligibleForBulkRoleChange(
  members: ClubMemberRow[],
  actorRoles: ClubRole[],
): number {
  return members.filter((m) => isEligibleForBulkRoleChange(m, actorRoles)).length;
}

export function getBulkRoleChangeTargetIds(
  members: ClubMemberRow[],
  actorRoles: ClubRole[],
): string[] {
  return members
    .filter((m) => isEligibleForBulkRoleChange(m, actorRoles))
    .map((m) => m.id);
}
