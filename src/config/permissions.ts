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
  website_admin: "Administrator strony",
  scout: "Skaut",
};

const integrationRead: Permission[] = ["integration:read"];
const integrationManage: Permission[] = ["integration:manage", "integration:sync"];
const academyRead: Permission[] = ["academy:read", "scouting:read"];
const academyManage: Permission[] = ["academy:manage", "scouting:manage"];
const academyOwn: Permission[] = ["academy:read_own"];
const scoutingManage: Permission[] = ["scouting:read", "scouting:manage"];
const videoManage: Permission[] = ["video:read", "video:manage", "video:share", "video:publish_news"];
const videoReadOnly: Permission[] = ["video:read"];
const contentFull: Permission[] = ["content:read", "content:create", "content:manage", "content:publish"];
const contentCreate: Permission[] = ["content:read", "content:create"];
const communicationRead: Permission[] = ["communication:read"];
const communicationCreate: Permission[] = ["communication:read", "communication:create"];
const communicationFull: Permission[] = [
  "communication:read",
  "communication:create",
  "communication:manage",
  "communication:publish",
];
const attendanceRead: Permission[] = ["attendance:read"];
const attendanceReport: Permission[] = ["attendance:read", "attendance:report"];
const crmFull: Permission[] = ["crm:read", "crm:manage"];
const crmReadOnly: Permission[] = ["crm:read"];
const crmPortal: Permission[] = ["crm:portal"];
const leagueRead: Permission[] = ["league:read"];
const leagueManage: Permission[] = ["league:manage", "league:sync"];

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
  ...integrationRead,
  ...leagueRead,
  ...communicationFull,
  ...attendanceReport,
  ...crmFull,
  ...academyRead,
];

const leadershipFull: Permission[] = [...leadership, ...academyManage];

const websiteFull: Permission[] = [
  "website:read",
  "website:manage",
  "website:create",
  "website:publish",
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
  "website:read",
  "website:create",
  "integration:read",
  ...leagueRead,
  ...communicationCreate,
  ...attendanceReport,
  ...academyRead,
  ...academyManage,
];

const websiteStaff: Permission[] = [
  "club:read",
  "profile:read",
  "profile:manage",
  "settings:read",
  "website:read",
  "website:manage",
  "website:create",
  "website:publish",
  "ai:read",
];

