import { cache } from "react";

import { createClient } from "@/lib/supabase/server";
import { mapAttendanceRecord, mapAvailabilityReason, mapPlayerAvailability } from "@/lib/attendance/mappers";
import { computeCoachReport, computeFrequencyStats } from "@/lib/attendance/stats";
import type {
  AttendanceDashboardWidgets,
  AttendanceRecordRow,
  CalendarDayAvailability,
  CoachAttendanceReport,
  MatchSquadCallRow,
  PlayerAvailabilityRow,
  PlayerFrequencyStats,
} from "@/types/attendance";
import type { AvailabilityStatus } from "@/types/trainings";

export const getAvailabilityReasons = cache(async (clubId: string) => {
  const supabase = await createClient();
  const { data } = await supabase
    .from("availability_reasons")
    .select("*")
    .or(`club_id.is.null,club_id.eq.${clubId}`)
    .eq("is_active", true)
    .order("sort_order");
  return (data ?? []).map((row) =>
    mapAvailabilityReason(
      row as {
        id: string;
        code: string;
        label_pl: string;
        absence_reason: import("@/types/trainings").AbsenceReason | null;
      },
    ),
  );
});

export const getAttendanceDashboardWidgets = cache(
  async (clubId: string, teamId?: string): Promise<AttendanceDashboardWidgets> => {
    const supabase = await createClient();
    const today = new Date().toISOString().slice(0, 10);

    let trainingQuery = supabase
      .from("trainings")
      .select("id, team_id")
      .eq("club_id", clubId)
      .eq("status", "planned")
      .gte("training_date", today)
      .order("training_date")
      .limit(1);
    if (teamId) trainingQuery = trainingQuery.eq("team_id", teamId);
    const { data: nextTraining } = await trainingQuery.maybeSingle();

    let matchQuery = supabase
      .from("matches")
      .select("id, team_id")
      .eq("club_id", clubId)
      .eq("status", "planned")
      .gte("match_date", today)
      .order("match_date")
      .limit(1);
    if (teamId) matchQuery = matchQuery.eq("team_id", teamId);
    const { data: nextMatch } = await matchQuery.maybeSingle();

    let availableTraining = 0;
    let totalTraining = 0;
    if (nextTraining?.id) {
      const { data: avail } = await supabase
        .from("player_availability")
        .select("status")
        .eq("training_id", nextTraining.id);
      totalTraining = avail?.length ?? 0;
      availableTraining = (avail ?? []).filter((a) => a.status === "present").length;
    }

    let availableMatch = 0;
    let totalMatch = 0;
    if (nextMatch?.id) {
      const { data: avail } = await supabase
        .from("player_availability")
        .select("status")
        .eq("match_id", nextMatch.id);
      const { data: called } = await supabase
        .from("match_squad")
        .select("call_status")
        .eq("match_id", nextMatch.id)
        .in("call_status", ["called_up", "reserve"]);
      totalMatch = called?.length ?? avail?.length ?? 0;
      availableMatch = (avail ?? []).filter((a) => a.status === "present").length;
    }

    let injuredQuery = supabase
      .from("players")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("status", "injured");
    if (teamId) injuredQuery = injuredQuery.eq("team_id", teamId);
    const injuredRes = await injuredQuery;

    const rosterGaps = Math.max(0, (totalTraining || 11) - availableTraining);

    return {
      nextTrainingAvailable: availableTraining,
      nextTrainingTotal: totalTraining,
      nextMatchAvailable: availableMatch,
      nextMatchTotal: totalMatch,
      rosterGaps,
      injuredCount: injuredRes.count ?? 0,
      nextTrainingId: nextTraining?.id ? String(nextTraining.id) : null,
      nextMatchId: nextMatch?.id ? String(nextMatch.id) : null,
    };
  },
);

