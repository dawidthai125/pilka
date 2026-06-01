import type {
  InjuryAvailabilityImpact,
  InjuryCategoryRow,
  InjuryRecordStatus,
  PlayerInjuryRow,
  RehabilitationPlanRow,
  RehabilitationPlanStatus,
  ReturnToMatchStatus,
  ReturnToPlayRow,
  ReturnToTrainingStatus,
} from "@/types/injuries";
import {
  INJURY_AVAILABILITY_IMPACTS,
  INJURY_RECORD_STATUSES,
  REHABILITATION_PLAN_STATUSES,
  RETURN_TO_MATCH_STATUSES,
  RETURN_TO_TRAINING_STATUSES,
} from "@/types/injuries";

function pickEnum<T extends string>(value: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(value as T) ? (value as T) : fallback;
}

export function mapInjuryCategory(row: Record<string, unknown>): InjuryCategoryRow {
  return {
    id: String(row.id),
    slug: String(row.slug),
    name: String(row.name),
    sortOrder: Number(row.sort_order ?? 0),
    isActive: Boolean(row.is_active ?? true),
  };
}

export function mapPlayerInjury(row: Record<string, unknown>): PlayerInjuryRow {
  const players = row.players as Record<string, unknown> | null | undefined;
  const teams = row.teams as Record<string, unknown> | null | undefined;
  const categories = row.injury_categories as Record<string, unknown> | null | undefined;

  return {
    id: String(row.id),
    clubId: String(row.club_id),
    playerId: String(row.player_id),
    playerName: players
      ? `${players.first_name ?? ""} ${players.last_name ?? ""}`.trim()
      : undefined,
    teamId: row.team_id ? String(row.team_id) : null,
    teamName: teams?.name ? String(teams.name) : undefined,
    categoryId: row.category_id ? String(row.category_id) : null,
    categoryName: categories?.name ? String(categories.name) : undefined,
    injuryDate: String(row.injury_date),
    expectedReturnDate: row.expected_return_date ? String(row.expected_return_date) : null,
    description: String(row.description),
    injuryStatus: pickEnum(row.injury_status, INJURY_RECORD_STATUSES, "active"),
    availabilityImpact: row.availability_impact
      ? pickEnum(row.availability_impact, INJURY_AVAILABILITY_IMPACTS, "unavailable")
      : null,
    isActive: Boolean(row.is_active),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function mapRehabilitationPlan(row: Record<string, unknown>): RehabilitationPlanRow {
  return {
    id: String(row.id),
    injuryId: String(row.injury_id),
    playerId: String(row.player_id),
    stageLabel: String(row.stage_label ?? "Etap I"),
    coachNote: row.coach_note ? String(row.coach_note) : null,
    progressNote: row.progress_note ? String(row.progress_note) : null,
    status: pickEnum(row.status, REHABILITATION_PLAN_STATUSES, "started"),
    updatedAt: String(row.updated_at),
  };
}

export function mapReturnToPlay(row: Record<string, unknown>): ReturnToPlayRow {
  return {
    id: String(row.id),
    injuryId: String(row.injury_id),
    playerId: String(row.player_id),
    trainingStatus: pickEnum(row.training_status, RETURN_TO_TRAINING_STATUSES, "no_clearance"),
    matchStatus: pickEnum(row.match_status, RETURN_TO_MATCH_STATUSES, "unavailable"),
    notes: row.notes ? String(row.notes) : null,
    updatedAt: String(row.updated_at),
  };
}

export function parseInjuryRecordStatus(value: string): InjuryRecordStatus | null {
  return INJURY_RECORD_STATUSES.includes(value as InjuryRecordStatus)
    ? (value as InjuryRecordStatus)
    : null;
}

export function parseInjuryAvailabilityImpact(value: string): InjuryAvailabilityImpact | null {
  return INJURY_AVAILABILITY_IMPACTS.includes(value as InjuryAvailabilityImpact)
    ? (value as InjuryAvailabilityImpact)
    : null;
}

export function parseRehabilitationPlanStatus(value: string): RehabilitationPlanStatus | null {
  return REHABILITATION_PLAN_STATUSES.includes(value as RehabilitationPlanStatus)
    ? (value as RehabilitationPlanStatus)
    : null;
}

export function parseReturnToTrainingStatus(value: string): ReturnToTrainingStatus | null {
  return RETURN_TO_TRAINING_STATUSES.includes(value as ReturnToTrainingStatus)
    ? (value as ReturnToTrainingStatus)
    : null;
}

export function parseReturnToMatchStatus(value: string): ReturnToMatchStatus | null {
  return RETURN_TO_MATCH_STATUSES.includes(value as ReturnToMatchStatus)
    ? (value as ReturnToMatchStatus)
    : null;
}

export function computeAbsenceDays(injury: PlayerInjuryRow): number {
  const start = new Date(injury.injuryDate);
  const end = injury.expectedReturnDate ? new Date(injury.expectedReturnDate) : new Date();
  const diff = Math.max(0, end.getTime() - start.getTime());
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}