export const ROLE_PERMISSIONS: Record<ClubRole, readonly Permission[]> = {
  owner: [...leadershipFull, ...integrationManage, ...leagueManage, ...websiteFull, ...contentFull, ...communicationFull, "sponsor:read", "sponsor:manage", ...videoManage, ...crmFull],
  president: [...leadership, ...leagueManage, ...websiteFull, ...contentFull, ...communicationFull, "sponsor:read", "sponsor:manage", ...videoReadOnly, ...crmFull],
  sports_director: [...leadershipFull, ...integrationManage, ...leagueManage, ...communicationFull, "sponsor:read", ...crmFull],
  treasurer: [
    "club:read",
    "team:read",
    "member:read",
    "profile:read",
    "profile:manage",
    "settings:read",
    "sponsor:read",
    "finance:read",
    "finance:manage",
    "ai:read",
    "ai:chat",
    "ai:reports",
    ...communicationRead,
    ...crmFull,
  ],
  coach: [...coachingStaff, ...videoManage, ...contentCreate, ...communicationCreate, ...crmReadOnly],
  scout: [...scoutingManage, "club:read", "team:read", "profile:read", "ai:read", "ai:chat", "ai:reports_sports", "video:read", "video:manage", "video:share"],
  player: [...parentPortal.filter((p) => p !== "finance:portal"), "inventory:portal", ...academyOwn, ...leagueRead, ...communicationRead, ...attendanceRead],
  parent: [...parentPortal, ...academyOwn, ...communicationRead, ...attendanceRead, ...crmPortal],
  sponsor: ["club:read", "team:read", "match:read", "profile:read", "sponsor:portal", "content:read", ...communicationRead],
  website_admin: [...websiteStaff, ...contentFull],
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
  "website:read",
  "website:manage",
  "website:create",
  "website:publish",
  "integration:read",
  "integration:manage",
  "integration:sync",
  "academy:read",
  "academy:manage",
  "academy:read_own",
  "scouting:read",
  "scouting:manage",
  "video:read",
  "video:manage",
  "video:share",
  "video:publish_news",
  "content:read",
  "content:create",
  "content:manage",
  "content:publish",
  "league:read",
  "league:manage",
  "league:sync",
  "communication:read",
  "communication:create",
  "communication:manage",
  "communication:publish",
  "attendance:read",
  "attendance:report",
  "crm:read",
  "crm:manage",
  "crm:portal",
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
  if (category === "website") return canManageWebsite(roles) || roles.includes("coach");
  if (category === "integrations") return canReadIntegrations(roles) || roles.includes("sports_director");
  if (category === "academy" || category === "scouting") {
    return canManageAcademy(roles) || canManageScouting(roles) || canReadAcademy(roles);
  }
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

export function canReadWebsite(roles: ClubRole[]): boolean {
  return roles.some((role) =>
    (["owner", "president", "website_admin", "coach"] as ClubRole[]).includes(role),
  );
}

export function canManageWebsite(roles: ClubRole[]): boolean {
  return roles.some((role) =>
    (["owner", "president", "website_admin"] as ClubRole[]).includes(role),
  );
}

export function canCreateWebsiteNews(roles: ClubRole[]): boolean {
  return roles.some((role) =>
    (["owner", "president", "website_admin", "coach"] as ClubRole[]).includes(role),
  );
}

export function canPublishWebsiteNews(roles: ClubRole[]): boolean {
  return canManageWebsite(roles);
}

export function canReadIntegrations(roles: ClubRole[]): boolean {
  return roles.some((role) =>
    (["owner", "president", "sports_director", "coach"] as ClubRole[]).includes(role),
  );
}

export function canManageIntegrations(roles: ClubRole[]): boolean {
  return roles.some((role) =>
    (["owner", "sports_director"] as ClubRole[]).includes(role),
  );
}

export function canSyncIntegrations(roles: ClubRole[]): boolean {
  return canManageIntegrations(roles);
}

export function canReadLeague(roles: ClubRole[]): boolean {
  return roles.some((role) =>
    (["owner", "president", "sports_director", "coach", "player"] as ClubRole[]).includes(role),
  );
}

export function canManageLeague(roles: ClubRole[]): boolean {
  return roles.some((role) =>
    (["owner", "president", "sports_director"] as ClubRole[]).includes(role),
  );
}

export function canSyncLeague(roles: ClubRole[]): boolean {
  return canManageLeague(roles);
}

export function canReadAcademy(roles: ClubRole[]): boolean {
  return roles.some((role) =>
    (["owner", "president", "sports_director", "coach"] as ClubRole[]).includes(role),
  );
}

export function canManageAcademy(roles: ClubRole[]): boolean {
  return roles.some((role) =>
    (["owner", "sports_director", "coach"] as ClubRole[]).includes(role),
  );
}

export function canReadOwnDevelopment(roles: ClubRole[]): boolean {
  return roles.some((role) => (["player", "parent"] as ClubRole[]).includes(role));
}

export function canReadScouting(roles: ClubRole[]): boolean {
  return roles.some((role) =>
    (["owner", "president", "sports_director", "coach", "scout"] as ClubRole[]).includes(role),
  );
}

export function canManageScouting(roles: ClubRole[]): boolean {
  return roles.some((role) =>
    (["owner", "sports_director", "coach", "scout"] as ClubRole[]).includes(role),
  );
}

export function canReadVideos(roles: ClubRole[]): boolean {
  return roles.some((role) =>
    (["owner", "president", "coach", "scout"] as ClubRole[]).includes(role),
  );
}

export function canManageVideos(roles: ClubRole[]): boolean {
  return roles.some((role) =>
    (["owner", "coach", "scout"] as ClubRole[]).includes(role),
  );
}

export function canShareVideos(roles: ClubRole[]): boolean {
  return canManageVideos(roles);
}

export function canPublishVideoNews(roles: ClubRole[]): boolean {
  return roles.some((role) =>
    (["owner", "coach"] as ClubRole[]).includes(role),
  );
}

export function canReadContent(roles: ClubRole[]): boolean {
  return roles.some((role) =>
    (["owner", "president", "website_admin", "coach", "sponsor"] as ClubRole[]).includes(role),
  );
}

export function canCreateContent(roles: ClubRole[]): boolean {
  return roles.some((role) =>
    (["owner", "president", "website_admin", "coach"] as ClubRole[]).includes(role),
  );
}

export function canManageContent(roles: ClubRole[]): boolean {
  return roles.some((role) =>
    (["owner", "president", "website_admin"] as ClubRole[]).includes(role),
  );
}

export function canPublishContent(roles: ClubRole[]): boolean {
  return canManageContent(roles);
}

export function canReadCommunication(roles: ClubRole[]): boolean {
  return roles.some((role) =>
    (
      [
        "owner",
        "president",
        "sports_director",
        "treasurer",
        "coach",
        "player",
        "parent",
        "sponsor",
      ] as ClubRole[]
    ).includes(role),
  );
}

export function canCreateCommunication(roles: ClubRole[]): boolean {
  return roles.some((role) =>
    (["owner", "president", "sports_director", "coach"] as ClubRole[]).includes(role),
  );
}

export function canManageCommunication(roles: ClubRole[]): boolean {
  return roles.some((role) =>
    (["owner", "president", "sports_director"] as ClubRole[]).includes(role),
  );
}

export function canPublishCommunication(roles: ClubRole[]): boolean {
  return roles.some((role) => (["owner", "president"] as ClubRole[]).includes(role));
}

export function canReadAttendance(roles: ClubRole[]): boolean {
  return roles.some((role) =>
    (
      ["owner", "president", "sports_director", "coach", "player", "parent"] as ClubRole[]
    ).includes(role),
  );
}

export function canViewAttendanceReports(roles: ClubRole[]): boolean {
  return roles.some((role) =>
    (["owner", "president", "sports_director", "coach"] as ClubRole[]).includes(role),
  );
}

export function canReadCrm(roles: ClubRole[]): boolean {
  return roles.some((role) =>
    (
      ["owner", "president", "sports_director", "treasurer", "coach"] as ClubRole[]
    ).includes(role),
  );
}

export function canManageCrm(roles: ClubRole[]): boolean {
  return roles.some((role) =>
    (["owner", "president", "sports_director", "treasurer"] as ClubRole[]).includes(role),
  );
}

export function canAccessCrmPortal(roles: ClubRole[]): boolean {
  return roles.some((role) => (["parent"] as ClubRole[]).includes(role));
}
