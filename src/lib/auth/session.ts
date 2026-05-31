import { cache } from "react";
import { redirect } from "next/navigation";

import { ROLE_LABELS } from "@/config/permissions";
import { buildAccessContext } from "@/lib/rbac/permissions";
import { hasPermission } from "@/lib/rbac/permissions";
import { parseClubRole } from "@/lib/validators";
import { createClient, getUser } from "@/lib/supabase/server";
import { siteConfig } from "@/config/site";
import type { Club, ClubRole, Profile, Team, UserAccessContext } from "@/types/rbac";
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
import { canManageTrainings, canReadAi } from "@/config/permissions";
import { sanitizeIlikeTerm } from "@/lib/ai/sanitize";

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
  const [profile, access, club, teams] = await Promise.all([
    getProfile(user.id),
    getAccessContext(user.id, clubId),
    getClub(clubId),
    getTeams(clubId),
  ]);

  if (!access || !club) {
    redirect("/login?error=no_membership");
  }

  await syncTrainingReminders(clubId);

  const unreadNotifications = await getUnreadNotificationCount(clubId);

  return {
    user,
    profile,
    access,
    club,
    teams,
    siteName: siteConfig.name,
    unreadNotifications,
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

const MATCH_SELECT =
  "id, club_id, team_id, competition, season, round_number, match_date, match_time, home_team_name, away_team_name, stadium, stadium_address, status, home_score, away_score, formation, mvp_player_id, coach_notes, teams(name), mvp:mvp_player_id(first_name, last_name)";

const TRAINING_SELECT =
  "id, club_id, team_id, name, training_date, start_time, end_time, location, description, coach_user_id, status, teams(name), profiles:coach_user_id(full_name)";

const PLAYER_SELECT =
  "id, club_id, team_id, first_name, last_name, photo_url, date_of_birth, phone, email, address, city, postal_code, jersey_number, primary_position, secondary_position, dominant_foot, height_cm, weight_kg, status, joined_at, left_at";

async function loadTeamNameMap(clubId: string) {
  const supabase = await createClient();
  const { data } = await supabase.from("teams").select("id, name").eq("club_id", clubId);
  return new Map(data?.map((team) => [team.id, team.name]) ?? []);
}

const loadTeamNameMapCached = cache(loadTeamNameMap);

function attachTeamName(player: Player, teamMap: Map<string, string>): Player {
  return {
    ...player,
    teamName: player.teamId ? teamMap.get(player.teamId) ?? null : null,
  };
}

export const getPlayers = cache(async (clubId: string = DEFAULT_CLUB_ID): Promise<Player[]> => {
  const supabase = await createClient();
  const [teamMap, playersRes] = await Promise.all([
    loadTeamNameMapCached(clubId),
    supabase
      .from("players")
      .select(PLAYER_SELECT)
      .eq("club_id", clubId)
      .order("last_name")
      .order("first_name"),
  ]);

  if (playersRes.error) throw new Error(playersRes.error.message);
  return (playersRes.data ?? []).map((row) =>
    attachTeamName(mapPlayer(row), teamMap),
  );
});

export const getPlayerCounts = cache(
  async (clubId: string = DEFAULT_CLUB_ID): Promise<{ total: number; active: number }> => {
    const supabase = await createClient();
    const [{ count: total, error: totalError }, { count: active, error: activeError }] =
      await Promise.all([
        supabase
          .from("players")
          .select("*", { count: "exact", head: true })
          .eq("club_id", clubId),
        supabase
          .from("players")
          .select("*", { count: "exact", head: true })
          .eq("club_id", clubId)
          .eq("status", "active"),
      ]);

    if (totalError) throw new Error(totalError.message);
    if (activeError) throw new Error(activeError.message);

    return { total: total ?? 0, active: active ?? 0 };
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
      const profile = await getProfile(user.id);
      if (profile?.email) {
        const match = roster.find(
          (player) => player.email?.toLowerCase() === profile.email.toLowerCase(),
        );
        myPlayerId = match?.id ?? null;
      }
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
  const members = await getClubMembers(clubId);
  return members.filter(
    (member) =>
      member.role === "coach" ||
      member.role === "owner" ||
      member.role === "president" ||
      member.role === "sports_director",
  );
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
      getAttendanceStats("season", clubId, match.teamId),
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

export const getMatchFilterOptions = cache(async (clubId: string = DEFAULT_CLUB_ID) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("matches")
    .select("season, competition")
    .eq("club_id", clubId);

  const seasons = [...new Set((data ?? []).map((r) => r.season))].sort();
  const competitions = [...new Set((data ?? []).map((r) => r.competition))].sort();
  return { seasons, competitions };
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

    const { data, error } = await query;
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
