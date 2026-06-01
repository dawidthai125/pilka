import { createClient } from "@/lib/supabase/server";
import { playerFullName } from "@/lib/players/mappers";

const DEFAULT_CLUB_ID = "a1b2c3d4-e5f6-7890-abcd-ef1234567890";

export async function buildAcademyAiContext(clubId: string = DEFAULT_CLUB_ID) {
  const supabase = await createClient();

  const [groups, developments, assessments, goals, transitions, scouting, reports, rankingData] =
    await Promise.all([
      supabase.from("academy_groups").select("age_group, name, is_active").eq("club_id", clubId),
      supabase
        .from("player_development")
        .select("player_id, potential, development_level, overall_rating, players(first_name, last_name)")
        .eq("club_id", clubId)
        .order("overall_rating", { ascending: false })
        .limit(15),
      supabase
        .from("player_assessments")
        .select("player_id, average_score, assessed_at")
        .eq("club_id", clubId)
        .order("assessed_at", { ascending: false })
        .limit(20),
      supabase.from("player_goals").select("title, status, player_id").eq("club_id", clubId).eq("status", "active"),
      supabase
        .from("player_team_transitions")
        .select("player_id, from_age_group, to_age_group, transition_date, reason")
        .eq("club_id", clubId)
        .order("transition_date", { ascending: false })
        .limit(10),
      supabase.from("scouting_players").select("first_name, last_name, status, position, external_club_name").eq("club_id", clubId),
      supabase
        .from("scouting_reports")
        .select("final_rating, summary, scouting_player_id, report_date")
        .eq("club_id", clubId)
        .order("report_date", { ascending: false })
        .limit(10),
      supabase
        .from("player_development_history")
        .select("player_id, overall_rating, recorded_at")
        .eq("club_id", clubId)
        .order("recorded_at", { ascending: false })
        .limit(100),
    ]);

  const historyByPlayer = new Map<string, number[]>();
  for (const h of rankingData.data ?? []) {
    const id = String(h.player_id);
    const list = historyByPlayer.get(id) ?? [];
    list.push(Number(h.overall_rating));
    historyByPlayer.set(id, list);
  }
  for (const [id, list] of historyByPlayer) {
    historyByPlayer.set(id, list.reverse());
  }

  const topTalents = (developments.data ?? []).slice(0, 10).map((d) => {
    const player = d.players as { first_name?: string; last_name?: string } | null;
    const hist = historyByPlayer.get(String(d.player_id)) ?? [];
    const progress = hist.length >= 2 ? hist[hist.length - 1]! - hist[0]! : 0;
    return {
      name: player ? playerFullName({ firstName: String(player.first_name), lastName: String(player.last_name) }) : "?",
      overallRating: d.overall_rating,
      potential: d.potential,
      progress,
    };
  });

  const regressions = topTalents.filter((t) => t.progress < 0);

  return {
    groups: groups.data ?? [],
    topTalents,
    regressions,
    recentAssessments: assessments.data ?? [],
    activeGoals: goals.data ?? [],
    recentTransitions: transitions.data ?? [],
    scoutingProspects: scouting.data ?? [],
    scoutingReports: reports.data ?? [],
    summary: {
      groupCount: (groups.data ?? []).length,
      assessedPlayers: (developments.data ?? []).length,
      activeGoals: (goals.data ?? []).length,
      recommendedProspects: (scouting.data ?? []).filter((s) => s.status === "recommended").length,
      promotionCandidates: topTalents.filter(
        (t) => Number(t.potential) >= 75 && Number(t.overallRating) >= 70,
      ).length,
    },
  };
}