export const getMonthlyAvailabilityCalendar = cache(
  async (
    clubId: string,
    month: string,
    view: "player" | "coach" | "team",
    playerId?: string,
    teamId?: string,
  ): Promise<CalendarDayAvailability[]> => {
    const supabase = await createClient();
    const start = `${month}-01`;
    const endDate = new Date(`${month}-01T00:00:00Z`);
    endDate.setUTCMonth(endDate.getUTCMonth() + 1);
    endDate.setUTCDate(0);
    const end = endDate.toISOString().slice(0, 10);

    const items: CalendarDayAvailability[] = [];

    let trainingQuery = supabase
      .from("trainings")
      .select("id, name, training_date, team_id")
      .eq("club_id", clubId)
      .gte("training_date", start)
      .lte("training_date", end);
    if (teamId) trainingQuery = trainingQuery.eq("team_id", teamId);
    const { data: trainings } = await trainingQuery;

    const trainingIds = (trainings ?? []).map((t) => String(t.id));

    const { data: availability } = trainingIds.length
      ? await supabase
          .from("player_availability")
          .select("*")
          .eq("club_id", clubId)
          .in("training_id", trainingIds)
      : { data: [] };

    for (const tr of trainings ?? []) {
      const rows = (availability ?? []).filter((a) => String(a.training_id) === String(tr.id));
      let status: AvailabilityStatus = "unknown";
      if (view === "player" && playerId) {
        status = (rows.find((r) => String(r.player_id) === playerId)?.status as AvailabilityStatus) ?? "unknown";
      } else if (rows.length) {
        const present = rows.filter((r) => r.status === "present").length;
        const absent = rows.filter((r) => r.status === "absent").length;
        status = absent > present ? "absent" : present > 0 ? "present" : "unknown";
      }
      items.push({
        date: String(tr.training_date),
        status,
        eventType: "training",
        eventId: String(tr.id),
        label: String(tr.name),
      });
    }

    let matchQuery = supabase
      .from("matches")
      .select("id, home_team_name, away_team_name, match_date, team_id")
      .eq("club_id", clubId)
      .gte("match_date", start)
      .lte("match_date", end);
    if (teamId) matchQuery = matchQuery.eq("team_id", teamId);
    const { data: matches } = await matchQuery;

    const matchIds = (matches ?? []).map((m) => String(m.id));
    const { data: mAvail } = matchIds.length
      ? await supabase.from("player_availability").select("*").eq("club_id", clubId).in("match_id", matchIds)
      : { data: [] };

    for (const m of matches ?? []) {
      const rows = (mAvail ?? []).filter((a) => String(a.match_id) === String(m.id));
      let status: AvailabilityStatus = "unknown";
      if (view === "player" && playerId) {
        status = (rows.find((r) => String(r.player_id) === playerId)?.status as AvailabilityStatus) ?? "unknown";
      } else if (rows.length) {
        const present = rows.filter((r) => r.status === "present").length;
        status = present > rows.length / 2 ? "present" : "unknown";
      }
      items.push({
        date: String(m.match_date),
        status,
        eventType: "match",
        eventId: String(m.id),
        label: `${m.home_team_name} – ${m.away_team_name}`,
      });
    }

    return items.sort((a, b) => a.date.localeCompare(b.date));
  },
);

export const getCoachAttendanceReport = cache(
  async (clubId: string, teamId?: string): Promise<CoachAttendanceReport> => {
    const stats = await getPlayerFrequencyStats(clubId, teamId);
    return computeCoachReport(stats);
  },
);

export const getPlayerFrequencyStats = cache(
  async (clubId: string, teamId?: string): Promise<PlayerFrequencyStats[]> => {
    const supabase = await createClient();

    let playersQuery = supabase
      .from("players")
      .select("id, first_name, last_name, status, team_id")
      .eq("club_id", clubId)
      .eq("status", "active");
    if (teamId) playersQuery = playersQuery.eq("team_id", teamId);
    const { data: players } = await playersQuery;

    const { data: records } = await supabase
      .from("attendance_records")
      .select("*")
      .eq("club_id", clubId)
      .order("recorded_at", { ascending: false })
      .limit(500);

    const { data: availability } = await supabase
      .from("player_availability")
      .select("*")
      .eq("club_id", clubId)
      .order("updated_at", { ascending: false })
      .limit(500);

    return computeFrequencyStats(
      (players ?? []).map((p) => ({
        id: String(p.id),
        name: `${p.first_name} ${p.last_name}`,
        status: String(p.status),
      })),
      (records ?? []).map((r) => mapAttendanceRecord(r)),
      (availability ?? []).map((r) => mapPlayerAvailability(r)),
    );
  },
);

export const getMatchSquadCalls = cache(
  async (matchId: string, clubId: string): Promise<MatchSquadCallRow[]> => {
    const supabase = await createClient();
    const { data: squad } = await supabase
      .from("match_squad")
      .select("player_id, squad_role, call_status, players(first_name, last_name)")
      .eq("club_id", clubId)
      .eq("match_id", matchId);

    const playerIds = (squad ?? []).map((s) => String(s.player_id));
    const { data: responses } = playerIds.length
      ? await supabase
          .from("match_squad_responses")
          .select("player_id, response")
          .eq("match_id", matchId)
      : { data: [] };

    const responseMap = new Map((responses ?? []).map((r) => [String(r.player_id), String(r.response)]));

    return (squad ?? []).map((row) => {
      const player = row.players as { first_name?: string; last_name?: string } | null;
      return {
        playerId: String(row.player_id),
        playerName: player ? `${player.first_name} ${player.last_name}` : "Zawodnik",
        squadRole: String(row.squad_role),
        callStatus: row.call_status as MatchSquadCallRow["callStatus"],
        userResponse: (responseMap.get(String(row.player_id)) ?? null) as MatchSquadCallRow["userResponse"],
      };
    });
  },
);
