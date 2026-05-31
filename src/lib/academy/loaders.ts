import { cache } from "react";
import { redirect } from "next/navigation";

import {
  canManageAcademy,
  canManageScouting,
  canReadAcademy,
  canReadOwnDevelopment,
} from "@/config/permissions";
import {
  computeTalentRanking,
  mapAcademyGroup,
  mapFitnessTest,
  mapOpponentAnalysis,
  mapPlayerAssessment,
  mapPlayerDevelopment,
  mapPlayerDevelopmentHistory,
  mapPlayerGoal,
  mapPlayerTeamTransition,
  mapScoutingClub,
  mapScoutingPlayer,
  mapScoutingReport,
} from "@/lib/academy/mappers";
import { playerFullName } from "@/lib/players/mappers";
import { createClient } from "@/lib/supabase/server";
import type {
  AcademyDashboardStats,
  AcademyGroup,
  OpponentAnalysis,
  PlayerDevelopmentDetail,
  ScoutingClub,
  ScoutingPlayer,
  ScoutingReport,
  TalentRankingEntry,
} from "@/types/academy";
import type { UserAccessContext } from "@/types/rbac";

const DEFAULT_CLUB_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

export function requireAcademyReadAccess(access: UserAccessContext) {
  if (!canReadAcademy(access.roles) && !canReadOwnDevelopment(access.roles)) {
    redirect("/dashboard");
  }
}

export function requireAcademyManageAccess(access: UserAccessContext) {
  if (!canManageAcademy(access.roles)) redirect("/academy");
}

export function requireScoutingManageAccess(access: UserAccessContext) {
  if (!canManageScouting(access.roles)) redirect("/academy/scouting");
}

export const getAcademyGroups = cache(
  async (clubId: string = DEFAULT_CLUB_ID): Promise<AcademyGroup[]> => {
    const supabase = await createClient();
    const [{ data, error }, { data: players }] = await Promise.all([
      supabase
        .from("academy_groups")
        .select("*, team:team_id(name)")
        .eq("club_id", clubId)
        .order("age_group"),
      supabase
        .from("players")
        .select("team_id")
        .eq("club_id", clubId)
        .eq("status", "active"),
    ]);
    if (error) throw new Error(error.message);

    const groups = (data ?? []).map((row) => mapAcademyGroup(row as Record<string, unknown>));

    const countByTeam = new Map<string, number>();
    for (const p of players ?? []) {
      if (p.team_id) countByTeam.set(String(p.team_id), (countByTeam.get(String(p.team_id)) ?? 0) + 1);
    }

    return groups.map((g) => ({
      ...g,
      playerCount: g.teamId ? countByTeam.get(g.teamId) ?? 0 : 0,
    }));
  },
);

export const getAcademyDashboardStats = cache(
  async (clubId: string = DEFAULT_CLUB_ID): Promise<AcademyDashboardStats> => {
    const supabase = await createClient();
    const [groups, dev, goals, scouting] = await Promise.all([
      supabase.from("academy_groups").select("id").eq("club_id", clubId),
      supabase.from("player_development").select("id").eq("club_id", clubId),
      supabase.from("player_goals").select("id").eq("club_id", clubId).eq("status", "active"),
      supabase.from("scouting_players").select("id, status").eq("club_id", clubId),
    ]);
    return {
      groupCount: (groups.data ?? []).length,
      assessedPlayers: (dev.data ?? []).length,
      activeGoals: (goals.data ?? []).length,
      scoutingProspects: (scouting.data ?? []).length,
      pendingRecommendations: (scouting.data ?? []).filter((s) => s.status === "recommended").length,
    };
  },
);

export const getPlayerDevelopmentDetail = cache(
  async (playerId: string, clubId: string = DEFAULT_CLUB_ID): Promise<PlayerDevelopmentDetail | null> => {
    const supabase = await createClient();
    const [dev, history, assessments, goals, tests, transitions] = await Promise.all([
      supabase.from("player_development").select("*").eq("club_id", clubId).eq("player_id", playerId).maybeSingle(),
      supabase
        .from("player_development_history")
        .select("*")
        .eq("club_id", clubId)
        .eq("player_id", playerId)
        .order("recorded_at", { ascending: true }),
      supabase
        .from("player_assessments")
        .select("*, assessor:assessor_id(full_name)")
        .eq("club_id", clubId)
        .eq("player_id", playerId)
        .order("assessed_at", { ascending: true }),
      supabase
        .from("player_goals")
        .select("*")
        .eq("club_id", clubId)
        .eq("player_id", playerId)
        .order("created_at", { ascending: false }),
      supabase
        .from("fitness_tests")
        .select("*")
        .eq("club_id", clubId)
        .eq("player_id", playerId)
        .order("test_date", { ascending: true }),
      supabase
        .from("player_team_transitions")
        .select("*, decision_by_profile:decision_by(full_name)")
        .eq("club_id", clubId)
        .eq("player_id", playerId)
        .order("transition_date", { ascending: false }),
    ]);

    return {
      development: dev.data ? mapPlayerDevelopment(dev.data as Record<string, unknown>) : null,
      history: (history.data ?? []).map((r) => mapPlayerDevelopmentHistory(r as Record<string, unknown>)),
      assessments: (assessments.data ?? []).map((r) => mapPlayerAssessment(r as Record<string, unknown>)),
      goals: (goals.data ?? []).map((r) => mapPlayerGoal(r as Record<string, unknown>)),
      fitnessTests: (tests.data ?? []).map((r) => mapFitnessTest(r as Record<string, unknown>)),
      transitions: (transitions.data ?? []).map((r) => mapPlayerTeamTransition(r as Record<string, unknown>)),
    };
  },
);

