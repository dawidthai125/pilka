import { cache } from "react";
import { unstable_cache } from "next/cache";
import { redirect } from "next/navigation";

import { ROLE_LABELS } from "@/config/permissions";
import { buildAccessContext } from "@/lib/rbac/permissions";
import { hasPermission } from "@/lib/rbac/permissions";
import { parseClubRole } from "@/lib/validators";
import { createClient, getUser } from "@/lib/supabase/server";
import { siteConfig } from "@/config/site";
import type { Club, ClubRole, Profile, Team, UserAccessContext } from "@/types/rbac";
import type { Database } from "@/types/database";
import type { DocumentAlert, Player, PlayerCoachNote, PlayerDocument, PlayerClubHistory, PlayerInjury, PlayerStats } from "@/types/players";
import type {
  AttendanceScope,
  CalendarView,
  ClubNotification,
  CoachDashboardData,
  PlayerAttendanceStats,
  Training,
} from "@/types/trainings";
import type {
  LeagueTableEntry,
  Match,
  MatchCalendarView,
  MatchDetailData,
  MatchFilters,
  MatchPlayerStats,
  PlayerFormStats,
  TeamFormStats,
  TeamMatchStats,
} from "@/types/matches";
import { getDocumentAlertLevel, sortDocumentAlerts } from "@/lib/players/documents";
import {
  mapCoachNote,
  mapPlayer,
  mapPlayerListEntry,
  mapPlayerDocument,
  mapPlayerHistory,
  mapPlayerInjury,
  mapPlayerStats,
  playerFullName,
} from "@/lib/players/mappers";
import {
  computePlayerStats,
  getScopeDateFrom,
  mapAttendance,
  mapAvailability,
  mapClubNotification,
  mapSessionNote,
  mapTraining,
} from "@/lib/training/mappers";
import {
  buildReminderCopy,
  isNotificationDue,
  reminderScheduledAt,
} from "@/lib/training/notifications";
import { getCalendarRange, parseLocalDate } from "@/lib/training/calendar";
import { getMatchCalendarRange } from "@/lib/matches/calendar";
import {
  aggregateTeamStats,
  computeTeamForm,
  mapLeagueEntry,
  mapLineupPosition,
  mapMatch,
  mapMatchEvent,
  mapSquadEntry,
} from "@/lib/matches/mappers";
import { DEFAULT_COMPETITION, DEFAULT_SEASON } from "@/lib/matches/constants";
import { getClubBrandingName } from "@/lib/club/names";
import { TRAINING_REMINDER_TYPES } from "@/types/trainings";
import type {
  AiConversation,
  AiConversationDetail,
  AiReport,
  AiReportCategory,
  AiReportCategoryRow,
  AiSuggestion,
} from "@/types/ai";
import {
  mapAiConversation,
  mapAiMessage,
  mapAiReport,
  mapAiReportCategory,
  mapAiSuggestion,
} from "@/lib/ai/mappers";
import { canManageSponsors, canManageTrainings, canReadAi, canReadFinance, canReadInventory, canReadSponsors, canReadVideos, canReadContent, canReadCommunication, canReadAttendance, canReadCrm, canManageCrm, canAccessCrmPortal, canAccessFinancePortal, canAccessInventoryPortal, canReadWebsite, canManageWebsite, canReadIntegrations, canManageIntegrations, canReadLeague, canManageLeague } from "@/config/permissions";
import { resolveOwnPlayerIds } from "@/lib/players/access";
import { sanitizeIlikeTerm } from "@/lib/ai/sanitize";
import type {
  Sponsor,
  SponsorDashboardStats,
  SponsorDetailData,
  SponsorLead,
  SponsorPortalData,
  SponsorPublication,
} from "@/types/sponsors";
import type {
  FinanceBudget,
  FinanceDashboardStats,
  FinanceDocument,
  FinanceExpense,
  FinanceFeePlan,
  FinanceGrant,
  FinanceIncome,
  FinancePlayerFee,
  FinanceReport,
  ParentFinancePortalData,
} from "@/types/finance";
import type {
  InventoryCategory,
  InventoryDamage,
  InventoryDashboardStats,
  InventoryItem,
  InventoryPlayerKit,
  InventoryPurchaseOrder,
  InventoryReport,
  InventoryReturn,
  InventoryStocktake,
  InventorySupplier,
  InventoryTransaction,
  PlayerInventoryPortalData,
} from "@/types/inventory";
import type {
  WebsiteGalleryAlbum,
  WebsiteNews,
  WebsiteSettings,
  WebsiteSocialIntegration,
} from "@/types/website";
import type {
  ExternalTeam,
  Integration,
  IntegrationClubMapping,
  IntegrationDashboardStats,
  IntegrationImport,
  IntegrationProvider,
  IntegrationSource,
  SyncConflict,
  SyncLog,
} from "@/types/integrations";
import {
  mapFinanceBudget,
  mapFinanceDocument,
  mapFinanceExpense,
  mapFinanceFeePayment,
  mapFinanceFeePlan,
  mapFinanceGrant,
  mapFinanceIncome,
  mapFinancePlayerFee,
  mapFinanceReport,
} from "@/lib/finance/mappers";
import { computeBudgetExecutionsBatch } from "@/lib/finance/insights";
import {
  mapInventoryCategory,
  mapInventoryDamage,
  mapInventoryItem,
  mapInventoryKitAssignment,
  mapInventoryPlayerKit,
  mapInventoryPurchaseOrder,
  mapInventoryReport,
  mapInventoryReturn,
  mapInventoryStocktake,
  mapInventorySupplier,
  mapInventoryTransaction,
} from "@/lib/inventory/mappers";
import {
  mapWebsiteGalleryAlbum,
  mapWebsiteNews,
  mapWebsiteSettings,
  mapWebsiteSocialIntegration,
} from "@/lib/website/mappers";
import {
  mapExternalTeam,
  mapIntegration,
  mapIntegrationClubMapping,
  mapIntegrationImport,
  mapIntegrationSource,
  mapSyncConflict,
  mapSyncLog,
} from "@/lib/integrations/mappers";
import { buildInventoryAlerts } from "@/lib/inventory/insights";
import {
  mapSponsor,
  mapSponsorContract,
  mapSponsorContractAttachment,
  mapSponsorExposure,
  mapSponsorFinancialEntry,
  mapSponsorLead,
  mapSponsorNote,
  mapSponsorPublication,
  mapSponsorReport,
} from "@/lib/sponsors/mappers";
import {
  SPONSOR_CONTRACT_REMINDER_DAYS,
  buildContractReminderCopy,
  isContractReminderDue,
} from "@/lib/sponsors/notifications";

export const DEFAULT_CLUB_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

export type ClubMemberRow = {
  id: string;
  role: ClubRole;
  status: string;
  team_id: string | null;
  user_id: string;
  profile: { id: string; email: string; full_name: string | null } | null;
  team: { id: string; name: string } | null;
};

export const requireUser = cache(async () => {
  const user = await getUser();

  if (!user) {
    redirect("/login");
  }

  return user;
});

export const getProfile = cache(async (userId: string): Promise<Profile | null> => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, email, full_name, avatar_url, phone, locale")
    .eq("id", userId)
    .maybeSingle();

  if (!data) return null;

  return {
    id: data.id,
    email: data.email,
    fullName: data.full_name,
    avatarUrl: data.avatar_url,
    phone: data.phone,
    locale: data.locale,
  };
});

export const getUserMemberships = cache(async (userId: string) => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("club_memberships")
    .select("id, club_id, user_id, role, status, team_id")
    .eq("user_id", userId)
    .eq("status", "active");

  if (error) throw new Error(error.message);
  return data ?? [];
});

export const getAccessContext = cache(
  async (userId: string, clubId: string = DEFAULT_CLUB_ID): Promise<UserAccessContext | null> => {
    const memberships = await getUserMemberships(userId);
    const clubMemberships = memberships.filter((m) => m.club_id === clubId);

    if (clubMemberships.length === 0) return null;

    const roles: ClubRole[] = [];

    for (const membership of clubMemberships) {
      const parsed = parseClubRole(membership.role);
      if (parsed.success) {
        roles.push(parsed.data);
      }
    }

    if (roles.length === 0) return null;

    return buildAccessContext({
      userId,
      clubId,
      roles,
    });
  },
);

export async function requireAccessContext(
  clubId: string = DEFAULT_CLUB_ID,
): Promise<UserAccessContext> {
  const user = await requireUser();
  const context = await getAccessContext(user.id, clubId);

  if (!context) {
    redirect("/login?error=no_membership");
  }

  return context;
}

export const getClub = cache(async (clubId: string = DEFAULT_CLUB_ID): Promise<Club | null> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("clubs")
    .select(
      "id, slug, public_name, official_name, association, competition_level, country, voivodeship, status",
    )
    .eq("id", clubId)
    .maybeSingle();

  if (error || !data) return null;

  return {
    id: data.id,
    slug: data.slug,
    publicName: data.public_name,
    officialName: data.official_name,
    association: data.association,
    competitionLevel: data.competition_level,
    country: data.country,
    voivodeship: data.voivodeship,
    status: data.status,
  };
});

export const getTeams = cache(async (clubId: string = DEFAULT_CLUB_ID): Promise<Team[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teams")
    .select("id, club_id, name, category, season, is_active")
    .eq("club_id", clubId)
    .order("name");

  if (error) throw new Error(error.message);

  return (data ?? []).map((team) => ({
    id: team.id,
    clubId: team.club_id,
    name: team.name,
    category: team.category,
    season: team.season,
    isActive: team.is_active,
  }));
});

export const getClubMembers = cache(
  async (clubId: string = DEFAULT_CLUB_ID): Promise<ClubMemberRow[]> => {
    const supabase = await createClient();
    const { data: memberships, error } = await supabase
      .from("club_memberships")
      .select("id, role, status, team_id, user_id")
      .eq("club_id", clubId)
      .order("role");

    if (error) throw new Error(error.message);
    if (!memberships?.length) return [];

    const userIds = [...new Set(memberships.map((m) => m.user_id))];
    const teamIds = [
      ...new Set(memberships.map((m) => m.team_id).filter(Boolean)),
    ] as string[];

    const [{ data: profiles }, { data: teams }] = await Promise.all([
      supabase.from("profiles").select("id, email, full_name").in("id", userIds),
      teamIds.length
        ? supabase.from("teams").select("id, name").in("id", teamIds)
        : Promise.resolve({ data: [] as { id: string; name: string }[] }),
    ]);

    const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);
    const teamMap = new Map(teams?.map((t) => [t.id, t]) ?? []);

    return memberships.flatMap((membership) => {
      const parsedRole = parseClubRole(membership.role);
      if (!parsedRole.success) return [];

      return [
        {
          id: membership.id,
          role: parsedRole.data,
          status: membership.status,
          team_id: membership.team_id,
          user_id: membership.user_id,
          profile: profileMap.get(membership.user_id) ?? null,
          team: membership.team_id ? teamMap.get(membership.team_id) ?? null : null,
        },
      ];
    });
  },
);

