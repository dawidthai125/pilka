import { unstable_cache } from "next/cache";

import {
  canReadAcademy,
  canReadFinance,
  canReadIntegrations,
  canReadInventory,
  canReadSponsors,
} from "@/config/permissions";
import { getClub, getTeams } from "@/lib/auth/session";
import { getClubBrandingName } from "@/lib/club/names";
import { computeTeamForm, aggregateTeamStats } from "@/lib/matches/mappers";
import { DEFAULT_SEASON } from "@/lib/matches/constants";
import { formatIsoDate, startOfWeek } from "@/lib/training/calendar";
import { createClient } from "@/lib/supabase/server";
import type { AiClubContext } from "@/types/ai";
import type { Player } from "@/types/players";
import type { ClubRole, UserAccessContext } from "@/types/rbac";
import { mapMatch } from "@/lib/matches/mappers";
import { buildSponsorAiContext } from "@/lib/sponsors/insights";
import { buildFinanceAiContext } from "@/lib/finance/insights";
import { buildInventoryAiContext } from "@/lib/inventory/insights";
import { buildIntegrationsAiContext } from "@/lib/integrations/insights";
import { buildAcademyAiContext } from "@/lib/academy/insights";

const MATCH_SELECT =
  "id, club_id, team_id, competition, season, round_number, match_date, match_time, home_team_name, away_team_name, stadium, stadium_address, status, home_score, away_score, formation, mvp_player_id, teams(name), mvp:mvp_player_id(first_name, last_name)";

const MAX_MATCHES_FOR_CONTEXT = 15;
const MAX_ATTENDANCE_ROWS = 800;

export type AiContextScope = Pick<UserAccessContext, "userId" | "clubId" | "roles">;

const EMPTY_SPONSORS: AiClubContext["sponsors"] = {
  totalSponsors: 0,
  activeContracts: 0,
  activeContractValue: 0,
  expiringWithin60Days: [],
  noContact30Days: [],
};

const EMPTY_FINANCE: AiClubContext["finance"] = {
  summary: { totalIncome: 0, totalExpenses: 0, balance: 0, overdueFeesCount: 0 },
  overduePlayerFees: [],
  unpaidSponsorEntries: [],
  recentExpenses: [],
};

const EMPTY_INVENTORY: AiClubContext["inventory"] = {
  summary: { totalItems: 0, lowStockCount: 0, damagedCount: 0, ballsAvailable: 0 },
  lowStockItems: [],
  openDamages: [],
  playersWithoutKit: [],
};

const EMPTY_INTEGRATIONS: AiClubContext["integrations"] = {
  integrations: [],
  recentSyncLogs: [],
  recentImports: [],
  pendingConflicts: [],
  summary: {
    activeIntegrations: 0,
    recentErrors: 0,
    partialSyncs: 0,
    pendingConflicts: 0,
  },
};

const EMPTY_ACADEMY: AiClubContext["academy"] = {
  groups: [],
  topTalents: [],
  regressions: [],
  recentAssessments: [],
  activeGoals: [],
  recentTransitions: [],
  scoutingProspects: [],
  scoutingReports: [],
  summary: {},
};

function scopeCacheKey(roles: ClubRole[]): string {
  return [...roles].sort().join(",");
}

export async function buildAiClubContext(access: AiContextScope): Promise<AiClubContext> {
  const roleKey = scopeCacheKey(access.roles);

  return unstable_cache(
    () => buildAiClubContextUncached(access),
    ["ai-club-context", access.clubId, access.userId, roleKey],
    { revalidate: 300, tags: [`ai-context-${access.clubId}-${access.userId}`] },
  )();
}

