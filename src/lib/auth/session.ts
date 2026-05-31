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

  return {
    user,
    profile,
    access,
    club,
    teams,
    siteName: siteConfig.name,
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
