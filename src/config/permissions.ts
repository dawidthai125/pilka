import type { ClubRole, Permission } from "@/types/rbac";
import type { AiReportCategory } from "@/types/ai";
import { CLUB_ROLES } from "@/types/rbac";

export { CLUB_ROLES };

export const ROLE_LABELS: Record<ClubRole, string> = {
  owner: "Właściciel",
  president: "Prezes",
  sports_director: "Dyrektor Sportowy",
  treasurer: "Skarbnik",
  coach: "Trener",
  player: "Zawodnik",
  parent: "Rodzic",
  sponsor: "Sponsor",
};

const leadership: Permission[] = [
  "club:read",
  "club:manage",
  "team:read",
  "team:manage",
  "member:read",
  "member:manage",
  "member:invite",
  "profile:read",
  "profile:manage",
  "settings:read",
  "settings:manage",
  "player:read",
  "player:manage",
  "player:notes",
  "training:read",
  "training:manage",
  "training:attendance",
  "training:availability",
  "match:read",
  "match:manage",
  "match:squad",
  "match:events",
  "ai:read",
  "ai:chat",
  "ai:reports",
  "ai:manage",
  "ai:publish",
  "sponsor:read",
  "sponsor:manage",
  "finance:read",
  "finance:manage",
  "inventory:read",
  "inventory:manage",
];

const parentPortal: Permission[] = [
  "club:read",
  "team:read",
  "profile:read",
  "profile:manage",
  "player:read",
  "training:read",
  "training:availability",
  "match:read",
  "finance:portal",
];

const coachingStaff: Permission[] = [
  "club:read",
  "team:read",
  "team:manage",
  "member:read",
  "profile:read",
  "settings:read",
  "player:read",
  "player:manage",
  "player:notes",
  "training:read",
  "training:manage",
  "training:attendance",
  "training:availability",
  "match:read",
  "match:manage",
  "match:squad",
  "match:events",
  "ai:read",
  "ai:chat",
  "ai:reports_sports",
  "ai:publish",
  "inventory:read",
];

export const ROLE_PERMISSIONS: Record<ClubRole, readonly Permission[]> = {
  owner: [...leadership, "sponsor:read", "sponsor:manage"],
  president: [...leadership, "sponsor:read", "sponsor:manage"],
  sports_director: [...leadership, "sponsor:read"],
  treasurer: [
    "club:read",
    "team:read",
    "member:read",
    "profile:read",
    "profile:manage",
    "settings:read",
    "player:read",
    "sponsor:read",
    "finance:read",
    "finance:manage",
    "ai:read",
    "ai:chat",
    "ai:reports",
  ],
  coach: coachingStaff,
  player: [...parentPortal.filter((p) => p !== "finance:portal"), "inventory:portal"],
  parent: parentPortal,
  sponsor: ["club:read", "team:read", "match:read", "profile:read", "sponsor:portal"],
};

export const ALL_PERMISSIONS = [
  "club:read",
  "club:manage",
  "team:read",
  "team:manage",
  "member:read",
  "member:manage",
  "member:invite",
  "profile:read",
  "profile:manage",
  "settings:read",
  "settings:manage",
  "player:read",
  "player:manage",
  "player:notes",
  "training:read",
  "training:manage",
  "training:attendance",
  "training:availability",
  "match:read",
  "match:manage",
  "match:squad",
  "match:events",
  "ai:read",
  "ai:chat",
  "ai:reports",
  "ai:reports_sports",
  "ai:manage",
  "ai:publish",
  "sponsor:read",
  "sponsor:manage",
  "sponsor:portal",
  "finance:read",
  "finance:manage",
  "finance:portal",
  "inventory:read",
  "inventory:manage",
  "inventory:portal",
] as const satisfies readonly Permission[];

export const LEADERSHIP_ROLES: ClubRole[] = ["owner", "president", "sports_director"];

export function canManageMembers(roles: ClubRole[]): boolean {
  return roles.some((role) => LEADERSHIP_ROLES.includes(role));
}

export function canManageTeams(roles: ClubRole[]): boolean {
  return roles.some((role) =>
    (["owner", "president", "sports_director", "coach"] as ClubRole[]).includes(role),
  );
}

export function canManageClub(roles: ClubRole[]): boolean {
  return roles.some((role) => LEADERSHIP_ROLES.includes(role));
}

export function canReadPlayers(roles: ClubRole[]): boolean {
  return roles.some((role) =>
    (
      ["owner", "president", "sports_director", "coach", "player", "parent"] as ClubRole[]
    ).includes(role),
  );
}

export function canManagePlayers(roles: ClubRole[]): boolean {
  return roles.some((role) =>
    (["owner", "president", "sports_director", "coach"] as ClubRole[]).includes(role),
  );
}

