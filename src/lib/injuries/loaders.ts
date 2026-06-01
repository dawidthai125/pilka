import { cache } from "react";

import {
  computeAbsenceDays,
  mapInjuryCategory,
  mapPlayerInjury,
  mapRehabilitationPlan,
  mapReturnToPlay,
} from "@/lib/injuries/mappers";
import { createClient } from "@/lib/supabase/server";
import type {
  InjuryCategoryRow,
  InjuryDashboardStats,
  InjuryRecordStatus,
  PlayerInjuryHistorySummary,
  PlayerInjuryRow,
  RehabilitationPlanRow,
  ReturnToPlayRow,
} from "@/types/injuries";

const INJURY_SELECT =
  "*, players(first_name, last_name), teams(name), injury_categories(name)";

export const getInjuryCategories = cache(
  async (clubId: string): Promise<InjuryCategoryRow[]> => {
    const supabase = await createClient();
    const { data } = await supabase
      .from("injury_categories")
      .select("*")
      .eq("club_id", clubId)
      .eq("is_active", true)
      .order("sort_order");
    return (data ?? []).map((row) => mapInjuryCategory(row as Record<string, unknown>));
  },
);

export const getInjuryDashboardStats = cache(
  async (clubId: string): Promise<InjuryDashboardStats> => {
    const supabase = await createClient();

    const [active, rehab, returning, unavailable] = await Promise.all([
      supabase
        .from("player_injuries")
        .select("id", { count: "exact", head: true })
        .eq("club_id", clubId)
        .eq("injury_status", "active"),
      supabase
        .from("player_injuries")
        .select("id", { count: "exact", head: true })
        .eq("club_id", clubId)
        .eq("injury_status", "rehabilitation"),
      supabase
        .from("return_to_play")
        .select("id", { count: "exact", head: true })
        .eq("club_id", clubId)
        .in("match_status", ["conditional", "available"]),
      supabase
        .from("player_injuries")
        .select("id", { count: "exact", head: true })
        .eq("club_id", clubId)
        .in("injury_status", ["active", "rehabilitation"])
        .eq("availability_impact", "unavailable"),
    ]);

    return {
      activeInjuries: active.count ?? 0,
      inRehabilitation: rehab.count ?? 0,
      returningToMatch: returning.count ?? 0,
      unavailablePlayers: unavailable.count ?? 0,
    };
  },
);

export const getPlayerInjuries = cache(
  async (
    clubId: string,
    filters?: { status?: InjuryRecordStatus; playerId?: string; activeOnly?: boolean },
  ): Promise<PlayerInjuryRow[]> => {
    const supabase = await createClient();
    let query = supabase
      .from("player_injuries")
      .select(INJURY_SELECT)
      .eq("club_id", clubId)
      .order("injury_date", { ascending: false });

    if (filters?.status) query = query.eq("injury_status", filters.status);
    if (filters?.playerId) query = query.eq("player_id", filters.playerId);
    if (filters?.activeOnly) {
      query = query.in("injury_status", ["active", "rehabilitation", "ready_for_training"]);
    }

    const { data } = await query;
    return (data ?? []).map((row) => mapPlayerInjury(row as Record<string, unknown>));
  },
);

export const getPlayerInjuryDetail = cache(
  async (
    clubId: string,
    injuryId: string,
  ): Promise<{
    injury: PlayerInjuryRow | null;
    rehabilitation: RehabilitationPlanRow | null;
    returnToPlay: ReturnToPlayRow | null;
  }> => {
    const supabase = await createClient();

    const [injuryRes, rehabRes, rtpRes] = await Promise.all([
      supabase
        .from("player_injuries")
        .select(INJURY_SELECT)
        .eq("club_id", clubId)
        .eq("id", injuryId)
        .maybeSingle(),
      supabase
        .from("rehabilitation_plans")
        .select("*")
        .eq("club_id", clubId)
        .eq("injury_id", injuryId)
        .maybeSingle(),
      supabase
        .from("return_to_play")
        .select("*")
        .eq("club_id", clubId)
        .eq("injury_id", injuryId)
        .maybeSingle(),
    ]);

    return {
      injury: injuryRes.data
        ? mapPlayerInjury(injuryRes.data as Record<string, unknown>)
        : null,
      rehabilitation: rehabRes.data
        ? mapRehabilitationPlan(rehabRes.data as Record<string, unknown>)
        : null,
      returnToPlay: rtpRes.data ? mapReturnToPlay(rtpRes.data as Record<string, unknown>) : null,
    };
  },
);

export const getInjuryHistorySummaries = cache(
  async (clubId: string): Promise<PlayerInjuryHistorySummary[]> => {
    const injuries = await getPlayerInjuries(clubId);
    const byPlayer = new Map<string, PlayerInjuryHistorySummary>();

    for (const injury of injuries) {
      const existing = byPlayer.get(injury.playerId) ?? {
        playerId: injury.playerId,
        playerName: injury.playerName ?? "Zawodnik",
        injuryCount: 0,
        totalAbsenceDays: 0,
        injuries: [],
      };
      existing.injuryCount += 1;
      existing.totalAbsenceDays += computeAbsenceDays(injury);
      existing.injuries.push(injury);
      byPlayer.set(injury.playerId, existing);
    }

    return [...byPlayer.values()].sort((a, b) => b.injuryCount - a.injuryCount);
  },
);

export const getPortalInjuries = cache(async (clubId: string): Promise<PlayerInjuryRow[]> => {
  return getPlayerInjuries(clubId, { activeOnly: true });
});

export const getMatchSquadInjuryFlags = cache(
  async (
    clubId: string,
    playerIds: string[],
  ): Promise<Record<string, { matchStatus: string; trainingStatus: string }>> => {
    if (!playerIds.length) return {};

    const supabase = await createClient();
    const { data: rtpRows } = await supabase
      .from("return_to_play")
      .select("player_id, injury_id, match_status, training_status")
      .eq("club_id", clubId)
      .in("player_id", playerIds);

    if (!rtpRows?.length) return {};

    const injuryIds = rtpRows.map((row) => String(row.injury_id));
    const { data: injuryRows } = await supabase
      .from("player_injuries")
      .select("id, injury_status")
      .eq("club_id", clubId)
      .in("id", injuryIds)
      .neq("injury_status", "closed");

    const activeIds = new Set((injuryRows ?? []).map((row) => String(row.id)));
    const flags: Record<string, { matchStatus: string; trainingStatus: string }> = {};

    for (const row of rtpRows) {
      if (!activeIds.has(String(row.injury_id))) continue;
      flags[String(row.player_id)] = {
        matchStatus: String(row.match_status),
        trainingStatus: String(row.training_status),
      };
    }
    return flags;
  },
);
