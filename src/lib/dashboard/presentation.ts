import { cache } from "react";

import { getCoachDayData } from "@/lib/dashboard/coach-day";
import { getHomeDashboardStats } from "@/lib/auth/session";
import { createClient } from "@/lib/supabase/server";

export type DashboardPresentation = {
  coachDay: Awaited<ReturnType<typeof getCoachDayData>>;
  playerCounts: { total: number; active: number } | null;
  plannedMatches: number;
  plannedTrainings: number;
  primaryTeamName: string | null;
};

export const getDashboardPresentation = cache(async (clubId: string): Promise<DashboardPresentation> => {
  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);

  const [coachDay, homeStats, matchesRes, trainingsRes, teamRes] = await Promise.all([
    getCoachDayData(clubId),
    getHomeDashboardStats(clubId),
    supabase
      .from("matches")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("status", "planned")
      .gte("match_date", today),
    supabase
      .from("trainings")
      .select("id", { count: "exact", head: true })
      .eq("club_id", clubId)
      .eq("status", "planned")
      .gte("training_date", today),
    supabase
      .from("teams")
      .select("name")
      .eq("club_id", clubId)
      .eq("is_active", true)
      .order("name")
      .limit(1)
      .maybeSingle(),
  ]);

  const primaryTeamName =
    coachDay.todayTraining?.teamName ??
    coachDay.nextMatch
      ? teamRes.data?.name
        ? String(teamRes.data.name)
        : null
      : teamRes.data?.name
        ? String(teamRes.data.name)
        : null;

  return {
    coachDay,
    playerCounts: homeStats.playerCounts,
    plannedMatches: matchesRes.count ?? 0,
    plannedTrainings: trainingsRes.count ?? 0,
    primaryTeamName: primaryTeamName ?? (teamRes.data?.name ? String(teamRes.data.name) : null),
  };
});