export const getDashboardContext = cache(async (clubId: string = DEFAULT_CLUB_ID) => {
  const user = await requireUser();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("get_app_layout_context", { p_club_id: clubId });

  if (error || !data) {
    redirect("/login?error=no_membership");
  }

  const payload = data as {
    profile: {
      id: string;
      email: string;
      full_name: string | null;
      avatar_url: string | null;
      phone: string | null;
      locale: string | null;
    } | null;
    memberships: Array<{
      id: string;
      club_id: string;
      user_id: string;
      role: string;
      status: string;
      team_id: string | null;
    }>;
    club: {
      id: string;
      slug: string;
      public_name: string;
      official_name: string;
      association: string | null;
      competition_level: string | null;
      country: string | null;
      voivodeship: string | null;
      status: string;
    } | null;
    teams: Array<{
      id: string;
      club_id: string;
      name: string;
      category: string;
      season: string;
      is_active: boolean;
    }>;
    unread_notifications: number;
    website_settings: Record<string, unknown> | null;
  };

  if (!payload.club) {
    redirect("/login?error=no_membership");
  }

  const roles: ClubRole[] = [];
  for (const membership of payload.memberships ?? []) {
    const parsed = parseClubRole(membership.role);
    if (parsed.success) roles.push(parsed.data);
  }
  if (roles.length === 0) {
    redirect("/login?error=no_membership");
  }

  const access = buildAccessContext({
    userId: user.id,
    clubId,
    roles,
  });

  const profileRow = payload.profile;
  const profile: Profile | null = profileRow
    ? {
        id: profileRow.id,
        email: profileRow.email,
        fullName: profileRow.full_name,
        avatarUrl: profileRow.avatar_url,
        phone: profileRow.phone,
        locale: profileRow.locale ?? "pl",
      }
    : null;

  const club: Club = {
    id: payload.club.id,
    slug: payload.club.slug,
    publicName: payload.club.public_name,
    officialName: payload.club.official_name,
    association: payload.club.association,
    competitionLevel: payload.club.competition_level,
    country: payload.club.country ?? "",
    voivodeship: payload.club.voivodeship,
    status: payload.club.status,
  };

  const teams: Team[] = (payload.teams ?? []).map((team) => ({
    id: team.id,
    clubId: team.club_id,
    name: team.name,
    category: team.category as Team["category"],
    season: team.season,
    isActive: team.is_active,
  }));

  const websiteSettings = payload.website_settings
    ? mapWebsiteSettings(payload.website_settings)
    : null;

  return {
    user,
    profile,
    access,
    club,
    teams,
    siteName: siteConfig.name,
    unreadNotifications: payload.unread_notifications ?? 0,
    websiteSettings,
  };
});

export function getRoleLabels(roles: ClubRole[]): string[] {
  return roles.map((role) => ROLE_LABELS[role]);
}

export function requireMemberReadAccess(access: UserAccessContext) {
  if (!hasPermission(access, "member:read")) {
    redirect("/dashboard");
  }
}

export function requirePlayerReadAccess(access: UserAccessContext) {
  if (!hasPermission(access, "player:read")) {
    redirect("/dashboard");
  }
}

export function requireTrainingReadAccess(access: UserAccessContext) {
  if (!hasPermission(access, "training:read")) {
    redirect("/dashboard");
  }
}

export function requireMatchReadAccess(access: UserAccessContext) {
  if (!hasPermission(access, "match:read")) {
    redirect("/dashboard");
  }
}

export function requireAiReadAccess(access: UserAccessContext) {
  if (!canReadAi(access.roles)) {
    redirect("/dashboard");
  }
}

export function requireSponsorReadAccess(access: UserAccessContext) {
  if (!canReadSponsors(access.roles)) {
    redirect("/dashboard");
  }
}

export function requireVideoReadAccess(access: UserAccessContext) {
  if (!canReadVideos(access.roles)) {
    redirect("/dashboard");
  }
}

export function requireContentReadAccess(access: UserAccessContext) {
  if (!canReadContent(access.roles)) {
    redirect("/dashboard");
  }
}

export function requireCommunicationReadAccess(access: UserAccessContext) {
  if (!canReadCommunication(access.roles)) {
    redirect("/dashboard");
  }
}

export function requireAttendanceReadAccess(access: UserAccessContext) {
  if (!canReadAttendance(access.roles)) {
    redirect("/dashboard");
  }
}

export function requireCrmReadAccess(access: UserAccessContext) {
  if (!canReadCrm(access.roles) && !canAccessCrmPortal(access.roles)) {
    redirect("/dashboard");
  }
}

export function requireCrmManageAccess(access: UserAccessContext) {
  if (!canManageCrm(access.roles)) {
    redirect("/dashboard");
  }
}

export function requireCrmPortalAccess(access: UserAccessContext) {
  if (!canAccessCrmPortal(access.roles)) {
    redirect("/dashboard");
  }
}

export async function requireVideoDetailAccess(access: UserAccessContext, videoId: string) {
  if (canReadVideos(access.roles)) return;

  const supabase = await createClient();
  const { data } = await supabase
    .from("video_shares")
    .select("id")
    .eq("video_id", videoId)
    .eq("shared_with_user_id", access.userId)
    .maybeSingle();

  if (!data) {
    redirect("/dashboard");
  }
}

export function requireSponsorPortalAccess(access: UserAccessContext) {
  if (!access.roles.includes("sponsor")) {
    redirect("/dashboard");
  }
}

const MATCH_SELECT =
  "id, club_id, team_id, competition, season, round_number, match_date, match_time, home_team_name, away_team_name, stadium, stadium_address, status, home_score, away_score, formation, mvp_player_id, coach_notes, teams(name), mvp:mvp_player_id(first_name, last_name)";

const TRAINING_SELECT =
  "id, club_id, team_id, name, training_date, start_time, end_time, location, description, coach_user_id, status, teams(name), profiles:coach_user_id(full_name)";

const PLAYER_SELECT =
  "id, club_id, team_id, first_name, last_name, photo_url, date_of_birth, phone, email, address, city, postal_code, jersey_number, primary_position, secondary_position, dominant_foot, height_cm, weight_kg, status, joined_at, left_at";

const PLAYER_LIST_SELECT =
  "id, club_id, team_id, first_name, last_name, jersey_number, primary_position, dominant_foot, status";

async function loadTeamNameMap(clubId: string) {
  const teams = await getTeams(clubId);
  return new Map(teams.map((team) => [team.id, team.name]));
}

const loadTeamNameMapCached = cache(loadTeamNameMap);

function attachTeamName(player: Player, teamMap: Map<string, string>): Player {
  return {
    ...player,
    teamName: player.teamId ? teamMap.get(player.teamId) ?? null : null,
  };
}

export const getPlayersByTeam = cache(
  async (teamId: string, clubId: string = DEFAULT_CLUB_ID): Promise<Player[]> => {
    const supabase = await createClient();
    const [teamMap, playersRes] = await Promise.all([
      loadTeamNameMapCached(clubId),
      supabase
        .from("players")
        .select(PLAYER_SELECT)
        .eq("club_id", clubId)
        .eq("team_id", teamId)
        .order("last_name")
        .order("first_name"),
    ]);

    if (playersRes.error) throw new Error(playersRes.error.message);
    return (playersRes.data ?? []).map((row) =>
      attachTeamName(mapPlayer(row), teamMap),
    );
  },
);

export const getPlayers = cache(
  async (clubId: string = DEFAULT_CLUB_ID, options?: { slim?: boolean }): Promise<Player[]> => {
    const supabase = await createClient();
    const teamMap = await loadTeamNameMapCached(clubId);

    if (options?.slim) {
      const { data, error } = await supabase
        .from("players")
        .select(PLAYER_LIST_SELECT)
        .eq("club_id", clubId)
        .order("last_name")
        .order("first_name");
      if (error) throw new Error(error.message);
      return (data ?? []).map((row) => attachTeamName(mapPlayerListEntry(row), teamMap));
    }

    const { data, error } = await supabase
      .from("players")
      .select(PLAYER_SELECT)
      .eq("club_id", clubId)
      .order("last_name")
      .order("first_name");
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => attachTeamName(mapPlayer(row), teamMap));
  },
);

export const getPlayerCounts = cache(
  async (clubId: string = DEFAULT_CLUB_ID): Promise<{ total: number; active: number }> => {
    const stats = await getHomeDashboardStats(clubId);
    return stats.playerCounts;
  },
);

export const getHomeDashboardStats = cache(
  async (
    clubId: string = DEFAULT_CLUB_ID,
  ): Promise<{ playerCounts: { total: number; active: number }; documentAlerts: DocumentAlert[] }> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_home_dashboard_stats", { p_club_id: clubId });
    if (error || !data) {
      return { playerCounts: { total: 0, active: 0 }, documentAlerts: [] };
    }

    const payload = data as {
      player_counts: { total: number; active: number };
      document_alerts: Array<{
        document_id: string;
        player_id: string;
        player_name: string;
        document_title: string;
        document_type: string;
        expires_at: string;
      }>;
    };

    const alerts: DocumentAlert[] = [];
    for (const row of payload.document_alerts ?? []) {
      const alertLevel = getDocumentAlertLevel(row.expires_at);
      if (!alertLevel) continue;
      alerts.push({
        documentId: row.document_id,
        playerId: row.player_id,
        playerName: row.player_name,
        documentTitle: row.document_title,
        documentType: row.document_type as DocumentAlert["documentType"],
        expiresAt: row.expires_at,
        alertLevel,
      });
    }

    return {
      playerCounts: {
        total: payload.player_counts?.total ?? 0,
        active: payload.player_counts?.active ?? 0,
      },
      documentAlerts: sortDocumentAlerts(alerts),
    };
  },
);

export const getPlayer = cache(
  async (playerId: string, clubId: string = DEFAULT_CLUB_ID): Promise<Player | null> => {
    const supabase = await createClient();
    const [teamMap, playerRes] = await Promise.all([
      loadTeamNameMapCached(clubId),
      supabase
        .from("players")
        .select(PLAYER_SELECT)
        .eq("club_id", clubId)
        .eq("id", playerId)
        .maybeSingle(),
    ]);

    if (playerRes.error || !playerRes.data) return null;
    return attachTeamName(mapPlayer(playerRes.data), teamMap);
  },
);

