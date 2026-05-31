import { DEFAULT_CLUB_ID, getClub, getPlayers, getTeams } from "@/lib/auth/session";
import { getClubBrandingName } from "@/lib/club/names";
import { computeTeamForm, aggregateTeamStats } from "@/lib/matches/mappers";
import { DEFAULT_SEASON } from "@/lib/matches/constants";
import { formatIsoDate, startOfWeek } from "@/lib/training/calendar";
import { createClient } from "@/lib/supabase/server";
import type { AiClubContext } from "@/types/ai";
import { mapMatch } from "@/lib/matches/mappers";
import { buildSponsorAiContext } from "@/lib/sponsors/insights";
import { buildFinanceAiContext } from "@/lib/finance/insights";

const MATCH_SELECT =
  "id, club_id, team_id, competition, season, round_number, match_date, match_time, home_team_name, away_team_name, stadium, stadium_address, status, home_score, away_score, formation, mvp_player_id, coach_notes, teams(name), mvp:mvp_player_id(first_name, last_name)";

const MAX_MATCHES_FOR_CONTEXT = 15;
const MAX_ATTENDANCE_ROWS = 2000;

export async function buildAiClubContext(
  clubId: string = DEFAULT_CLUB_ID,
): Promise<AiClubContext> {
  const [club, players, teams] = await Promise.all([
    getClub(clubId),
    getPlayers(clubId),
    getTeams(clubId),
  ]);

  const clubName = club ? getClubBrandingName(club) : "Klub";
  const seniorTeam = teams.find((t) => t.category === "seniors") ?? teams[0];
  const teamId = seniorTeam?.id;
  const seniorPlayerIds = players
    .filter((p) => (teamId ? p.teamId === teamId : true))
    .map((p) => p.id);

  const supabase = await createClient();
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

  const sponsors = await buildSponsorAiContext(clubId);
  const finance = await buildFinanceAiContext(clubId);

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
  };
}

export function serializeAiContext(context: AiClubContext): string {
  return JSON.stringify(context, null, 2);
}
