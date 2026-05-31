import { z } from "zod";

import { CLUB_ROLES, TEAM_CATEGORIES } from "@/types/rbac";

export const clubRoleSchema = z.enum(CLUB_ROLES);
export const teamCategorySchema = z.enum(TEAM_CATEGORIES);

export function parseClubRole(value: string) {
  return clubRoleSchema.safeParse(value);
}

export function parseTeamCategory(value: string) {
  return teamCategorySchema.safeParse(value);
}

export function safeRedirectPath(next: string | null, fallback = "/dashboard"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return fallback;
  }

  return next;
}