export const getDocumentAlerts = cache(
  async (clubId: string = DEFAULT_CLUB_ID): Promise<DocumentAlert[]> => {
    const supabase = await createClient();
    const alertHorizon = new Date();
    alertHorizon.setDate(alertHorizon.getDate() + 30);
    const horizonDate = alertHorizon.toISOString().slice(0, 10);

    const { data: documents, error } = await supabase
      .from("player_documents")
      .select("id, player_id, document_type, title, expires_at")
      .eq("club_id", clubId)
      .not("expires_at", "is", null)
      .lte("expires_at", horizonDate);

    if (error) return [];
    if (!documents?.length) return [];

    const playerIds = [...new Set(documents.map((doc) => doc.player_id))];
    const { data: players } = await supabase
      .from("players")
      .select("id, first_name, last_name")
      .in("id", playerIds);

    const playerMap = new Map(players?.map((player) => [player.id, player]) ?? []);
    const alerts: DocumentAlert[] = [];

    for (const row of documents) {
      if (!row.expires_at) continue;
      const alertLevel = getDocumentAlertLevel(row.expires_at);
      if (!alertLevel) continue;

      const player = playerMap.get(row.player_id);
      if (!player) continue;

      alerts.push({
        documentId: row.id,
        playerId: row.player_id,
        playerName: `${player.first_name} ${player.last_name}`,
        documentTitle: row.title,
        documentType: row.document_type,
        expiresAt: row.expires_at,
        alertLevel,
      });
    }

    return sortDocumentAlerts(alerts);
  },
);

export type PlayerDetailData = {
  player: Player;
  documents: PlayerDocument[];
  stats: PlayerStats[];
  history: PlayerClubHistory[];
  injuries: PlayerInjury[];
  notes: PlayerCoachNote[];
};

export const getPlayerDetail = cache(
  async (playerId: string, clubId: string = DEFAULT_CLUB_ID): Promise<PlayerDetailData | null> => {
    const supabase = await createClient();
    const [
      teamMap,
      playerRes,
      documentsRes,
      statsRes,
      historyRes,
      injuriesRes,
      notesRes,
    ] = await Promise.all([
      loadTeamNameMapCached(clubId),
      supabase
        .from("players")
        .select(PLAYER_SELECT)
        .eq("club_id", clubId)
        .eq("id", playerId)
        .maybeSingle(),
      supabase
        .from("player_documents")
        .select(
          "id, club_id, player_id, document_type, title, storage_path, file_name, mime_type, file_size, expires_at, notes, created_at",
        )
        .eq("club_id", clubId)
        .eq("player_id", playerId)
        .order("created_at", { ascending: false }),
      supabase
        .from("player_stats")
        .select(
          "id, player_id, season, matches_played, goals, assists, yellow_cards, red_cards, minutes_played",
        )
        .eq("club_id", clubId)
        .eq("player_id", playerId)
        .order("season", { ascending: false }),
      supabase
        .from("player_club_history")
        .select(
          "id, player_id, event_type, event_date, description, previous_value, new_value, related_club_name, created_at",
        )
        .eq("club_id", clubId)
        .eq("player_id", playerId)
        .order("event_date", { ascending: false }),
      supabase
        .from("player_injuries")
        .select("id, player_id, injury_date, recovery_date, description, severity, is_active")
        .eq("club_id", clubId)
        .eq("player_id", playerId)
        .order("injury_date", { ascending: false }),
      supabase
        .from("player_coach_notes")
        .select("id, player_id, author_id, note_type, content, created_at")
        .eq("club_id", clubId)
        .eq("player_id", playerId)
        .order("created_at", { ascending: false }),
    ]);

    if (playerRes.error || !playerRes.data) return null;

    const player = attachTeamName(mapPlayer(playerRes.data), teamMap);

    if (documentsRes.error) throw new Error(documentsRes.error.message);
    if (statsRes.error) throw new Error(statsRes.error.message);
    if (historyRes.error) throw new Error(historyRes.error.message);
    if (injuriesRes.error) throw new Error(injuriesRes.error.message);
    if (notesRes.error) throw new Error(notesRes.error.message);

    const authorIds = [...new Set((notesRes.data ?? []).map((note) => note.author_id))];
    const { data: authorProfiles } = authorIds.length
      ? await supabase.from("profiles").select("id, full_name").in("id", authorIds)
      : { data: [] as { id: string; full_name: string | null }[] };
    const authorMap = new Map(authorProfiles?.map((profile) => [profile.id, profile.full_name]) ?? []);

    return {
      player,
      documents: (documentsRes.data ?? []).map(mapPlayerDocument),
      stats: (statsRes.data ?? []).map(mapPlayerStats),
      history: (historyRes.data ?? []).map(mapPlayerHistory),
      injuries: (injuriesRes.data ?? []).map(mapPlayerInjury),
      notes: (notesRes.data ?? []).map((note) =>
        mapCoachNote({
          ...note,
          profiles: { full_name: authorMap.get(note.author_id) ?? null },
        }),
      ),
    };
  },
);

export { playerFullName };

export type TrainingFilters = {
  teamId?: string;
  coachUserId?: string;
};

export const getTrainings = cache(
  async (
    clubId: string = DEFAULT_CLUB_ID,
    view: CalendarView = "month",
    anchorIso: string = new Date().toISOString().slice(0, 10),
    filters: TrainingFilters = {},
  ): Promise<Training[]> => {
    const supabase = await createClient();
    const anchor = parseLocalDate(anchorIso);
    const { from, to } = getCalendarRange(view, anchor);

    let query = supabase
      .from("trainings")
      .select(TRAINING_SELECT)
      .eq("club_id", clubId)
      .gte("training_date", from)
      .lte("training_date", to)
      .order("training_date")
      .order("start_time");

    if (filters.teamId) {
      query = query.eq("team_id", filters.teamId);
    }
    if (filters.coachUserId) {
      query = query.eq("coach_user_id", filters.coachUserId);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => mapTraining(row));
  },
);

export type TrainingDetailData = {
  training: Training;
  availability: ReturnType<typeof mapAvailability>[];
  attendance: ReturnType<typeof mapAttendance>[];
  notes: ReturnType<typeof mapSessionNote>[];
  teamPlayers: Player[];
  myPlayerId: string | null;
};

export const getTrainingDetail = cache(
  async (trainingId: string, clubId: string = DEFAULT_CLUB_ID): Promise<TrainingDetailData | null> => {
    const supabase = await createClient();
    const user = await getUser();

    const trainingRes = await supabase
      .from("trainings")
      .select(TRAINING_SELECT)
      .eq("club_id", clubId)
      .eq("id", trainingId)
      .maybeSingle();

    if (trainingRes.error || !trainingRes.data) return null;

    const training = mapTraining(trainingRes.data);

    const [teamMap, availabilityRes, attendanceRes, notesRes, rosterRes] = await Promise.all([
      loadTeamNameMapCached(clubId),
      supabase
        .from("training_availability")
        .select("id, training_id, player_id, status, absence_reason, notes")
        .eq("club_id", clubId)
        .eq("training_id", trainingId),
      supabase
        .from("training_attendance")
        .select("id, training_id, player_id, status, notes")
        .eq("club_id", clubId)
        .eq("training_id", trainingId),
      supabase
        .from("training_session_notes")
        .select("id, training_id, author_id, player_id, content, created_at")
        .eq("club_id", clubId)
        .eq("training_id", trainingId)
        .order("created_at", { ascending: false }),
      supabase
        .from("players")
        .select(PLAYER_SELECT)
        .eq("club_id", clubId)
        .eq("team_id", training.teamId)
        .order("last_name")
        .order("first_name"),
    ]);

    const roster = (rosterRes.data ?? []).map((row) =>
      attachTeamName(mapPlayer(row), teamMap),
    );
    const playerNameMap = new Map(
      roster.map((player) => [player.id, `${player.firstName} ${player.lastName}`]),
    );

    const authorIds = [...new Set((notesRes.data ?? []).map((note) => note.author_id))];
    const { data: authorProfiles } = authorIds.length
      ? await supabase.from("profiles").select("id, full_name").in("id", authorIds)
      : { data: [] as { id: string; full_name: string | null }[] };
    const authorMap = new Map(authorProfiles?.map((profile) => [profile.id, profile.full_name]) ?? []);

    let myPlayerId: string | null = null;
    if (user) {
      const { data: membership } = await supabase
        .from("club_memberships")
        .select("role")
        .eq("club_id", clubId)
        .eq("user_id", user.id)
        .eq("status", "active");
      const roles = (membership ?? []).map((m) => m.role as import("@/types/rbac").ClubRole);
      const accessCtx = buildAccessContext({ userId: user.id, clubId, roles });
      const ownIds = await resolveOwnPlayerIds(accessCtx);
      const onTeam = ownIds.find((id) => roster.some((p) => p.id === id));
      myPlayerId = onTeam ?? ownIds[0] ?? null;
    }

    return {
      training,
      availability: (availabilityRes.data ?? []).map((row) =>
        mapAvailability({
          ...row,
          playerName: playerNameMap.get(row.player_id),
        }),
      ),
      attendance: (attendanceRes.data ?? []).map((row) =>
        mapAttendance({
          ...row,
          playerName: playerNameMap.get(row.player_id),
        }),
      ),
      notes: (notesRes.data ?? []).map((note) =>
        mapSessionNote({
          ...note,
          playerName: note.player_id ? playerNameMap.get(note.player_id) ?? null : null,
          profiles: { full_name: authorMap.get(note.author_id) ?? null },
        }),
      ),
      teamPlayers: roster,
      myPlayerId,
    };
  },
);

export const getAttendanceStats = cache(
  async (
    scope: AttendanceScope = "season",
    clubId: string = DEFAULT_CLUB_ID,
    teamId?: string,
    maxTrainings?: number,
  ): Promise<PlayerAttendanceStats[]> => {
    const supabase = await createClient();
    const fromDate = getScopeDateFrom(scope);

    let trainingQuery = supabase
      .from("trainings")
      .select("id")
      .eq("club_id", clubId)
      .eq("status", "completed");

    if (fromDate) {
      trainingQuery = trainingQuery.gte("training_date", fromDate);
    }
    if (teamId) {
      trainingQuery = trainingQuery.eq("team_id", teamId);
    }
    if (maxTrainings) {
      trainingQuery = trainingQuery
        .order("training_date", { ascending: false })
        .limit(maxTrainings);
    }

    const { data: trainings, error: trainingError } = await trainingQuery;
    if (trainingError) throw new Error(trainingError.message);
    if (!trainings?.length) return [];

    const trainingIds = trainings.map((row) => row.id);
    const { data: attendance, error } = await supabase
      .from("training_attendance")
      .select("player_id, status")
      .eq("club_id", clubId)
      .in("training_id", trainingIds);

    if (error) throw new Error(error.message);
    if (!attendance?.length) return [];

    const playerIds = [...new Set(attendance.map((row) => row.player_id))];
    const { data: players, error: playersError } = await supabase
      .from("players")
      .select("id, first_name, last_name")
      .eq("club_id", clubId)
      .in("id", playerIds);

    if (playersError) throw new Error(playersError.message);

    const playerNameMap = new Map(
      (players ?? []).map((player) => [player.id, `${player.first_name} ${player.last_name}`]),
    );

    const rows = attendance.flatMap((row) => {
      const playerName = playerNameMap.get(row.player_id);
      if (!playerName) return [];
      return [
        {
          playerId: row.player_id,
          playerName,
          status: row.status,
        },
      ];
    });

    return computePlayerStats(rows);
  },
);

