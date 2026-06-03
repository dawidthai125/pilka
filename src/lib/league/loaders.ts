import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import {
  mapLeagueCompetition,
  mapLeagueConflict,
  mapLeagueMatch,
  mapLeaguePlayerRegistry,
  mapLeagueSeason,
  mapLeagueSource,
  mapLeagueSyncJob,
  mapLeagueSyncLog,
  mapLeagueTableRow,
  mapLeagueTeam,
} from "@/lib/league/mappers";
import type { LeagueDashboardStats, LeagueTableRow } from "@/types/league";

export const getActiveLeagueSeason = cache(async (clubId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("league_seasons")
    .select("*")
    .eq("club_id", clubId)
    .eq("is_active", true)
    .order("name", { ascending: false })
    .limit(1)
    .maybeSingle();
  return data ? mapLeagueSeason(data as Record<string, unknown>) : null;
});

export const getLeagueSeasons = cache(async (clubId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("league_seasons")
    .select("*")
    .eq("club_id", clubId)
    .order("name", { ascending: false });
  return (data ?? []).map((r) => mapLeagueSeason(r as Record<string, unknown>));
});

export const getLeagueCompetitions = cache(async (clubId: string, seasonId?: string) => {
  const supabase = await createClient();
  let q = supabase
    .from("league_competitions")
    .select("*, season:league_seasons(name)")
    .eq("club_id", clubId)
    .eq("is_active", true);
  if (seasonId) q = q.eq("season_id", seasonId);
  const { data } = await q.order("name");
  return (data ?? []).map((r) => mapLeagueCompetition(r as Record<string, unknown>));
});

export const getLeagueSources = cache(async (clubId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("league_sources")
    .select("*")
    .eq("club_id", clubId)
    .order("name");
  return (data ?? []).map((r) => mapLeagueSource(r as Record<string, unknown>));
});

export const getLeagueTeams = cache(async (clubId: string, competitionId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("league_teams")
    .select("*")
    .eq("club_id", clubId)
    .eq("competition_id", competitionId)
    .order("is_own_club", { ascending: false });
  return (data ?? []).map((r) => mapLeagueTeam(r as Record<string, unknown>));
});

export const getLatestLeagueTable = cache(
  async (clubId: string, competitionId: string): Promise<LeagueTableRow[]> => {
    const supabase = await createClient();
    const { data: latest } = await supabase
      .from("league_tables")
      .select("snapshot_at")
      .eq("club_id", clubId)
      .eq("competition_id", competitionId)
      .order("snapshot_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (!latest?.snapshot_at) return [];

    const { data } = await supabase
      .from("league_tables")
      .select("*")
      .eq("club_id", clubId)
      .eq("competition_id", competitionId)
      .eq("snapshot_at", latest.snapshot_at)
      .order("position");

    return (data ?? []).map((r) => mapLeagueTableRow(r as Record<string, unknown>));
  },
);

export const getLeagueFixtures = cache(async (clubId: string, competitionId: string, limit = 50) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("league_matches")
    .select("*")
    .eq("club_id", clubId)
    .eq("competition_id", competitionId)
    .order("match_date", { ascending: true })
    .limit(limit);
  return (data ?? []).map((r) => mapLeagueMatch(r as Record<string, unknown>));
});

export const getLeagueRecentResults = cache(async (clubId: string, competitionId: string, limit = 10) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("league_matches")
    .select("*")
    .eq("club_id", clubId)
    .eq("competition_id", competitionId)
    .eq("status", "completed")
    .order("match_date", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => mapLeagueMatch(r as Record<string, unknown>));
});

export const getLeagueUpcoming = cache(async (clubId: string, competitionId: string, limit = 10) => {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const { data } = await supabase
    .from("league_matches")
    .select("*")
    .eq("club_id", clubId)
    .eq("competition_id", competitionId)
    .gte("match_date", today)
    .neq("status", "completed")
    .order("match_date", { ascending: true })
    .limit(limit);
  return (data ?? []).map((r) => mapLeagueMatch(r as Record<string, unknown>));
});

export const getLeagueSyncJobs = cache(async (clubId: string, limit = 20) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("league_sync_jobs")
    .select("*")
    .eq("club_id", clubId)
    .order("created_at", { ascending: false })
    .limit(limit);
  return (data ?? []).map((r) => mapLeagueSyncJob(r as Record<string, unknown>));
});

export const getLeagueSyncLogs = cache(async (clubId: string, jobId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("league_sync_logs")
    .select("*")
    .eq("club_id", clubId)
    .eq("job_id", jobId)
    .order("created_at", { ascending: true });
  return (data ?? []).map((r) => mapLeagueSyncLog(r as Record<string, unknown>));
});

export const getLeagueConflicts = cache(async (clubId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("league_conflicts")
    .select("*")
    .eq("club_id", clubId)
    .eq("status", "pending")
    .order("created_at", { ascending: false });

  const rows = data ?? [];
  const matchIds = [...new Set(rows.map((row) => String(row.league_match_id)).filter(Boolean))];

  const { data: matches } = matchIds.length
    ? await supabase
        .from("league_matches")
        .select("id, home_team_name, away_team_name, match_date")
        .in("id", matchIds)
    : { data: [] };

  const matchMap = new Map((matches ?? []).map((m) => [String(m.id), m]));

  return rows.map((row) =>
    mapLeagueConflict({
      ...row,
      league_match: matchMap.get(String(row.league_match_id)) ?? null,
    } as Record<string, unknown>),
  );
});

export const getLeaguePlayerRegistry = cache(async (clubId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("league_player_registry")
    .select(
      "*, player:players!player_id(first_name, last_name), suggested_player:players!suggested_player_id(first_name, last_name)",
    )
    .eq("club_id", clubId)
    .order("league_player_name");
  return (data ?? []).map((r) => mapLeaguePlayerRegistry(r as Record<string, unknown>));
});

export const getLeagueDashboardStats = cache(
  async (clubId: string, competitionId: string): Promise<LeagueDashboardStats> => {
    const supabase = await createClient();
    const today = new Date().toISOString().slice(0, 10);

    const [pendingSync, pendingConflicts, completed, upcoming, table] = await Promise.all([
      supabase
        .from("league_sync_jobs")
        .select("id", { count: "exact", head: true })
        .eq("club_id", clubId)
        .in("status", ["pending", "running"]),
      supabase
        .from("league_conflicts")
        .select("id", { count: "exact", head: true })
        .eq("club_id", clubId)
        .eq("status", "pending"),
      supabase
        .from("league_matches")
        .select("id", { count: "exact", head: true })
        .eq("club_id", clubId)
        .eq("competition_id", competitionId)
        .eq("status", "completed"),
      supabase
        .from("league_matches")
        .select("id", { count: "exact", head: true })
        .eq("club_id", clubId)
        .eq("competition_id", competitionId)
        .gte("match_date", today)
        .neq("status", "completed"),
      getLatestLeagueTable(clubId, competitionId),
    ]);

    const own = table.find((r) => r.isOwnClub);

    return {
      pendingSync: pendingSync.count ?? 0,
      pendingConflicts: pendingConflicts.count ?? 0,
      completedMatches: completed.count ?? 0,
      upcomingMatches: upcoming.count ?? 0,
      ownTeamPoints: own?.points ?? null,
      ownTeamPosition: own?.position ?? null,
      table,
    };
  },
);
