import { z } from "zod";

import { CLUB_ROLES, TEAM_CATEGORIES } from "@/types/rbac";
import {
  COACH_NOTE_TYPES,
  DOMINANT_FEET,
  PLAYER_DOCUMENT_TYPES,
  PLAYER_HISTORY_EVENT_TYPES,
  PLAYER_POSITIONS,
  PLAYER_STATUSES,
} from "@/types/players";
import {
  ABSENCE_REASONS,
  ATTENDANCE_STATUSES,
  AVAILABILITY_STATUSES,
  TRAINING_STATUSES,
} from "@/types/trainings";

export const clubRoleSchema = z.enum(CLUB_ROLES);
export const teamCategorySchema = z.enum(TEAM_CATEGORIES);
export const playerStatusSchema = z.enum(PLAYER_STATUSES);
export const playerPositionSchema = z.enum(PLAYER_POSITIONS);
export const dominantFootSchema = z.enum(DOMINANT_FEET);
export const playerDocumentTypeSchema = z.enum(PLAYER_DOCUMENT_TYPES);
export const playerHistoryEventTypeSchema = z.enum(PLAYER_HISTORY_EVENT_TYPES);
export const coachNoteTypeSchema = z.enum(COACH_NOTE_TYPES);
export const trainingStatusSchema = z.enum(TRAINING_STATUSES);
export const availabilityStatusSchema = z.enum(AVAILABILITY_STATUSES);
export const absenceReasonSchema = z.enum(ABSENCE_REASONS);
export const attendanceStatusSchema = z.enum(ATTENDANCE_STATUSES);

export function parseClubRole(value: string) {
  return clubRoleSchema.safeParse(value);
}

export function parseTeamCategory(value: string) {
  return teamCategorySchema.safeParse(value);
}

export function parsePlayerStatus(value: string) {
  return playerStatusSchema.safeParse(value);
}

export function parsePlayerPosition(value: string) {
  return playerPositionSchema.safeParse(value);
}

export function parseDominantFoot(value: string) {
  return dominantFootSchema.safeParse(value);
}

export function parsePlayerDocumentType(value: string) {
  return playerDocumentTypeSchema.safeParse(value);
}

export function parsePlayerHistoryEventType(value: string) {
  return playerHistoryEventTypeSchema.safeParse(value);
}

export function parseCoachNoteType(value: string) {
  return coachNoteTypeSchema.safeParse(value);
}

export function parseTrainingStatus(value: string) {
  return trainingStatusSchema.safeParse(value);
}

export function parseAvailabilityStatus(value: string) {
  return availabilityStatusSchema.safeParse(value);
}

export function parseAbsenceReason(value: string) {
  return absenceReasonSchema.safeParse(value);
}

export function parseAttendanceStatus(value: string) {
  return attendanceStatusSchema.safeParse(value);
}

export function safeRedirectPath(next: string | null, fallback = "/dashboard"): string {
  if (!next || !next.startsWith("/") || next.startsWith("//") || next.includes("\\")) {
    return fallback;
  }

  return next;
}