export const getCoachDashboard = cache(
  async (clubId: string = DEFAULT_CLUB_ID): Promise<CoachDashboardData> => {
    const supabase = await createClient();
    const today = new Date().toISOString().slice(0, 10);

    const [upcomingRes, injuredRes, stats] = await Promise.all([
      supabase
        .from("trainings")
        .select(TRAINING_SELECT)
        .eq("club_id", clubId)
        .eq("status", "planned")
        .gte("training_date", today)
        .order("training_date")
        .order("start_time")
        .limit(5),
      supabase
        .from("players")
        .select("id, first_name, last_name")
        .eq("club_id", clubId)
        .eq("status", "injured"),
      getAttendanceStats("season", clubId),
    ]);

    if (upcomingRes.error) throw new Error(upcomingRes.error.message);
    if (injuredRes.error) throw new Error(injuredRes.error.message);

    const upcomingTrainings = (upcomingRes.data ?? []).map(mapTraining);
    const nextTraining = upcomingTrainings[0];

    let confirmedCount = 0;
    let unconfirmedCount = 0;

    if (nextTraining) {
      const [{ data: availability }, { count: rosterCount, error: rosterError }] =
        await Promise.all([
          supabase
            .from("training_availability")
            .select("status")
            .eq("club_id", clubId)
            .eq("training_id", nextTraining.id),
          supabase
            .from("players")
            .select("*", { count: "exact", head: true })
            .eq("club_id", clubId)
            .eq("team_id", nextTraining.teamId),
        ]);

      if (rosterError) throw new Error(rosterError.message);

      let present = 0;
      let absent = 0;

      for (const row of availability ?? []) {
        if (row.status === "present") present += 1;
        if (row.status === "absent") absent += 1;
      }

      confirmedCount = present;
      unconfirmedCount = Math.max(0, (rosterCount ?? 0) - present - absent);
    }

    return {
      upcomingTrainings,
      confirmedCount,
      unconfirmedCount,
      injuredPlayers: (injuredRes.data ?? []).map((player) => ({
        id: player.id,
        name: `${player.first_name} ${player.last_name}`,
      })),
      topEngaged: stats.slice(0, 10),
      leastEngaged: [...stats].reverse().slice(0, 10),
    };
  },
);

export const syncTrainingReminders = cache(async (clubId: string = DEFAULT_CLUB_ID) => {
  const user = await getUser();
  if (!user) return;

  const access = await getAccessContext(user.id, clubId);
  if (!access || !canManageTrainings(access.roles)) return;

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 14);
  const horizonDate = horizon.toISOString().slice(0, 10);

  const { data: trainings } = await supabase
    .from("trainings")
    .select("id, name, training_date, start_time")
    .eq("club_id", clubId)
    .eq("status", "planned")
    .gte("training_date", today)
    .lte("training_date", horizonDate);

  if (!trainings?.length) return;

  const { data: members } = await supabase
    .from("club_memberships")
    .select("user_id")
    .eq("club_id", clubId)
    .eq("status", "active")
    .in("role", ["owner", "president", "sports_director", "coach", "player", "parent"]);

  const rows = [];

  for (const training of trainings) {
    const time = training.start_time.slice(0, 5);
    for (const member of members ?? []) {
      for (const reminderType of TRAINING_REMINDER_TYPES) {
        const scheduledAt = reminderScheduledAt(
          training.training_date,
          time,
          reminderType,
        );
        if (!isNotificationDue(scheduledAt.toISOString())) continue;

        const copy = buildReminderCopy(
          training.name,
          training.training_date,
          time,
          reminderType,
        );

        rows.push({
          club_id: clubId,
          user_id: member.user_id,
          training_id: training.id,
          reminder_type: reminderType,
          title: copy.title,
          body: copy.body,
          href: `/training/${training.id}`,
          scheduled_at: scheduledAt.toISOString(),
          delivery_channels: ["in_app"],
        });
      }
    }
  }

  if (rows.length) {
    await supabase.from("club_notifications").upsert(rows, {
      onConflict: "user_id,training_id,reminder_type",
      ignoreDuplicates: true,
    });
  }
});

export const getNotifications = cache(
  async (clubId: string = DEFAULT_CLUB_ID): Promise<ClubNotification[]> => {
    const user = await getUser();
    if (!user) return [];

    const supabase = await createClient();
    const now = new Date().toISOString();
    const { data, error } = await supabase
      .from("club_notifications")
      .select(
        "id, club_id, training_id, reminder_type, title, body, href, scheduled_at, read_at",
      )
      .eq("club_id", clubId)
      .eq("user_id", user.id)
      .lte("scheduled_at", now)
      .order("scheduled_at", { ascending: false })
      .limit(50);

    if (error) throw new Error(error.message);
    return (data ?? []).map(mapClubNotification);
  },
);

export const getUnreadNotificationCount = cache(
  async (clubId: string = DEFAULT_CLUB_ID): Promise<number> => {
    const user = await getUser();
    if (!user) return 0;

    const supabase = await createClient();
    const now = new Date().toISOString();
    const { count, error } = await supabase
      .from("club_notifications")
      .select("*", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("user_id", user.id)
      .is("read_at", null)
      .lte("scheduled_at", now);

    if (error) return 0;
    return count ?? 0;
  },
);

export const getCoaches = cache(async (clubId: string = DEFAULT_CLUB_ID) => {
  const supabase = await createClient();
  const { data: memberships, error } = await supabase
    .from("club_memberships")
    .select("id, role, status, team_id, user_id")
    .eq("club_id", clubId)
    .eq("status", "active")
    .in("role", ["coach", "owner", "president", "sports_director"]);

  if (error) throw new Error(error.message);
  if (!memberships?.length) return [];

  const userIds = [...new Set(memberships.map((m) => m.user_id))];
  const [{ data: profiles }, teams] = await Promise.all([
    supabase.from("profiles").select("id, email, full_name").in("id", userIds),
    getTeams(clubId),
  ]);

  const profileMap = new Map(profiles?.map((p) => [p.id, p]) ?? []);
  const teamMap = new Map(teams.map((t) => [t.id, { id: t.id, name: t.name }]));

  return memberships.flatMap((membership) => {
    const parsedRole = parseClubRole(membership.role);
    if (!parsedRole.success) return [];

    return [
      {
        id: membership.id,
        role: parsedRole.data,
        status: membership.status,
        team_id: membership.team_id,
        user_id: membership.user_id,
        profile: profileMap.get(membership.user_id) ?? null,
        team: membership.team_id ? teamMap.get(membership.team_id) ?? null : null,
      },
    ];
  });
});

export { DEFAULT_COMPETITION as MATCH_DEFAULT_COMPETITION, DEFAULT_SEASON as MATCH_DEFAULT_SEASON };

export const getMatches = cache(
  async (
    clubId: string = DEFAULT_CLUB_ID,
    view: MatchCalendarView = "month",
    anchorIso: string = new Date().toISOString().slice(0, 10),
    filters: MatchFilters = {},
  ): Promise<Match[]> => {
    const supabase = await createClient();
    const anchor = parseLocalDate(anchorIso);
    const { from, to } = getMatchCalendarRange(view, anchor);

    let query = supabase
      .from("matches")
      .select(MATCH_SELECT)
      .eq("club_id", clubId)
      .gte("match_date", from)
      .lte("match_date", to)
      .order("match_date")
      .order("match_time");

    if (filters.teamId) query = query.eq("team_id", filters.teamId);
    if (filters.season) query = query.eq("season", filters.season);
    if (filters.competition) query = query.eq("competition", filters.competition);

    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => mapMatch(row));
  },
);

export const getMatchDetail = cache(
  async (matchId: string, clubId: string = DEFAULT_CLUB_ID): Promise<MatchDetailData | null> => {
    const supabase = await createClient();
    const matchRes = await supabase
      .from("matches")
      .select(MATCH_SELECT)
      .eq("club_id", clubId)
      .eq("id", matchId)
      .maybeSingle();

    if (matchRes.error || !matchRes.data) return null;
    const match = mapMatch(matchRes.data);

    const [
      squadRes,
      lineupRes,
      eventsRes,
      statsRes,
      mvpRes,
      rosterRes,
      attendanceStats,
    ] = await Promise.all([
      supabase
        .from("match_squad")
        .select("id, match_id, player_id, squad_role")
        .eq("club_id", clubId)
        .eq("match_id", matchId),
      supabase
        .from("match_lineup_positions")
        .select("id, match_id, player_id, slot_code, pos_x, pos_y")
        .eq("club_id", clubId)
        .eq("match_id", matchId),
      supabase
        .from("match_events")
        .select("id, match_id, event_type, minute, player_id, related_player_id, notes, created_at")
        .eq("club_id", clubId)
        .eq("match_id", matchId)
        .order("minute"),
      supabase
        .from("match_player_stats")
        .select("player_id, minutes_played, goals, assists, yellow_cards, red_cards")
        .eq("club_id", clubId)
        .eq("match_id", matchId),
      supabase
        .from("match_mvp_history")
        .select("player_id, created_at")
        .eq("club_id", clubId)
        .eq("match_id", matchId),
      supabase
        .from("players")
        .select(PLAYER_SELECT)
        .eq("club_id", clubId)
        .eq("team_id", match.teamId),
      getAttendanceStats("season", clubId, match.teamId, 30),
    ]);

    const roster = rosterRes.data ?? [];
    const nameMap = new Map(
      roster.map((p) => [p.id, `${p.first_name} ${p.last_name}`]),
    );
    const metaMap = new Map(
      roster.map((p) => [
        p.id,
        { status: p.status, jersey: p.jersey_number },
      ]),
    );
    const rateMap = new Map(attendanceStats.map((s) => [s.playerId, s.attendanceRate]));

    const { data: lastActivityRows } = await supabase
      .from("training_attendance")
      .select("player_id, marked_at")
      .eq("club_id", clubId)
      .in("player_id", roster.map((p) => p.id))
      .order("marked_at", { ascending: false })
      .limit(Math.min(roster.length * 5, 150));

    const lastActivityMap = new Map<string, string>();
    for (const row of lastActivityRows ?? []) {
      if (!lastActivityMap.has(row.player_id)) {
        lastActivityMap.set(row.player_id, row.marked_at);
      }
    }

    const playerStats: MatchPlayerStats[] = (statsRes.data ?? [])
      .map((row) => ({
        playerId: row.player_id,
        playerName: nameMap.get(row.player_id) ?? "Zawodnik",
        matchesPlayed: 1,
        minutesPlayed: row.minutes_played,
        goals: row.goals,
        assists: row.assists,
        yellowCards: row.yellow_cards,
        redCards: row.red_cards,
      }))
      .sort((a, b) => b.goals - a.goals || b.minutesPlayed - a.minutesPlayed);

    return {
      match,
      squad: (squadRes.data ?? []).map((row) =>
        mapSquadEntry({
          ...row,
          playerName: nameMap.get(row.player_id),
          jerseyNumber: metaMap.get(row.player_id)?.jersey ?? null,
          playerStatus: metaMap.get(row.player_id)?.status ?? "active",
          attendanceRate: rateMap.get(row.player_id) ?? 0,
          lastActivity: lastActivityMap.get(row.player_id) ?? null,
        }),
      ),
      lineup: (lineupRes.data ?? []).map((row) =>
        mapLineupPosition({ ...row, playerName: nameMap.get(row.player_id) }),
      ),
      events: (eventsRes.data ?? []).map((row) =>
        mapMatchEvent({
          ...row,
          playerName: row.player_id ? nameMap.get(row.player_id) : null,
          relatedPlayerName: row.related_player_id
            ? nameMap.get(row.related_player_id)
            : null,
        }),
      ),
      playerStats,
      mvpHistory: (mvpRes.data ?? []).map((row) => ({
        playerId: row.player_id,
        playerName: nameMap.get(row.player_id) ?? "Zawodnik",
        createdAt: row.created_at,
      })),
    };
  },
);

