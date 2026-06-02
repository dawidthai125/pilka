import { cache } from "react";

import { createClient } from "@/lib/supabase/server";

export type CoachDayTraining = {
  id: string;
  date: string;
  time: string | null;
  teamName: string | null;
  location: string | null;
};

export type CoachDayMatch = {
  id: string;
  date: string;
  time: string | null;
  opponent: string;
  isHome: boolean;
};

export type CoachDayData = {
  todayTraining: CoachDayTraining | null;
  nextMatch: CoachDayMatch | null;
  unconfirmedRsvpCount: number;
  unconfirmedRsvpNames: string[];
  unconfirmedRsvpMatchId: string | null;
  injuredCount: number;
  injuredNames: string[];
  rosterGaps: number;
  nextTrainingAvailable: number;
  nextTrainingTotal: number;
};

export const getCoachDayData = cache(async (clubId: string): Promise<CoachDayData> => {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const { data: todayTraining } = await supabase
    .from("trainings")
    .select("id, training_date, start_time, location, teams(name)")
    .eq("club_id", clubId)
    .eq("training_date", today)
    .in("status", ["planned", "completed"])
    .order("start_time")
    .limit(1)
    .maybeSingle();

  let nextTraining = todayTraining;
  if (!nextTraining) {
    const { data } = await supabase
      .from("trainings")
      .select("id, training_date, start_time, location, teams(name)")
      .eq("club_id", clubId)
      .eq("status", "planned")
      .gte("training_date", today)
      .order("training_date")
      .order("start_time")
      .limit(1)
      .maybeSingle();
    nextTraining = data;
  }

  const { data: nextMatchRow } = await supabase
    .from("matches")
    .select("id, match_date, match_time, home_team_name, away_team_name, teams(name)")
    .eq("club_id", clubId)
    .eq("status", "planned")
    .gte("match_date", today)
    .order("match_date")
    .order("match_time")
    .limit(1)
    .maybeSingle();

  let nextTrainingAvailable = 0;
  let nextTrainingTotal = 0;
  const trainingId = nextTraining?.id ? String(nextTraining.id) : null;
  if (trainingId) {
    const { data: avail } = await supabase
      .from("player_availability")
      .select("status")
      .eq("training_id", trainingId);
    nextTrainingTotal = avail?.length ?? 0;
    nextTrainingAvailable = (avail ?? []).filter((a) => a.status === "present").length;
  }

  let unconfirmedRsvpCount = 0;
  const unconfirmedRsvpNames: string[] = [];
  let unconfirmedRsvpMatchId: string | null = null;
  const matchId = nextMatchRow?.id ? String(nextMatchRow.id) : null;

  if (matchId) {
    unconfirmedRsvpMatchId = matchId;
    const { data: squad } = await supabase
      .from("match_squad")
      .select("player_id, call_status, players(first_name, last_name)")
      .eq("club_id", clubId)
      .eq("match_id", matchId)
      .in("call_status", ["called_up", "reserve"]);

    const playerIds = (squad ?? []).map((s) => String(s.player_id));
    const { data: responses } = playerIds.length
      ? await supabase
          .from("match_squad_responses")
          .select("player_id, response")
          .eq("match_id", matchId)
      : { data: [] };

    const responseMap = new Map((responses ?? []).map((r) => [String(r.player_id), String(r.response)]));

    for (const row of squad ?? []) {
      const response = responseMap.get(String(row.player_id));
      if (!response || response === "pending") {
        unconfirmedRsvpCount += 1;
        const player = row.players as { first_name?: string; last_name?: string } | null;
        if (player && unconfirmedRsvpNames.length < 5) {
          unconfirmedRsvpNames.push(`${player.first_name} ${player.last_name}`);
        }
      }
    }
  }

  const { data: injuredPlayers } = await supabase
    .from("players")
    .select("first_name, last_name")
    .eq("club_id", clubId)
    .eq("status", "injured")
    .limit(8);

  const { count: injuredCount } = await supabase
    .from("players")
    .select("id", { count: "exact", head: true })
    .eq("club_id", clubId)
    .eq("status", "injured");

  const injuredNames = (injuredPlayers ?? []).map((p) => `${p.first_name} ${p.last_name}`);
  const rosterGaps = Math.max(0, (nextTrainingTotal || 11) - nextTrainingAvailable);

  const teams = todayTraining?.teams ?? nextTraining?.teams;
  const teamName =
    teams && typeof teams === "object" && "name" in teams ? String((teams as { name: string }).name) : null;

  const trainingSource = todayTraining ?? nextTraining;

  const matchTeamName =
    nextMatchRow?.teams && typeof nextMatchRow.teams === "object" && "name" in nextMatchRow.teams
      ? String((nextMatchRow.teams as { name: string }).name)
      : null;
  const isHomeMatch = matchTeamName
    ? String(nextMatchRow?.home_team_name) === matchTeamName
    : true;

  return {
    todayTraining: trainingSource
      ? {
          id: String(trainingSource.id),
          date: String(trainingSource.training_date),
          time: trainingSource.start_time ? String(trainingSource.start_time) : null,
          teamName,
          location: trainingSource.location ? String(trainingSource.location) : null,
        }
      : null,
    nextMatch: nextMatchRow
      ? {
          id: String(nextMatchRow.id),
          date: String(nextMatchRow.match_date),
          time: nextMatchRow.match_time ? String(nextMatchRow.match_time) : null,
          opponent: isHomeMatch
            ? String(nextMatchRow.away_team_name)
            : String(nextMatchRow.home_team_name),
          isHome: isHomeMatch,
        }
      : null,
    unconfirmedRsvpCount,
    unconfirmedRsvpNames,
    unconfirmedRsvpMatchId,
    injuredCount: injuredCount ?? injuredNames.length,
    injuredNames,
    rosterGaps,
    nextTrainingAvailable,
    nextTrainingTotal,
  };
});
