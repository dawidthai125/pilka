import {
  canReadContent,
  canReadFinance,
  canReadInventory,
  canReadLeague,
  canReadSponsors,
} from "@/config/permissions";
import { buildAiClubContext } from "@/lib/ai/context";
import { buildLeagueAiInsights, formatLeagueInsightsSummary } from "@/lib/league/insights";
import { getPlayers, getTeams } from "@/lib/auth/session";
import type { AiClubContext } from "@/types/ai";
import { DEFAULT_SEASON } from "@/lib/matches/constants";
import { createClient } from "@/lib/supabase/server";
import type { UserAccessContext } from "@/types/rbac";
import type { AiToolName } from "@/types/ai-agent";

const MATCH_SELECT =
  "id, club_id, team_id, competition, season, round_number, match_date, match_time, home_team_name, away_team_name, status, home_score, away_score";

export async function executeReadTool(
  toolName: AiToolName,
  input: Record<string, unknown>,
  access: UserAccessContext,
  existingContext?: AiClubContext,
): Promise<unknown> {
  const ctx = existingContext ?? (await buildAiClubContext(access));
  const supabase = await createClient();
  const clubId = access.clubId;

  switch (toolName) {
    case "getPlayers": {
      const minRate = Number(input.minAttendanceRate ?? 60);
      const players = await getPlayers(clubId);
      const lowAttendance = ctx.players.lowestAttendance.filter((p) => p.rate < minRate);
      return {
        total: ctx.players.total,
        injured: ctx.players.injured,
        expiringDocuments: ctx.players.expiringDocuments,
        topScorers: ctx.players.topScorers,
        lowAttendance,
        players: lowAttendance.map((p) => p.name),
        allCount: players.length,
      };
    }
    case "getMatches": {
      const { data } = await supabase
        .from("matches")
        .select(MATCH_SELECT)
        .eq("club_id", clubId)
        .order("match_date", { ascending: false })
        .limit(15);
      return {
        form: ctx.matches.teamFormLast5,
        lastMatch: ctx.matches.lastMatch,
        recent: (data ?? []).map((row) => ({
          id: row.id,
          homeTeamName: row.home_team_name,
          awayTeamName: row.away_team_name,
          matchDate: row.match_date,
          status: row.status,
          homeScore: row.home_score,
          awayScore: row.away_score,
        })),
      };
    }
    case "getTrainings": {
      const { data } = await supabase
        .from("trainings")
        .select("id, name, training_date, start_time, end_time, status, location")
        .eq("club_id", clubId)
        .order("training_date", { ascending: false })
        .limit(10);
      return {
        thisWeekCount: ctx.trainings.thisWeekCount,
        avgAttendanceRate: ctx.trainings.avgAttendanceRate,
        missingAvailability: ctx.trainings.missingAvailabilityCount,
        recent: data ?? [],
      };
    }
    case "getSponsors": {
      if (!canReadSponsors(access.roles)) {
        throw new Error("Brak dostępu do sponsorów.");
      }
      return {
        total: ctx.sponsors.totalSponsors,
        activeContracts: ctx.sponsors.activeContracts,
        noContact30Days: ctx.sponsors.noContact30Days,
        expiringWithin60Days: ctx.sponsors.expiringWithin60Days,
      };
    }
    case "getFinances": {
      if (!canReadFinance(access.roles)) {
        throw new Error("Brak dostępu do finansów.");
      }
      return ctx.finance;
    }
    case "getDocuments": {
      const days = Number(input.withinDays ?? 30);
      const deadline = new Date();
      deadline.setDate(deadline.getDate() + days);
      const { data: docs } = await supabase
        .from("player_documents")
        .select("id, player_id, document_type, expires_at")
        .eq("club_id", clubId)
        .lte("expires_at", deadline.toISOString().slice(0, 10))
        .gte("expires_at", new Date().toISOString().slice(0, 10));
      const players = await getPlayers(clubId);
      const playerMap = new Map(players.map((p) => [p.id, `${p.firstName} ${p.lastName}`]));
      return {
        expiringCount: ctx.players.expiringDocuments,
        documents: (docs ?? []).map((d) => ({
          type: d.document_type,
          expiresAt: d.expires_at,
          player: playerMap.get(d.player_id) ?? "Zawodnik",
        })),
      };
    }
    case "getInventory": {
      if (!canReadInventory(access.roles)) {
        throw new Error("Brak dostępu do magazynu.");
      }
      return ctx.inventory;
    }
    case "getVideos": {
      const { data } = await supabase
        .from("videos")
        .select("id, title, category, job_status, view_count, created_at")
        .eq("club_id", clubId)
        .order("created_at", { ascending: false })
        .limit(20);
      return {
        total: data?.length ?? 0,
        pending: (data ?? []).filter((v) => v.job_status === "pending" || v.job_status === "processing").length,
        videos: (data ?? []).map((v) => ({
          id: v.id,
          title: v.title,
          category: v.category,
          status: v.job_status,
          views: v.view_count,
        })),
      };
    }
    case "getContentPosts": {
      if (!canReadContent(access.roles)) {
        throw new Error("Brak dostępu do Content Hub.");
      }
      const { data } = await supabase
        .from("content_posts")
        .select("id, title, content_type, status, scheduled_at, published_at, created_at")
        .eq("club_id", clubId)
        .order("created_at", { ascending: false })
        .limit(20);
      return {
        total: data?.length ?? 0,
        pendingApproval: (data ?? []).filter((p) => p.status === "pending_approval").length,
        posts: (data ?? []).map((p) => ({
          id: p.id,
          title: p.title,
          type: p.content_type,
          status: p.status,
        })),
      };
    }
    case "getLeagueInsights": {
      if (!canReadLeague(access.roles)) {
        throw new Error("Brak dostępu do League Hub.");
      }
      const competitionId = input.competitionId ? String(input.competitionId) : undefined;
      const insights = await buildLeagueAiInsights(clubId, competitionId);
      if (!insights) return { message: "Brak danych ligowych — skonfiguruj League Hub." };
      return {
        summary: formatLeagueInsightsSummary(insights),
        ...insights,
      };
    }
    default:
      throw new Error(`Narzędzie ${toolName} nie jest narzędziem odczytu.`);
  }
}

export async function resolveDefaultTeamId(clubId: string): Promise<string | null> {
  const teams = await getTeams(clubId);
  const senior = teams.find((t) => t.category === "seniors" && t.isActive);
  return senior?.id ?? teams.find((t) => t.isActive)?.id ?? null;
}

export { DEFAULT_SEASON };