export const getLeagueTable = cache(
  async (
    competition: string = DEFAULT_COMPETITION,
    season: string = DEFAULT_SEASON,
    clubId: string = DEFAULT_CLUB_ID,
  ): Promise<LeagueTableEntry[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("league_table_entries")
      .select("*")
      .eq("club_id", clubId)
      .eq("competition", competition)
      .eq("season", season)
      .order("points", { ascending: false })
      .order("goals_for", { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? [])
      .map(mapLeagueEntry)
      .sort(
        (a, b) =>
          b.points - a.points ||
          b.goalDifference - a.goalDifference ||
          b.goalsFor - a.goalsFor,
      );
  },
);

export const getTeamMatchStats = cache(
  async (
    teamId: string,
    season: string = DEFAULT_SEASON,
    clubId: string = DEFAULT_CLUB_ID,
  ): Promise<{ stats: TeamMatchStats; form: TeamFormStats; ownTeamName: string }> => {
    const club = await getClub(clubId);
    const ownTeamName = club ? getClubBrandingName(club) : "Klub";

    const supabase = await createClient();
    const { data, error } = await supabase
      .from("matches")
      .select(MATCH_SELECT)
      .eq("club_id", clubId)
      .eq("team_id", teamId)
      .eq("season", season)
      .eq("status", "completed");

    if (error) throw new Error(error.message);
    const matches = (data ?? []).map(mapMatch);
    return {
      ownTeamName,
      stats: aggregateTeamStats(matches, ownTeamName),
      form: computeTeamForm(matches, ownTeamName),
    };
  },
);

export const getPlayerFormStats = cache(
  async (teamId?: string, clubId: string = DEFAULT_CLUB_ID): Promise<PlayerFormStats[]> => {
    const supabase = await createClient();
    const since = new Date();
    since.setDate(since.getDate() - 30);
    const sinceIso = since.toISOString().slice(0, 10);

    let matchQuery = supabase
      .from("matches")
      .select("id")
      .eq("club_id", clubId)
      .eq("status", "completed")
      .gte("match_date", sinceIso);

    if (teamId) matchQuery = matchQuery.eq("team_id", teamId);

    const { data: matches } = await matchQuery;
    if (!matches?.length) return [];

    const matchIds = matches.map((m) => m.id);
    const { data: stats, error } = await supabase
      .from("match_player_stats")
      .select("player_id, minutes_played, goals, assists")
      .eq("club_id", clubId)
      .in("match_id", matchIds);

    if (error) throw new Error(error.message);

    const playerIds = [...new Set((stats ?? []).map((s) => s.player_id))];
    if (!playerIds.length) return [];

    const { data: players } = await supabase
      .from("players")
      .select("id, first_name, last_name")
      .in("id", playerIds);

    const nameMap = new Map(players?.map((p) => [p.id, `${p.first_name} ${p.last_name}`]) ?? []);
    const map = new Map<string, PlayerFormStats>();

    for (const row of stats ?? []) {
      const current = map.get(row.player_id) ?? {
        playerId: row.player_id,
        playerName: nameMap.get(row.player_id) ?? "Zawodnik",
        matchesLast30Days: 0,
        goals: 0,
        assists: 0,
        minutes: 0,
      };
      current.matchesLast30Days += 1;
      current.goals += row.goals;
      current.assists += row.assists;
      current.minutes += row.minutes_played;
      map.set(row.player_id, current);
    }

    return [...map.values()].sort((a, b) => b.goals - a.goals);
  },
);

async function fetchMatchFilterOptions(clubId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("matches")
    .select("season, competition")
    .eq("club_id", clubId);

  const seasons = [...new Set((data ?? []).map((r) => r.season))].sort();
  const competitions = [...new Set((data ?? []).map((r) => r.competition))].sort();
  return { seasons, competitions };
}

export const getMatchFilterOptions = cache(async (clubId: string = DEFAULT_CLUB_ID) => {
  return unstable_cache(
    () => fetchMatchFilterOptions(clubId),
    ["match-filter-options", clubId],
    { revalidate: 300, tags: [`match-filters-${clubId}`] },
  )();
});

export const getAiConversations = cache(
  async (
    clubId: string = DEFAULT_CLUB_ID,
    search?: string,
  ): Promise<AiConversation[]> => {
    const user = await getUser();
    if (!user) return [];

    const supabase = await createClient();
    let query = supabase
      .from("ai_conversations")
      .select("id, club_id, user_id, title, is_pinned, created_at, updated_at")
      .eq("club_id", clubId)
      .eq("user_id", user.id)
      .order("is_pinned", { ascending: false })
      .order("updated_at", { ascending: false });

    if (search?.trim()) {
      const term = sanitizeIlikeTerm(search);
      if (term) query = query.ilike("title", `%${term}%`);
    }

    const { data, error } = await query;
    if (error) throw new Error(error.message);

    const conversations = (data ?? []).map(mapAiConversation);
    if (!conversations.length) return conversations;

    const ids = conversations.map((c) => c.id);
    const { data: previews } = await supabase
      .from("ai_messages")
      .select("conversation_id, content, created_at")
      .in("conversation_id", ids)
      .eq("club_id", clubId)
      .order("created_at", { ascending: false })
      .limit(Math.min(ids.length * 5, 200));

    const previewMap = new Map<string, string>();
    for (const row of previews ?? []) {
      if (!previewMap.has(row.conversation_id)) {
        previewMap.set(row.conversation_id, row.content.slice(0, 120));
      }
    }

    return conversations.map((c) => ({ ...c, preview: previewMap.get(c.id) ?? null }));
  },
);

export const getAiConversationDetail = cache(
  async (
    conversationId: string,
    clubId: string = DEFAULT_CLUB_ID,
  ): Promise<AiConversationDetail | null> => {
    const user = await getUser();
    if (!user) return null;

    const supabase = await createClient();
    const { data: conversation, error } = await supabase
      .from("ai_conversations")
      .select("id, club_id, user_id, title, is_pinned, created_at, updated_at")
      .eq("id", conversationId)
      .eq("club_id", clubId)
      .eq("user_id", user.id)
      .maybeSingle();

    if (error || !conversation) return null;

    const { data: messages } = await supabase
      .from("ai_messages")
      .select("id, conversation_id, role, content, created_at")
      .eq("conversation_id", conversationId)
      .eq("club_id", clubId)
      .order("created_at")
      .limit(200);

    return {
      conversation: mapAiConversation(conversation),
      messages: (messages ?? []).map(mapAiMessage),
    };
  },
);

export const getAiReports = cache(
  async (
    clubId: string = DEFAULT_CLUB_ID,
    category?: AiReportCategory,
    search?: string,
  ): Promise<AiReport[]> => {
    const supabase = await createClient();
    let query = supabase
      .from("ai_reports")
      .select("*")
      .eq("club_id", clubId)
      .order("created_at", { ascending: false });

    if (category) query = query.eq("category", category);
    if (search?.trim()) {
      const term = sanitizeIlikeTerm(search);
      if (term) query = query.or(`title.ilike.%${term}%,content.ilike.%${term}%`);
    }

    const { data, error } = await query.limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapAiReport);
  },
);

export const getAiReport = cache(
  async (reportId: string, clubId: string = DEFAULT_CLUB_ID): Promise<AiReport | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("ai_reports")
      .select("*")
      .eq("id", reportId)
      .eq("club_id", clubId)
      .maybeSingle();

    if (error || !data) return null;
    return mapAiReport(data);
  },
);

export const getAiReportCategories = cache(async (): Promise<AiReportCategoryRow[]> => {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("ai_report_categories")
    .select("id, label, sort_order")
    .order("sort_order");

  if (error) throw new Error(error.message);
  return (data ?? []).map(mapAiReportCategory);
});

export const getAiSuggestions = cache(
  async (clubId: string = DEFAULT_CLUB_ID, status: AiSuggestion["status"] = "open"): Promise<AiSuggestion[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("ai_suggestions")
      .select("*")
      .eq("club_id", clubId)
      .eq("status", status)
      .order("created_at", { ascending: false });

    if (error) throw new Error(error.message);
    return (data ?? []).map(mapAiSuggestion);
  },
);

export const syncSponsorContractReminders = cache(async (clubId: string = DEFAULT_CLUB_ID) => {
  const user = await getUser();
  if (!user) return;

  const access = await getAccessContext(user.id, clubId);
  if (!access || !canManageSponsors(access.roles)) return;

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 90);
  const horizonDate = horizon.toISOString().slice(0, 10);

  const { data: contracts } = await supabase
    .from("sponsor_contracts")
    .select("id, name, end_date, sponsor_id, sponsors(company_name)")
    .eq("club_id", clubId)
    .gte("end_date", today)
    .lte("end_date", horizonDate)
    .in("status", ["active", "expiring"])
    .limit(100);

  if (!contracts?.length) return;

  const { data: members } = await supabase
    .from("club_memberships")
    .select("user_id")
    .eq("club_id", clubId)
    .eq("status", "active")
    .in("role", ["owner", "president"]);

  const rows: Database["public"]["Tables"]["club_notifications"]["Insert"][] = [];

  for (const contract of contracts) {
    const sponsorName =
      (contract.sponsors as { company_name?: string } | null)?.company_name ?? "Sponsor";
    for (const days of SPONSOR_CONTRACT_REMINDER_DAYS) {
      if (!isContractReminderDue(contract.end_date, days)) continue;

      const copy = buildContractReminderCopy(
        contract.name,
        sponsorName,
        contract.end_date,
        days,
      );
      const scheduledAt = new Date(`${contract.end_date}T00:00:00.000Z`);
      scheduledAt.setDate(scheduledAt.getDate() - days);

      for (const member of members ?? []) {
        rows.push({
          club_id: clubId,
          user_id: member.user_id,
          sponsor_contract_id: contract.id,
          sponsor_reminder_days: days,
          title: copy.title,
          body: copy.body,
          href: `/sponsors/${contract.sponsor_id}`,
          scheduled_at: scheduledAt.toISOString(),
          delivery_channels: ["in_app"],
        });
      }
    }
  }

  if (rows.length) {
    await supabase.from("club_notifications").upsert(rows, {
      onConflict: "user_id,sponsor_contract_id,sponsor_reminder_days",
      ignoreDuplicates: true,
    });
  }
});

