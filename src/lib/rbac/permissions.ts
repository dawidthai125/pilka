import { ROLE_PERMISSIONS } from "@/config/permissions";
import type { ClubRole, Permission, UserAccessContext } from "@/types/rbac";

export function getPermissionsForRoles(roles: ClubRole[]): Permission[] {
  const permissions = new Set<Permission>();

  for (const role of roles) {
    for (const permission of ROLE_PERMISSIONS[role]) {
      permissions.add(permission);
    }
  }

  return [...permissions];
}

export function hasPermission(
  context: UserAccessContext,
  permission: Permission,
): boolean {
  return context.permissions.includes(permission);
}

export function hasAnyPermission(
  context: UserAccessContext,
  permissions: Permission[],
): boolean {
  return permissions.some((permission) => hasPermission(context, permission));
}

export function hasAllPermissions(
  context: UserAccessContext,
  permissions: Permission[],
): boolean {
  return permissions.every((permission) => hasPermission(context, permission));
}

export function hasClubRole(context: UserAccessContext, role: ClubRole): boolean {
  return context.roles.includes(role);
}

export function buildAccessContext(input: {
  userId: string;
  clubId: string;
  roles: ClubRole[];
}): UserAccessContext {
  return {
    userId: input.userId,
    clubId: input.clubId,
    roles: input.roles,
    permissions: getPermissionsForRoles(input.roles),
  };
}
