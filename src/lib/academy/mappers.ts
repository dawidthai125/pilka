import type {
  AcademyGroup,
  AcademyGroupStaff,
  FitnessTest,
  OpponentAnalysis,
  PlayerAssessment,
  PlayerDevelopment,
  PlayerDevelopmentHistory,
  PlayerGoal,
  PlayerTeamTransition,
  ScoutingClub,
  ScoutingPlayer,
  ScoutingReport,
  TalentRankingEntry,
} from "@/types/academy";
import { mapNum as num, mapNullableStr as optStr, mapStr as str } from "@/lib/mappers/row-helpers";

export function mapAcademyGroup(row: Record<string, unknown>): AcademyGroup {
  const team = row.team as Record<string, unknown> | null | undefined;
  return {
    id: str(row, "id"),
    clubId: str(row, "club_id"),
    ageGroup: row.age_group as AcademyGroup["ageGroup"],
    teamId: optStr(row, "team_id"),
    teamName: team?.name ? String(team.name) : null,
    name: str(row, "name"),
    description: optStr(row, "description"),
    isActive: Boolean(row.is_active),
    playerCount: row.player_count != null ? Number(row.player_count) : undefined,
    staffCount: row.staff_count != null ? Number(row.staff_count) : undefined,
  };
}

export function mapAcademyGroupStaff(row: Record<string, unknown>): AcademyGroupStaff {
  const profile = row.profile as Record<string, unknown> | null | undefined;
  return {
    id: str(row, "id"),
    clubId: str(row, "club_id"),
    groupId: str(row, "group_id"),
    profileId: str(row, "profile_id"),
    staffName: profile?.full_name ? String(profile.full_name) : null,
    staffRole: row.staff_role as AcademyGroupStaff["staffRole"],
  };
}

export function mapPlayerDevelopment(row: Record<string, unknown>): PlayerDevelopment {
  return {
    id: str(row, "id"),
    clubId: str(row, "club_id"),
    playerId: str(row, "player_id"),
    potential: num(row, "potential"),
    developmentLevel: num(row, "development_level"),
    overallRating: num(row, "overall_rating"),
    notes: optStr(row, "notes"),
    updatedBy: optStr(row, "updated_by"),
    updatedAt: str(row, "updated_at"),
  };
}

export function mapPlayerDevelopmentHistory(row: Record<string, unknown>): PlayerDevelopmentHistory {
  return {
    id: str(row, "id"),
    clubId: str(row, "club_id"),
    playerId: str(row, "player_id"),
    potential: num(row, "potential"),
    developmentLevel: num(row, "development_level"),
    overallRating: num(row, "overall_rating"),
    note: optStr(row, "note"),
    recordedBy: optStr(row, "recorded_by"),
    recordedAt: str(row, "recorded_at"),
  };
}

export function mapPlayerAssessment(row: Record<string, unknown>): PlayerAssessment {
  const assessor = row.assessor as Record<string, unknown> | null | undefined;
  return {
    id: str(row, "id"),
    clubId: str(row, "club_id"),
    playerId: str(row, "player_id"),
    assessorId: optStr(row, "assessor_id"),
    assessorName: assessor?.full_name ? String(assessor.full_name) : null,
    assessedAt: str(row, "assessed_at"),
    technique: num(row, "technique"),
    speed: num(row, "speed"),
    motorics: num(row, "motorics"),
    endurance: num(row, "endurance"),
    strength: num(row, "strength"),
    tactics: num(row, "tactics"),
    engagement: num(row, "engagement"),
    discipline: num(row, "discipline"),
    cooperation: num(row, "cooperation"),
    averageScore: num(row, "average_score"),
    notes: optStr(row, "notes"),
  };
}

export function mapPlayerGoal(row: Record<string, unknown>): PlayerGoal {
  return {
    id: str(row, "id"),
    clubId: str(row, "club_id"),
    playerId: str(row, "player_id"),
    title: str(row, "title"),
    description: optStr(row, "description"),
    status: row.status as PlayerGoal["status"],
    targetDate: optStr(row, "target_date"),
    completedAt: optStr(row, "completed_at"),
    createdBy: optStr(row, "created_by"),
    createdAt: str(row, "created_at"),
  };
}

export function mapFitnessTest(row: Record<string, unknown>): FitnessTest {
  return {
    id: str(row, "id"),
    clubId: str(row, "club_id"),
    playerId: str(row, "player_id"),
    testType: row.test_type as FitnessTest["testType"],
    resultValue: num(row, "result_value"),
    unit: str(row, "unit"),
    testDate: str(row, "test_date"),
    notes: optStr(row, "notes"),
    recordedBy: optStr(row, "recorded_by"),
  };
}

export function mapPlayerTeamTransition(row: Record<string, unknown>): PlayerTeamTransition {
  const decisionBy = row.decision_by_profile as Record<string, unknown> | null | undefined;
  return {
    id: str(row, "id"),
    clubId: str(row, "club_id"),
    playerId: str(row, "player_id"),
    fromAgeGroup: (row.from_age_group as PlayerTeamTransition["fromAgeGroup"]) ?? null,
    toAgeGroup: row.to_age_group as PlayerTeamTransition["toAgeGroup"],
    fromTeamId: optStr(row, "from_team_id"),
    toTeamId: optStr(row, "to_team_id"),
    transitionDate: str(row, "transition_date"),
    transitionType: row.transition_type as PlayerTeamTransition["transitionType"],
    reason: str(row, "reason"),
    decisionBy: optStr(row, "decision_by"),
    decisionByName: decisionBy?.full_name ? String(decisionBy.full_name) : null,
    notes: optStr(row, "notes"),
  };
}