const SPONSOR_LIST_SELECT =
  "id, club_id, company_name, city, contact_email, email, cooperation_status, created_at, updated_at";

export const getSponsors = cache(
  async (clubId: string = DEFAULT_CLUB_ID, search?: string): Promise<Sponsor[]> => {
    const supabase = await createClient();
    let query = supabase
      .from("sponsors")
      .select(SPONSOR_LIST_SELECT)
      .eq("club_id", clubId)
      .order("company_name");

    if (search?.trim()) {
      const term = sanitizeIlikeTerm(search);
      if (term) query = query.ilike("company_name", `%${term}%`);
    }

    const { data, error } = await query.limit(500);
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapSponsor);
  },
);

export const getSponsor = cache(
  async (sponsorId: string, clubId: string = DEFAULT_CLUB_ID): Promise<Sponsor | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("sponsors")
      .select("*")
      .eq("id", sponsorId)
      .eq("club_id", clubId)
      .maybeSingle();

    if (error || !data) return null;
    return mapSponsor(data);
  },
);

export const getSponsorDetail = cache(
  async (
    sponsorId: string,
    clubId: string = DEFAULT_CLUB_ID,
    includeFinancial = false,
  ): Promise<SponsorDetailData | null> => {
    const sponsor = await getSponsor(sponsorId, clubId);
    if (!sponsor) return null;

    const supabase = await createClient();
    const [contractsRes, notesRes, exposureRes, reportsRes] = await Promise.all([
      supabase
        .from("sponsor_contracts")
        .select("*")
        .eq("sponsor_id", sponsorId)
        .eq("club_id", clubId)
        .order("end_date", { ascending: false })
        .limit(20),
      supabase
        .from("sponsor_notes")
        .select("*, author:author_id(full_name)")
        .eq("sponsor_id", sponsorId)
        .eq("club_id", clubId)
        .order("contact_date", { ascending: false })
        .limit(50),
      supabase
        .from("sponsor_exposure")
        .select("*")
        .eq("sponsor_id", sponsorId)
        .eq("club_id", clubId)
        .order("exposure_date", { ascending: false })
        .limit(30),
      supabase
        .from("sponsor_reports")
        .select("*")
        .eq("sponsor_id", sponsorId)
        .eq("club_id", clubId)
        .order("period_end", { ascending: false })
        .limit(20),
    ]);

    let financialRows: Database["public"]["Tables"]["sponsor_financial_entries"]["Row"][] = [];
    if (includeFinancial) {
      const { data: financialData } = await supabase
        .from("sponsor_financial_entries")
        .select("*")
        .eq("sponsor_id", sponsorId)
        .eq("club_id", clubId)
        .order("due_date", { ascending: false })
        .limit(50);
      financialRows = financialData ?? [];
    }

    const contractRows = contractsRes.data ?? [];
    const contractIds = contractRows.map((c) => c.id);
    let attachments: ReturnType<typeof mapSponsorContractAttachment>[] = [];
    if (contractIds.length) {
      const { data: attachmentRows } = await supabase
        .from("sponsor_contract_attachments")
        .select("*")
        .in("contract_id", contractIds)
        .eq("club_id", clubId);
      attachments = (attachmentRows ?? []).map(mapSponsorContractAttachment);
    }

    return {
      sponsor,
      contracts: contractRows.map(mapSponsorContract),
      contractAttachments: attachments,
      notes: (notesRes.data ?? []).map(mapSponsorNote),
      exposure: (exposureRes.data ?? []).map(mapSponsorExposure),
      reports: (reportsRes.data ?? []).map(mapSponsorReport),
      financialEntries: financialRows.map(mapSponsorFinancialEntry),
    };
  },
);

export const getSponsorLeads = cache(
  async (clubId: string = DEFAULT_CLUB_ID): Promise<SponsorLead[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("sponsor_leads")
      .select("*")
      .eq("club_id", clubId)
      .order("updated_at", { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);
    return (data ?? []).map(mapSponsorLead);
  },
);

export const getSponsorPublications = cache(
  async (clubId: string = DEFAULT_CLUB_ID): Promise<SponsorPublication[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("sponsor_publications")
      .select("*")
      .eq("club_id", clubId)
      .order("published_at", { ascending: false })
      .limit(100);

    if (error) throw new Error(error.message);
    const publications = (data ?? []).map(mapSponsorPublication);
    if (!publications.length) return publications;

    const ids = publications.map((p) => p.id);
    const { data: links } = await supabase
      .from("sponsor_publication_links")
      .select("publication_id, sponsor_id, sponsors(company_name)")
      .in("publication_id", ids)
      .eq("club_id", clubId);

    const linkMap = new Map<string, { ids: string[]; names: string[] }>();
    for (const link of links ?? []) {
      const current = linkMap.get(link.publication_id) ?? { ids: [], names: [] };
      current.ids.push(link.sponsor_id);
      const name = (link.sponsors as { company_name?: string } | null)?.company_name;
      if (name) current.names.push(name);
      linkMap.set(link.publication_id, current);
    }

    return publications.map((p) => {
      const linked = linkMap.get(p.id);
      return {
        ...p,
        sponsorIds: linked?.ids ?? [],
        sponsorNames: linked?.names ?? [],
      };
    });
  },
);

export const getSponsorDashboardStats = cache(
  async (clubId: string = DEFAULT_CLUB_ID): Promise<SponsorDashboardStats> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_sponsor_dashboard_stats", {
      p_club_id: clubId,
    });

    if (error || !data) {
      return {
        totalSponsors: 0,
        activeContracts: 0,
        expiringContracts: 0,
        activeContractValue: 0,
        openLeads: 0,
        publicationsThisMonth: 0,
      };
    }

    const row = data as Record<string, unknown>;
    return {
      totalSponsors: Number(row.total_sponsors ?? 0),
      activeContracts: Number(row.active_contracts ?? 0),
      expiringContracts: Number(row.expiring_contracts ?? 0),
      activeContractValue: Number(row.active_contract_value ?? 0),
      openLeads: Number(row.open_leads ?? 0),
      publicationsThisMonth: Number(row.publications_this_month ?? 0),
    };
  },
);

export const getSponsorForCurrentUser = cache(
  async (clubId: string = DEFAULT_CLUB_ID): Promise<Sponsor | null> => {
    const user = await getUser();
    if (!user) return null;

    const supabase = await createClient();
    const { data } = await supabase
      .from("sponsors")
      .select("*")
      .eq("club_id", clubId)
      .eq("profile_id", user.id)
      .maybeSingle();

    return data ? mapSponsor(data) : null;
  },
);

export const getSponsorPortalData = cache(
  async (clubId: string = DEFAULT_CLUB_ID): Promise<SponsorPortalData | null> => {
    const sponsor = await getSponsorForCurrentUser(clubId);
    if (!sponsor) return null;

    const supabase = await createClient();
    const teams = await getTeams(clubId);
    const seniorTeam = teams.find((t) => t.category === "seniors") ?? teams[0];
    const teamId = seniorTeam?.id;

    const [contracts, reports, linkRows, scheduleResult] = await Promise.all([
      supabase
        .from("sponsor_contracts")
        .select("*")
        .eq("sponsor_id", sponsor.id)
        .eq("club_id", clubId)
        .order("end_date", { ascending: false })
        .limit(10),
      supabase
        .from("sponsor_reports")
        .select("*")
        .eq("sponsor_id", sponsor.id)
        .eq("club_id", clubId)
        .eq("status", "published")
        .order("period_end", { ascending: false })
        .limit(10),
      supabase
        .from("sponsor_publication_links")
        .select("publication_id")
        .eq("sponsor_id", sponsor.id)
        .eq("club_id", clubId)
        .order("created_at", { ascending: false })
        .limit(20),
      teamId
        ? supabase.rpc("get_sponsor_portal_schedule", {
            p_club_id: clubId,
            p_team_id: teamId,
          })
        : Promise.resolve({ data: { upcoming: [], results: [] }, error: null }),
    ]);

    const publicationIds = (linkRows.data ?? []).map((r) => r.publication_id);
    let pubRows: ReturnType<typeof mapSponsorPublication>[] = [];
    if (publicationIds.length) {
      const { data: pubs } = await supabase
        .from("sponsor_publications")
        .select("*")
        .in("id", publicationIds)
        .eq("club_id", clubId);
      pubRows = (pubs ?? []).map(mapSponsorPublication);
    }

    type ScheduleMatch = {
      id: string;
      home_team_name: string;
      away_team_name: string;
      match_date: string;
      match_time?: string;
      home_score?: number | null;
      away_score?: number | null;
      status?: string;
    };

    const schedule = (scheduleResult.data ?? { upcoming: [], results: [] }) as {
      upcoming?: ScheduleMatch[];
      results?: ScheduleMatch[];
    };

    return {
      sponsor,
      contracts: (contracts.data ?? []).map(mapSponsorContract),
      reports: (reports.data ?? []).map(mapSponsorReport),
      publications: pubRows,
      upcomingMatches: (schedule.upcoming ?? []).map((m) => ({
        id: m.id,
        homeTeamName: m.home_team_name,
        awayTeamName: m.away_team_name,
        matchDate: m.match_date,
        matchTime: m.match_time ?? "",
        status: m.status ?? "planned",
      })),
      recentResults: (schedule.results ?? []).map((m) => ({
        id: m.id,
        homeTeamName: m.home_team_name,
        awayTeamName: m.away_team_name,
        homeScore: m.home_score ?? null,
        awayScore: m.away_score ?? null,
        matchDate: m.match_date,
      })),
    };
  },
);

export const getSponsorReport = cache(
  async (reportId: string, clubId: string = DEFAULT_CLUB_ID) => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("sponsor_reports")
      .select("*, sponsors(company_name)")
      .eq("id", reportId)
      .eq("club_id", clubId)
      .maybeSingle();

    if (!data) return null;
    return {
      report: mapSponsorReport(data),
      sponsorName: (data.sponsors as { company_name?: string } | null)?.company_name ?? "Sponsor",
    };
  },
);

export function requireFinanceReadAccess(access: UserAccessContext) {
  if (!canReadFinance(access.roles)) redirect("/dashboard");
}

export function requireFinancePortalAccess(access: UserAccessContext) {
  if (!canAccessFinancePortal(access.roles)) redirect("/dashboard");
}