export function canAccessCoachNotes(roles: ClubRole[]): boolean {
  return roles.some((role) =>
    (["owner", "president", "sports_director", "coach"] as ClubRole[]).includes(role),
  );
}

export function canReadTrainings(roles: ClubRole[]): boolean {
  return roles.some((role) =>
    (
      ["owner", "president", "sports_director", "coach", "player", "parent"] as ClubRole[]
    ).includes(role),
  );
}

export function canManageTrainings(roles: ClubRole[]): boolean {
  return roles.some((role) =>
    (["owner", "president", "sports_director", "coach"] as ClubRole[]).includes(role),
  );
}

export function canMarkTrainingAttendance(roles: ClubRole[]): boolean {
  return canManageTrainings(roles);
}

export function canSetTrainingAvailability(roles: ClubRole[]): boolean {
  return canReadTrainings(roles);
}

export function canReadMatches(roles: ClubRole[]): boolean {
  return roles.some((role) =>
    (
      ["owner", "president", "sports_director", "coach", "player", "parent"] as ClubRole[]
    ).includes(role),
  );
}

export function canManageMatches(roles: ClubRole[]): boolean {
  return roles.some((role) =>
    (["owner", "president", "sports_director", "coach"] as ClubRole[]).includes(role),
  );
}

export function canManageMatchSquad(roles: ClubRole[]): boolean {
  return canManageMatches(roles);
}

export function canManageMatchEvents(roles: ClubRole[]): boolean {
  return canManageMatches(roles);
}

const AI_ACCESS_ROLES: ClubRole[] = ["owner", "president", "sports_director", "coach"];

export function canReadAi(roles: ClubRole[]): boolean {
  return roles.some((role) => AI_ACCESS_ROLES.includes(role));
}

export function canUseAiChat(roles: ClubRole[]): boolean {
  return canReadAi(roles);
}

export function canManageAiReports(roles: ClubRole[]): boolean {
  return roles.some((role) =>
    ([...LEADERSHIP_ROLES, "treasurer"] as ClubRole[]).includes(role),
  );
}

export function canManageSportsAiReports(roles: ClubRole[]): boolean {
  return roles.some((role) =>
    (["owner", "president", "sports_director", "coach"] as ClubRole[]).includes(role),
  );
}

export function canManageAi(roles: ClubRole[]): boolean {
  return roles.some((role) => LEADERSHIP_ROLES.includes(role));
}

export function canPublishAiReports(roles: ClubRole[]): boolean {
  return canManageSportsAiReports(roles);
}

export function canAccessAiReportCategory(
  roles: ClubRole[],
  category: AiReportCategory,
): boolean {
  if (canManageAiReports(roles)) return true;
  if (category === "sponsors" || category === "finance") return canManageAiReports(roles) || roles.includes("treasurer");
  if (category === "inventory") return canManageInventory(roles) || roles.includes("sports_director");
  if (canManageSportsAiReports(roles)) {
    return (["matches", "trainings", "players"] as AiReportCategory[]).includes(category);
  }
  return false;
}

export function canReadSponsors(roles: ClubRole[]): boolean {
  return roles.some((role) =>
    (["owner", "president", "sports_director"] as ClubRole[]).includes(role),
  );
}

export function canManageSponsors(roles: ClubRole[]): boolean {
  return roles.some((role) => (["owner", "president"] as ClubRole[]).includes(role));
}

export function canAccessSponsorPortal(roles: ClubRole[]): boolean {
  return roles.includes("sponsor");
}

export function canReadFinance(roles: ClubRole[]): boolean {
  return roles.some((role) =>
    (["owner", "president", "treasurer", "sports_director"] as ClubRole[]).includes(role),
  );
}

export function canManageFinance(roles: ClubRole[]): boolean {
  return roles.some((role) =>
    (["owner", "president", "treasurer"] as ClubRole[]).includes(role),
  );
}

export function canAccessFinancePortal(roles: ClubRole[]): boolean {
  return roles.includes("parent");
}

export function canReadInventory(roles: ClubRole[]): boolean {
  return roles.some((role) =>
    (["owner", "president", "sports_director", "coach"] as ClubRole[]).includes(role),
  );
}

export function canManageInventory(roles: ClubRole[]): boolean {
  return roles.some((role) =>
    (["owner", "president", "sports_director"] as ClubRole[]).includes(role),
  );
}

export function canIssueInventory(roles: ClubRole[]): boolean {
  return canReadInventory(roles);
}

export function canAccessInventoryPortal(roles: ClubRole[]): boolean {
  return roles.includes("player");
}