export const getTalentRanking = cache(
  async (clubId: string = DEFAULT_CLUB_ID): Promise<TalentRankingEntry[]> => {
    const supabase = await createClient();
    const [playersRes, developmentsRes, assessmentsRes, historyRes] = await Promise.all([
      supabase
        .from("players")
        .select("id, first_name, last_name, team_id, teams(name)")
        .eq("club_id", clubId)
        .eq("status", "active"),
      supabase
        .from("player_development")
        .select("player_id, potential, overall_rating, development_level")
        .eq("club_id", clubId),
      supabase
        .from("player_assessments")
        .select("player_id, average_score")
        .eq("club_id", clubId),
      supabase
        .from("player_development_history")
        .select("player_id, overall_rating, recorded_at")
        .eq("club_id", clubId)
        .order("recorded_at", { ascending: true }),
    ]);

    const players = playersRes.data;
    const developments = developmentsRes.data;
    const assessments = assessmentsRes.data;
    const history = historyRes.data;

    const devMap = new Map((developments ?? []).map((d) => [String(d.player_id), d]));
    const assessMap = new Map<string, number[]>();
    for (const a of assessments ?? []) {
      const id = String(a.player_id);
      const list = assessMap.get(id) ?? [];
      list.push(Number(a.average_score));
      assessMap.set(id, list);
    }

    const historyMap = new Map<string, number[]>();
    for (const h of history ?? []) {
      const id = String(h.player_id);
      const list = historyMap.get(id) ?? [];
      list.push(Number(h.overall_rating));
      historyMap.set(id, list);
    }

    const entries = (players ?? []).map((p) => {
      const id = String(p.id);
      const dev = devMap.get(id);
      const assessList = assessMap.get(id) ?? [];
      const hist = historyMap.get(id) ?? [];
      const avgAssess = assessList.length
        ? assessList.reduce((a, b) => a + b, 0) / assessList.length
        : 0;
      const progressScore =
        hist.length >= 2 ? Math.max(0, hist[hist.length - 1]! - hist[0]!) : dev ? Number(dev.development_level) - 50 : 0;
      const teams = p.teams as { name?: string } | null;
      return {
        playerId: id,
        playerName: playerFullName({ firstName: String(p.first_name), lastName: String(p.last_name) }),
        teamName: teams?.name ?? null,
        overallRating: dev ? Number(dev.overall_rating) : 50,
        potential: dev ? Number(dev.potential) : 50,
        averageAssessment: avgAssess,
        attendanceRate: 85,
        progressScore,
      };
    });

    return computeTalentRanking(entries);
  },
);

export const getScoutingPlayers = cache(
  async (clubId: string = DEFAULT_CLUB_ID): Promise<ScoutingPlayer[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("scouting_players")
      .select("*, scouted_by_profile:scouted_by(full_name)")
      .eq("club_id", clubId)
      .order("updated_at", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => mapScoutingPlayer(r as Record<string, unknown>));
  },
);

export const getScoutingClubs = cache(
  async (clubId: string = DEFAULT_CLUB_ID): Promise<ScoutingClub[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase.from("scouting_clubs").select("*").eq("club_id", clubId).order("name");
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => mapScoutingClub(r as Record<string, unknown>));
  },
);

export const getScoutingReports = cache(
  async (clubId: string = DEFAULT_CLUB_ID): Promise<ScoutingReport[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("scouting_reports")
      .select("*, author:author_id(full_name), scouting_player:scouting_player_id(first_name, last_name)")
      .eq("club_id", clubId)
      .order("report_date", { ascending: false })
      .limit(30);
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => mapScoutingReport(r as Record<string, unknown>));
  },
);

export const getOpponentAnalyses = cache(
  async (clubId: string = DEFAULT_CLUB_ID): Promise<OpponentAnalysis[]> => {
    const supabase = await createClient();
    const { data, error } = await supabase
      .from("opponent_analysis")
      .select("*, author:author_id(full_name)")
      .eq("club_id", clubId)
      .order("analysis_date", { ascending: false });
    if (error) throw new Error(error.message);
    return (data ?? []).map((r) => mapOpponentAnalysis(r as Record<string, unknown>));
  },
);

export {
  canAccessPlayerDevelopment,
  resolveOwnPlayerIds,
} from "@/lib/players/access";