export const getFinanceIncome = cache(
  async (clubId: string = DEFAULT_CLUB_ID, limit = 100): Promise<FinanceIncome[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("finance_income")
      .select("*, author:created_by(full_name)")
      .eq("club_id", clubId)
      .order("transaction_date", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapFinanceIncome);
  },
);

export const getFinanceExpenses = cache(
  async (clubId: string = DEFAULT_CLUB_ID, limit = 100): Promise<FinanceExpense[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("finance_expenses")
      .select("*, author:created_by(full_name)")
      .eq("club_id", clubId)
      .order("transaction_date", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapFinanceExpense);
  },
);

export const getFinanceFeePlans = cache(
  async (clubId: string = DEFAULT_CLUB_ID): Promise<FinanceFeePlan[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("finance_fee_plans")
      .select("*")
      .eq("club_id", clubId)
      .order("name");
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapFinanceFeePlan);
  },
);

export const getFinancePlayerFees = cache(
  async (clubId: string = DEFAULT_CLUB_ID, limit = 200): Promise<FinancePlayerFee[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("finance_player_fees")
      .select("*, player:player_id(first_name, last_name)")
      .eq("club_id", clubId)
      .order("due_date", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapFinancePlayerFee);
  },
);

export const getFinanceGrants = cache(
  async (clubId: string = DEFAULT_CLUB_ID): Promise<FinanceGrant[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("finance_grants")
      .select("*")
      .eq("club_id", clubId)
      .order("period_start", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapFinanceGrant);
  },
);

export const getFinanceBudgets = cache(
  async (clubId: string = DEFAULT_CLUB_ID): Promise<FinanceBudget[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("finance_budgets")
      .select("*, team:team_id(name)")
      .eq("club_id", clubId)
      .order("period_start", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);

    const rows = (data ?? []) as Array<Record<string, unknown> & { period_start: string; period_end: string }>;
    const executions = await computeBudgetExecutionsBatch(
      clubId,
      rows.map((row) => ({
        period_start: String(row.period_start),
        period_end: String(row.period_end),
      })),
    );

    return rows.map((row) => {
      const key = `${row.period_start}:${row.period_end}`;
      return mapFinanceBudget(row, executions.get(key) ?? 0);
    });
  },
);

export const getFinanceDocuments = cache(
  async (clubId: string = DEFAULT_CLUB_ID): Promise<FinanceDocument[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("finance_documents")
      .select("*")
      .eq("club_id", clubId)
      .order("issue_date", { ascending: false, nullsFirst: false })
      .limit(100);
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapFinanceDocument);
  },
);

export const getFinanceReports = cache(
  async (clubId: string = DEFAULT_CLUB_ID): Promise<FinanceReport[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("finance_reports")
      .select("*")
      .eq("club_id", clubId)
      .order("period_end", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapFinanceReport);
  },
);

export const getFinanceReport = cache(
  async (reportId: string, clubId: string = DEFAULT_CLUB_ID): Promise<FinanceReport | null> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("finance_reports")
      .select("*")
      .eq("id", reportId)
      .eq("club_id", clubId)
      .maybeSingle();
    return data ? mapFinanceReport(data) : null;
  },
);

export const getFinanceDashboardStats = cache(
  async (clubId: string = DEFAULT_CLUB_ID): Promise<FinanceDashboardStats> => {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("get_finance_dashboard_page", {
      p_club_id: clubId,
    });

    if (error || !data) {
      return {
        balance: 0,
        totalIncome: 0,
        totalExpenses: 0,
        totalFeesDue: 0,
        totalFeesPaid: 0,
        overdueFeesCount: 0,
        sponsorIncomeTotal: 0,
        recentIncome: [],
        recentExpenses: [],
        overdueFees: [],
      };
    }

    const payload = data as {
      totals: {
        total_income?: number;
        total_expenses?: number;
        sponsor_income?: number;
        total_fees_due?: number;
        total_fees_paid?: number;
        overdue_fees_count?: number;
      } | null;
      overdue_fees: Record<string, unknown>[];
      recent_income: Record<string, unknown>[];
      recent_expenses: Record<string, unknown>[];
    };

    const totals = payload.totals;
    const totalIncome = Number(totals?.total_income ?? 0);
    const totalExpenses = Number(totals?.total_expenses ?? 0);
    const feeRows = (payload.overdue_fees ?? []).map((row) =>
      mapFinancePlayerFee({
        ...row,
        club_id: clubId,
        player: row.first_name
          ? { first_name: row.first_name, last_name: row.last_name }
          : null,
      }),
    );

    return {
      balance: totalIncome - totalExpenses,
      totalIncome,
      totalExpenses,
      totalFeesDue: Number(totals?.total_fees_due ?? 0),
      totalFeesPaid: Number(totals?.total_fees_paid ?? 0),
      overdueFeesCount: Number(totals?.overdue_fees_count ?? feeRows.length),
      sponsorIncomeTotal: Number(totals?.sponsor_income ?? 0),
      recentIncome: (payload.recent_income ?? []).map((row) =>
        mapFinanceIncome({ ...row, club_id: clubId }),
      ),
      recentExpenses: (payload.recent_expenses ?? []).map((row) =>
        mapFinanceExpense({ ...row, club_id: clubId }),
      ),
      overdueFees: feeRows,
    };
  },
);

export const getParentFinancePortalData = cache(
  async (clubId: string = DEFAULT_CLUB_ID): Promise<ParentFinancePortalData | null> => {
    const user = await getUser();
    if (!user) return null;

    const supabase = await createClient();
    const { data: guardian } = await supabase
      .from("player_guardians")
      .select("player_id, player:player_id(first_name, last_name)")
      .eq("club_id", clubId)
      .eq("profile_id", user.id)
      .limit(1)
      .maybeSingle();

    if (!guardian) return null;

    const guardianRow = guardian as {
      player_id: string;
      player: { first_name?: string; last_name?: string } | null;
    };
    const playerId = guardianRow.player_id;
    const player = guardianRow.player;
    const playerName = player
      ? `${player.first_name ?? ""} ${player.last_name ?? ""}`.trim()
      : "Zawodnik";

    const [feesRes, paymentsRes] = await Promise.all([
      supabase
        .from("finance_player_fees")
        .select("*")
        .eq("club_id", clubId)
        .eq("player_id", playerId)
        .order("due_date", { ascending: false })
        .limit(50),
      supabase
        .from("finance_player_fee_payments")
        .select("*, recorder:recorded_by(full_name), fee:player_fee_id(player_id)")
        .eq("club_id", clubId)
        .order("payment_date", { ascending: false })
        .limit(50),
    ]);

    const fees = (feesRes.data ?? []).map(mapFinancePlayerFee);
    const payments = (paymentsRes.data ?? [])
      .filter((p) => {
        const row = p as { fee: { player_id?: string } | null };
        return row.fee?.player_id === playerId;
      })
      .map((p) => mapFinanceFeePayment(p as Record<string, unknown>));

    const balance = fees.reduce((sum, f) => sum + f.amountRemaining, 0);

    return { playerId, playerName, balance, fees, payments };
  },
);

export function requireInventoryReadAccess(access: UserAccessContext) {
  if (!canReadInventory(access.roles)) redirect("/dashboard");
}

export function requireInventoryPortalAccess(access: UserAccessContext) {
  if (!canAccessInventoryPortal(access.roles)) redirect("/dashboard");
}

export const getInventoryCategories = cache(
  async (clubId: string = DEFAULT_CLUB_ID): Promise<InventoryCategory[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("inventory_categories")
      .select("*")
      .eq("club_id", clubId)
      .order("sort_order");
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapInventoryCategory);
  },
);

export const getInventoryItems = cache(
  async (clubId: string = DEFAULT_CLUB_ID, limit = 200): Promise<InventoryItem[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("inventory_items")
      .select("*, category:category_id(slug, name), supplier:supplier_id(name)")
      .eq("club_id", clubId)
      .order("name")
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapInventoryItem);
  },
);

export const getInventorySuppliers = cache(
  async (clubId: string = DEFAULT_CLUB_ID): Promise<InventorySupplier[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("inventory_suppliers")
      .select("*")
      .eq("club_id", clubId)
      .order("name");
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapInventorySupplier);
  },
);

export const getInventoryTransactions = cache(
  async (clubId: string = DEFAULT_CLUB_ID, limit = 100): Promise<InventoryTransaction[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("inventory_transactions")
      .select("*, item:item_id(name), player:player_id(first_name, last_name), profile:profile_id(full_name), issuer:issued_by(full_name)")
      .eq("club_id", clubId)
      .order("issue_date", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapInventoryTransaction);
  },
);

export const getInventoryReturns = cache(
  async (clubId: string = DEFAULT_CLUB_ID, limit = 100): Promise<InventoryReturn[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("inventory_returns")
      .select("*, item:item_id(name), recorder:recorded_by(full_name)")
      .eq("club_id", clubId)
      .order("return_date", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapInventoryReturn);
  },
);

export const getInventoryDamages = cache(
  async (clubId: string = DEFAULT_CLUB_ID, limit = 100): Promise<InventoryDamage[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("inventory_damages")
      .select("*, item:item_id(name), reporter:reported_by(full_name)")
      .eq("club_id", clubId)
      .order("damage_date", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapInventoryDamage);
  },
);

export const getInventoryPlayerKits = cache(
  async (clubId: string = DEFAULT_CLUB_ID): Promise<InventoryPlayerKit[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("inventory_player_kits")
      .select("*, player:player_id(first_name, last_name)")
      .eq("club_id", clubId)
      .order("jersey_number");
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapInventoryPlayerKit);
  },
);

export const getInventoryStocktakes = cache(
  async (clubId: string = DEFAULT_CLUB_ID): Promise<InventoryStocktake[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("inventory_stocktakes")
      .select("*, conductor:conducted_by(full_name), lines:inventory_stocktake_lines(difference)")
      .eq("club_id", clubId)
      .order("started_at", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapInventoryStocktake);
  },
);

export const getInventoryPurchaseOrders = cache(
  async (clubId: string = DEFAULT_CLUB_ID): Promise<InventoryPurchaseOrder[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("inventory_purchase_orders")
      .select("*, supplier:supplier_id(name), lines:inventory_purchase_order_lines(id)")
      .eq("club_id", clubId)
      .order("order_date", { ascending: false })
      .limit(50);
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapInventoryPurchaseOrder);
  },
);

export const getInventoryReports = cache(
  async (clubId: string = DEFAULT_CLUB_ID): Promise<InventoryReport[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("inventory_reports")
      .select("*, generator:generated_by(full_name)")
      .eq("club_id", clubId)
      .order("created_at", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return (data ?? []).map(mapInventoryReport);
  },
);

export const getInventoryReport = cache(
  async (reportId: string, clubId: string = DEFAULT_CLUB_ID): Promise<InventoryReport | null> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("inventory_reports")
      .select("*, generator:generated_by(full_name)")
      .eq("id", reportId)
      .eq("club_id", clubId)
      .maybeSingle();
    return data ? mapInventoryReport(data) : null;
  },
);

