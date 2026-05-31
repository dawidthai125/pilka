import type { ClubRole, Permission } from "@/types/rbac";
import { CLUB_ROLES } from "@/types/rbac";

export { CLUB_ROLES };

export const ROLE_LABELS: Record<ClubRole, string> = {
  owner: "Właściciel",
  president: "Prezes",
  sports_director: "Dyrektor Sportowy",
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
];

const playerReadOnly: Permission[] = [
  "club:read",
  "team:read",
  "profile:read",
  "profile:manage",
  "player:read",
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
];

export const ROLE_PERMISSIONS: Record<ClubRole, readonly Permission[]> = {
  owner: leadership,
  president: leadership,
  sports_director: leadership,
  coach: coachingStaff,
  player: playerReadOnly,
  parent: playerReadOnly,
  sponsor: ["club:read", "team:read", "profile:read"],
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