export function mapScoutingPlayer(row: Record<string, unknown>): ScoutingPlayer {
  const scoutedBy = row.scouted_by_profile as Record<string, unknown> | null | undefined;
  return {
    id: str(row, "id"),
    clubId: str(row, "club_id"),
    firstName: str(row, "first_name"),
    lastName: str(row, "last_name"),
    externalClubName: str(row, "external_club_name"),
    position: str(row, "position"),
    birthDate: optStr(row, "birth_date"),
    ageYears: row.age_years != null ? Number(row.age_years) : null,
    status: row.status as ScoutingPlayer["status"],
    notes: optStr(row, "notes"),
    scoutedBy: optStr(row, "scouted_by"),
    scoutedByName: scoutedBy?.full_name ? String(scoutedBy.full_name) : null,
    linkedPlayerId: optStr(row, "linked_player_id"),
    createdAt: str(row, "created_at"),
  };
}

export function mapScoutingClub(row: Record<string, unknown>): ScoutingClub {
  return {
    id: str(row, "id"),
    clubId: str(row, "club_id"),
    name: str(row, "name"),
    clubType: row.club_type as ScoutingClub["clubType"],
    city: optStr(row, "city"),
    contactInfo: optStr(row, "contact_info"),
    notes: optStr(row, "notes"),
  };
}

export function mapScoutingReport(row: Record<string, unknown>): ScoutingReport {
  const author = row.author as Record<string, unknown> | null | undefined;
  const scoutingPlayer = row.scouting_player as Record<string, unknown> | null | undefined;
  let playerName: string | null = null;
  if (scoutingPlayer) {
    playerName = `${scoutingPlayer.first_name ?? ""} ${scoutingPlayer.last_name ?? ""}`.trim();
  }
  return {
    id: str(row, "id"),
    clubId: str(row, "club_id"),
    scoutingPlayerId: optStr(row, "scouting_player_id"),
    playerId: optStr(row, "player_id"),
    playerName,
    authorId: optStr(row, "author_id"),
    authorName: author?.full_name ? String(author.full_name) : null,
    reportDate: str(row, "report_date"),
    technique: num(row, "technique"),
    motorics: num(row, "motorics"),
    tactics: num(row, "tactics"),
    character: num(row, "character"),
    potential: num(row, "potential"),
    finalRating: num(row, "final_rating"),
    summary: optStr(row, "summary"),
  };
}

export function mapOpponentAnalysis(row: Record<string, unknown>): OpponentAnalysis {
  const author = row.author as Record<string, unknown> | null | undefined;
  return {
    id: str(row, "id"),
    clubId: str(row, "club_id"),
    opponentName: str(row, "opponent_name"),
    scoutingClubId: optStr(row, "scouting_club_id"),
    strengths: str(row, "strengths"),
    weaknesses: str(row, "weaknesses"),
    keyPlayers: str(row, "key_players"),
    tacticalSetup: str(row, "tactical_setup"),
    analysisDate: str(row, "analysis_date"),
    authorId: optStr(row, "author_id"),
    authorName: author?.full_name ? String(author.full_name) : null,
  };
}

export function computeAssessmentAverage(scores: Record<string, number>): number {
  const values = Object.values(scores);
  if (!values.length) return 0;
  return Math.round((values.reduce((a, b) => a + b, 0) / values.length) * 100) / 100;
}

export function computeTalentRanking(
  entries: Array<{
    playerId: string;
    playerName: string;
    teamName: string | null;
    overallRating: number;
    potential: number;
    averageAssessment: number;
    attendanceRate: number;
    progressScore: number;
  }>,
): TalentRankingEntry[] {
  const scored = entries.map((e) => {
    const talentScore = Math.round(
      e.overallRating * 0.3 +
        e.potential * 0.25 +
        e.averageAssessment * 10 * 0.2 +
        e.attendanceRate * 0.15 +
        e.progressScore * 0.1,
    );
    return { ...e, talentScore, rank: 0 };
  });
  scored.sort((a, b) => b.talentScore - a.talentScore);
  return scored.map((e, i) => ({ ...e, rank: i + 1 }));
}

export function filterByChartRange<T extends { recordedAt?: string; assessedAt?: string; testDate?: string }>(
  items: T[],
  range: import("@/types/academy").DevelopmentChartRange,
  dateKey: "recordedAt" | "assessedAt" | "testDate" = "recordedAt",
): T[] {
  if (range === "all") return items;
  const now = new Date();
  const days =
    range === "month" ? 30 : range === "half_year" ? 183 : range === "year" ? 365 : 99999;
  const cutoff = new Date(now.getTime() - days * 24 * 60 * 60 * 1000);
  return items.filter((item) => {
    const raw = item[dateKey];
    if (!raw) return false;
    return new Date(raw) >= cutoff;
  });
}