export const getInventoryDashboardStats = cache(
  async (clubId: string = DEFAULT_CLUB_ID): Promise<InventoryDashboardStats> => {
    const supabase = await createClient();
    const [statsRes, issuesRes, damagesRes] = await Promise.all([
      supabase.rpc("get_inventory_dashboard_stats", { p_club_id: clubId }),
      supabase
        .from("inventory_transactions")
        .select("*, item:item_id(name), player:player_id(first_name, last_name), profile:profile_id(full_name), issuer:issued_by(full_name)")
        .eq("club_id", clubId)
        .order("issue_date", { ascending: false })
        .limit(8),
      supabase
        .from("inventory_damages")
        .select("*, item:item_id(name), reporter:reported_by(full_name)")
        .eq("club_id", clubId)
        .in("status", ["reported", "in_repair", "replacement_needed"])
        .order("damage_date", { ascending: false })
        .limit(8),
    ]);

    const stats = statsRes.data as Record<string, number> | null;
    const base = {
      totalItems: Number(stats?.total_items ?? 0),
      totalQuantity: Number(stats?.total_quantity ?? 0),
      availableQuantity: Number(stats?.available_quantity ?? 0),
      issuedQuantity: Number(stats?.issued_quantity ?? 0),
      damagedQuantity: Number(stats?.damaged_quantity ?? 0),
      lowStockCount: Number(stats?.low_stock_count ?? 0),
      outOfStockCount: Number(stats?.out_of_stock_count ?? 0),
      ballsAvailable: Number(stats?.balls_available ?? 0),
      openDamagesCount: Number(stats?.open_damages_count ?? 0),
      openOrdersCount: Number(stats?.open_orders_count ?? 0),
    };

    return {
      ...base,
      alerts: buildInventoryAlerts(base),
      recentIssues: (issuesRes.data ?? []).map(mapInventoryTransaction),
      recentDamages: (damagesRes.data ?? []).map(mapInventoryDamage),
    };
  },
);

export const getPlayerInventoryPortalData = cache(
  async (clubId: string = DEFAULT_CLUB_ID): Promise<PlayerInventoryPortalData | null> => {
    const user = await getUser();
    if (!user) return null;

    const supabase = await createClient();
    const { data: profile } = await supabase
      .from("profiles")
      .select("email")
      .eq("id", user.id)
      .maybeSingle();

    if (!profile?.email) return null;

    const { data: playerRow } = await supabase
      .from("players")
      .select("id, first_name, last_name")
      .eq("club_id", clubId)
      .ilike("email", profile.email)
      .maybeSingle();

    if (!playerRow) return null;

    const playerId = String(playerRow.id);
    const playerName = `${playerRow.first_name ?? ""} ${playerRow.last_name ?? ""}`.trim();

    const [kitRes, assignmentsRes, issuesRes] = await Promise.all([
      supabase
        .from("inventory_player_kits")
        .select("*, player:player_id(first_name, last_name)")
        .eq("club_id", clubId)
        .eq("player_id", playerId)
        .maybeSingle(),
      supabase
        .from("inventory_kit_assignments")
        .select("*, player:player_id(first_name, last_name)")
        .eq("club_id", clubId)
        .eq("player_id", playerId)
        .order("assigned_date", { ascending: false })
        .limit(20),
      supabase
        .from("inventory_transactions")
        .select("*, item:item_id(name), player:player_id(first_name, last_name), issuer:issued_by(full_name)")
        .eq("club_id", clubId)
        .eq("player_id", playerId)
        .order("issue_date", { ascending: false })
        .limit(30),
    ]);

    const issues = (issuesRes.data ?? []).map(mapInventoryTransaction);
    const issueIds = issues.map((i) => i.id);

    const returnsRes = issueIds.length
      ? await supabase
          .from("inventory_returns")
          .select("*, item:item_id(name), recorder:recorded_by(full_name)")
          .eq("club_id", clubId)
          .in("transaction_id", issueIds)
          .order("return_date", { ascending: false })
          .limit(30)
      : { data: [] };

    const returns = (returnsRes.data ?? []).map((r) => mapInventoryReturn(r as Record<string, unknown>));

    return {
      playerId,
      playerName,
      kit: kitRes.data ? mapInventoryPlayerKit(kitRes.data) : null,
      assignments: (assignmentsRes.data ?? []).map(mapInventoryKitAssignment),
      issues,
      returns,
    };
  },
);

export function requireWebsiteCmsAccess(access: UserAccessContext) {
  if (!canReadWebsite(access.roles)) redirect("/dashboard");
}

export function requireWebsiteManageAccess(access: UserAccessContext) {
  if (!canManageWebsite(access.roles)) redirect("/website");
}

export const getWebsiteSettingsForCms = cache(
  async (clubId: string = DEFAULT_CLUB_ID): Promise<WebsiteSettings | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase.from("website_settings").select("*").eq("club_id", clubId).maybeSingle();
    if (error) throw new Error(error.message);
    if (!data) return null;
    return mapWebsiteSettings(data as Record<string, unknown>);
  },
);

export const getWebsiteNewsForCms = cache(
  async (clubId: string = DEFAULT_CLUB_ID): Promise<WebsiteNews[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("website_news")
      .select("*, author:author_id(full_name)")
      .eq("club_id", clubId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => mapWebsiteNews(row as Record<string, unknown>));
  },
);

export const getWebsiteGalleryAlbumsForCms = cache(
  async (clubId: string = DEFAULT_CLUB_ID): Promise<WebsiteGalleryAlbum[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("website_gallery_albums")
      .select("*")
      .eq("club_id", clubId)
      .order("sort_order");
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => mapWebsiteGalleryAlbum(row as Record<string, unknown>));
  },
);

export const getWebsiteSocialIntegrationsForCms = cache(
  async (clubId: string = DEFAULT_CLUB_ID): Promise<WebsiteSocialIntegration[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("website_social_integrations")
      .select("*")
      .eq("club_id", clubId)
      .order("platform");
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => mapWebsiteSocialIntegration(row as Record<string, unknown>));
  },
);

export function requireIntegrationReadAccess(access: UserAccessContext) {
  if (!canReadIntegrations(access.roles)) redirect("/dashboard");
}

export function requireIntegrationManageAccess(access: UserAccessContext) {
  if (!canManageIntegrations(access.roles)) redirect("/integrations");
}

export const getIntegrationsForClub = cache(
  async (clubId: string = DEFAULT_CLUB_ID): Promise<Integration[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("integrations")
      .select("*")
      .eq("club_id", clubId)
      .order("provider");
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => mapIntegration(row as Record<string, unknown>));
  },
);

export const getIntegrationSources = cache(
  async (clubId: string = DEFAULT_CLUB_ID, integrationId?: string): Promise<IntegrationSource[]> => {
    const supabase = await createClient();
    let query = supabase.from("integration_sources").select("*").eq("club_id", clubId).order("priority");
    if (integrationId) query = query.eq("integration_id", integrationId);
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => mapIntegrationSource(row as Record<string, unknown>));
  },
);

export const getIntegrationClubMappings = cache(
  async (clubId: string = DEFAULT_CLUB_ID): Promise<IntegrationClubMapping[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("integration_club_mappings")
      .select("*")
      .eq("club_id", clubId)
      .order("is_primary", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => mapIntegrationClubMapping(row as Record<string, unknown>));
  },
);

export const getExternalTeamsForIntegrations = cache(
  async (clubId: string = DEFAULT_CLUB_ID): Promise<ExternalTeam[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("external_teams")
      .select("*")
      .eq("club_id", clubId)
      .order("category_label");
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => mapExternalTeam(row as Record<string, unknown>));
  },
);

export const getIntegrationSyncLogs = cache(
  async (clubId: string = DEFAULT_CLUB_ID, limit = 30): Promise<SyncLog[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("sync_logs")
      .select("*, creator:created_by(full_name)")
      .eq("club_id", clubId)
      .order("started_at", { ascending: false })
      .limit(limit);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => mapSyncLog(row as Record<string, unknown>));
  },
);

export const getIntegrationSyncErrors = cache(
  async (clubId: string = DEFAULT_CLUB_ID): Promise<SyncLog[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("sync_logs")
      .select("*, creator:created_by(full_name)")
      .eq("club_id", clubId)
      .in("status", ["error", "partial"])
      .order("started_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => mapSyncLog(row as Record<string, unknown>));
  },
);

export const getIntegrationImports = cache(
  async (clubId: string = DEFAULT_CLUB_ID): Promise<IntegrationImport[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("integration_imports")
      .select("*")
      .eq("club_id", clubId)
      .order("created_at", { ascending: false })
      .limit(20);
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => mapIntegrationImport(row as Record<string, unknown>));
  },
);

export const getIntegrationConflicts = cache(
  async (clubId: string = DEFAULT_CLUB_ID, pendingOnly = false): Promise<SyncConflict[]> => {
    const supabase = await createClient();
    let query = supabase.from("sync_conflicts").select("*").eq("club_id", clubId).order("created_at", { ascending: false });
    if (pendingOnly) query = query.eq("status", "pending");
    const { data, error } = await query;
    if (error) throw new Error(error.message);
    return (data ?? []).map((row) => mapSyncConflict(row as Record<string, unknown>));
  },
);

export const getIntegrationDashboardStats = cache(
  async (clubId: string = DEFAULT_CLUB_ID): Promise<IntegrationDashboardStats> => {
    const [integrations, logs, conflicts] = await Promise.all([
      getIntegrationsForClub(clubId),
      getIntegrationSyncLogs(clubId, 10),
      getIntegrationConflicts(clubId, true),
    ]);
    const activeIntegrations = integrations.filter((i) => i.status === "ready").length;
    const recentErrors = logs.filter((l) => l.status === "error").length;
    const lastSyncAt =
      integrations
        .map((i) => i.lastSyncAt)
        .filter(Boolean)
        .sort()
        .reverse()[0] ?? null;
    return {
      activeIntegrations,
      pendingConflicts: conflicts.length,
      recentErrors,
      lastSyncAt,
    };
  },
);

export const getIntegrationByProvider = cache(
  async (provider: IntegrationProvider, clubId: string = DEFAULT_CLUB_ID): Promise<Integration | null> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("integrations")
      .select("*")
      .eq("club_id", clubId)
      .eq("provider", provider)
      .maybeSingle();
    if (error) throw new Error(error.message);
    return data ? mapIntegration(data as Record<string, unknown>) : null;
  },
);

export function requireLeagueReadAccess(access: UserAccessContext) {
  if (!canReadLeague(access.roles)) redirect("/dashboard");
}

export function requireLeagueManageAccess(access: UserAccessContext) {
  if (!canManageLeague(access.roles)) redirect("/league");
}
