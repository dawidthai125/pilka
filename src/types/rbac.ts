export const CLUB_ROLES = [
  "owner",
  "president",
  "sports_director",
  "treasurer",
  "coach",
  "player",
  "parent",
  "sponsor",
] as const;

export type ClubRole = (typeof CLUB_ROLES)[number];

export const MEMBERSHIP_STATUSES = [
  "active",
  "invited",
  "suspended",
  "archived",
] as const;

export type MembershipStatus = (typeof MEMBERSHIP_STATUSES)[number];

export const TEAM_CATEGORIES = [
  "seniors",
  "u18",
  "u12",
  "u10",
  "other",
] as const;

export type TeamCategory = (typeof TEAM_CATEGORIES)[number];

export const PERMISSIONS = [
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
] as const;

export type Permission = (typeof PERMISSIONS)[number];

export type ClubMembership = {
  id: string;
  clubId: string;
  userId: string;
  role: ClubRole;
  status: MembershipStatus;
  teamId: string | null;
};

export type UserAccessContext = {
  userId: string;
  clubId: string;
  roles: ClubRole[];
  permissions: Permission[];
};

export type Profile = {
  id: string;
  email: string;
  fullName: string | null;
  avatarUrl: string | null;
  phone: string | null;
  locale: string;
};

export type Club = {
  id: string;
  slug: string;
  /** Nazwa publiczna — branding w UI (np. Piorun Wawrzeńczyce). */
  publicName: string;
  /** Nazwa oficjalna — licencja / dokumenty (np. GLKS Mietków; w przyszłości może = publicName). */
  officialName: string;
  association: string | null;
  competitionLevel: string | null;
  country: string;
  voivodeship: string | null;
  status: string;
};

export type Team = {
  id: string;
  clubId: string;
  name: string;
  category: TeamCategory;
  season: string | null;
  isActive: boolean;
};