async function buildAiClubContextUncached(access: AiContextScope): Promise<AiClubContext> {
  const clubId = access.clubId;
  const supabase = await createClient();
  const [club, teams, playersRes] = await Promise.all([
    getClub(clubId),
    getTeams(clubId),
    supabase
      .from("players")
      .select("id, team_id, first_name, last_name, status")
      .eq("club_id", clubId),
  ]);

  const players = (playersRes.data ?? []).map((row) => ({
    id: row.id,
    clubId,
    teamId: row.team_id,
    firstName: row.first_name,
    lastName: row.last_name,
    status: row.status as Player["status"],
    photoUrl: null,
    dateOfBirth: null,
    phone: null,
    email: null,
    address: null,
    city: null,
    postalCode: null,
    jerseyNumber: null,
    primaryPosition: null,
    secondaryPosition: null,
    dominantFoot: null,
    heightCm: null,
    weightKg: null,
    joinedAt: null,
    leftAt: null,
    teamName: null,
  }));

  const clubName = club ? getClubBrandingName(club) : "Klub";
  const seniorTeam = teams.find((t) => t.category === "seniors") ?? teams[0];
  const teamId = seniorTeam?.id;
  const seniorPlayerIds = players
    .filter((p) => (teamId ? p.teamId === teamId : true))
    .map((p) => p.id);

  const now = new Date();
  const weekStart = formatIsoDate(startOfWeek(now));
  const weekEnd = formatIsoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 7));
  const docDeadline = formatIsoDate(new Date(now.getFullYear(), now.getMonth(), now.getDate() + 30));

  const { data: weekTrainings } = await supabase
    .from("trainings")
    .select("id")
    .eq("club_id", clubId)
    .gte("training_date", weekStart)
    .lte("training_date", weekEnd)
    .eq("status", "planned");

  const weekTrainingIds = (weekTrainings ?? []).map((t) => t.id);

  const [
    attendanceRows,
    availabilityUnknown,
    matchesCompleted,
    playerStats,
    expiringDocs,
    injuries,
  ] = await Promise.all([
    seniorPlayerIds.length
      ? supabase
          .from("training_attendance")
          .select("player_id, status")
          .eq("club_id", clubId)
          .in("player_id", seniorPlayerIds)
          .limit(MAX_ATTENDANCE_ROWS)
      : Promise.resolve({ data: [], error: null }),
    weekTrainingIds.length
      ? supabase
          .from("training_availability")
          .select("id", { count: "exact", head: true })
          .eq("club_id", clubId)
          .eq("status", "unknown")
          .in("training_id", weekTrainingIds)
      : Promise.resolve({ count: 0, error: null }),
    teamId
      ? supabase
          .from("matches")
          .select(MATCH_SELECT)
          .eq("club_id", clubId)
          .eq("team_id", teamId)
          .eq("season", DEFAULT_SEASON)
          .eq("status", "completed")
          .order("match_date", { ascending: false })
          .limit(MAX_MATCHES_FOR_CONTEXT)
      : Promise.resolve({ data: [], error: null }),
    supabase
      .from("player_stats")
      .select("player_id, goals, matches_played")
      .eq("club_id", clubId)
      .eq("season", DEFAULT_SEASON)
      .order("goals", { ascending: false })
      .limit(5),
    supabase
      .from("player_documents")
      .select("player_id")
      .eq("club_id", clubId)
      .lte("expires_at", docDeadline)
      .gte("expires_at", formatIsoDate(now)),
    supabase
      .from("players")
      .select("id")
      .eq("club_id", clubId)
      .eq("status", "injured"),
  ]);

  const playerMap = new Map(
    players.map((p) => [p.id, `${p.firstName} ${p.lastName}`]),
  );

  const attendanceByPlayer = new Map<string, { total: number; present: number }>();
  for (const row of attendanceRows.data ?? []) {
    const current = attendanceByPlayer.get(row.player_id) ?? { total: 0, present: 0 };
    current.total += 1;
    if (row.status === "present" || row.status === "late" || row.status === "excused") {
      current.present += 1;
    }
    attendanceByPlayer.set(row.player_id, current);
  }

  const rates = players
    .filter((p) => (teamId ? p.teamId === teamId : true))
    .map((p) => {
      const stats = attendanceByPlayer.get(p.id);
      const rate = stats && stats.total > 0 ? Math.round((stats.present / stats.total) * 100) : 0;
      return { name: `${p.firstName} ${p.lastName}`, rate };
    })
    .sort((a, b) => a.rate - b.rate);

  const completedMatches = (matchesCompleted.data ?? []).map(mapMatch);
  const form = teamId
    ? computeTeamForm(completedMatches, clubName)
    : { last5: "—", last10: "—", results: [] };
  const teamStats = teamId
    ? aggregateTeamStats(completedMatches, clubName)
    : { played: 0, wins: 0, draws: 0, losses: 0, goalsFor: 0, goalsAgainst: 0 };

  const lastMatch = completedMatches[0];
  const avgRate =
    rates.length > 0
      ? Math.round(rates.reduce((sum, r) => sum + r.rate, 0) / rates.length)
      : 0;

  const topScorers = (playerStats.data ?? []).map((row) => ({
    name: playerMap.get(row.player_id) ?? "Zawodnik",
    goals: row.goals,
  }));

  const { roles } = access;
  const [sponsors, finance, inventory, integrations, academy] = await Promise.all([
    canReadSponsors(roles) ? buildSponsorAiContext(clubId) : Promise.resolve(EMPTY_SPONSORS),
    canReadFinance(roles) ? buildFinanceAiContext(clubId) : Promise.resolve(EMPTY_FINANCE),
    canReadInventory(roles) ? buildInventoryAiContext(clubId) : Promise.resolve(EMPTY_INVENTORY),
    canReadIntegrations(roles)
      ? buildIntegrationsAiContext(clubId)
      : Promise.resolve(EMPTY_INTEGRATIONS),
    canReadAcademy(roles) ? buildAcademyAiContext(clubId) : Promise.resolve(EMPTY_ACADEMY),
  ]);

  return {
    clubName,
    generatedAt: now.toISOString(),
    players: {
      total: seniorPlayerIds.length,
      injured: injuries.data?.length ?? 0,
      suspended: players.filter((p) => p.status === "suspended").length,
      expiringDocuments: new Set((expiringDocs.data ?? []).map((d) => d.player_id)).size,
      topScorers,
      lowestAttendance: rates.slice(0, 5),
    },
    trainings: {
      thisWeekCount: weekTrainingIds.length,
      avgAttendanceRate: avgRate,
      missingAvailabilityCount: availabilityUnknown.count ?? 0,
    },
    matches: {
      completedCount: teamStats.played,
      teamFormLast5: form.last5,
      lastMatch: lastMatch
        ? {
            home: lastMatch.homeTeamName,
            away: lastMatch.awayTeamName,
            score: `${lastMatch.homeScore}:${lastMatch.awayScore}`,
            date: lastMatch.matchDate,
          }
        : null,
    },
    sponsors,
    finance,
    inventory,
    integrations,
    academy,
  };
}

export function serializeAiContext(context: AiClubContext): string {
  return JSON.stringify(context, null, 2);
}
