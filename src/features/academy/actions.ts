"use server";

import { revalidatePath } from "next/cache";

import {
  canManageAcademy,
  canManageScouting,
} from "@/config/permissions";
import { requireAccessContext } from "@/lib/auth/session";
import { computeAssessmentAverage } from "@/lib/academy/mappers";
import { FITNESS_TEST_UNITS } from "@/lib/academy/constants";
import { createClient } from "@/lib/supabase/server";
import type { FitnessTestType, PlayerGoalStatus, ScoutingPlayerStatus } from "@/types/academy";

export type AcademyActionState = { error?: string; success?: string };

const PATHS = [
  "/academy",
  "/academy/groups",
  "/academy/development",
  "/academy/talents",
  "/academy/scouting",
  "/academy/opponents",
  "/players",
];

function revalidateAcademy() {
  for (const p of PATHS) revalidatePath(p);
}

function readString(formData: FormData, key: string): string {
  return String(formData.get(key) ?? "").trim();
}

function readInt(formData: FormData, key: string, min: number, max: number): number | null {
  const n = Number(readString(formData, key));
  if (!Number.isFinite(n) || n < min || n > max) return null;
  return Math.round(n);
}

export async function upsertPlayerDevelopmentAction(
  _prev: AcademyActionState,
  formData: FormData,
): Promise<AcademyActionState> {
  const access = await requireAccessContext();
  if (!canManageAcademy(access.roles)) return { error: "Brak uprawnień." };

  const playerId = readString(formData, "playerId");
  const potential = readInt(formData, "potential", 1, 100);
  const developmentLevel = readInt(formData, "developmentLevel", 1, 100);
  const overallRating = readInt(formData, "overallRating", 1, 100);
  if (!playerId || potential == null || developmentLevel == null || overallRating == null) {
    return { error: "Uzupełnij poprawne wartości (1–100)." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("player_development").upsert(
    {
      club_id: access.clubId,
      player_id: playerId,
      potential,
      development_level: developmentLevel,
      overall_rating: overallRating,
      notes: readString(formData, "notes") || null,
      updated_by: access.userId,
    },
    { onConflict: "club_id,player_id" },
  );
  if (error) return { error: error.message };

  await supabase.from("player_development_history").insert({
    club_id: access.clubId,
    player_id: playerId,
    potential,
    development_level: developmentLevel,
    overall_rating: overallRating,
    note: readString(formData, "historyNote") || "Aktualizacja profilu rozwoju",
    recorded_by: access.userId,
  });

  revalidateAcademy();
  revalidatePath(`/academy/development/${playerId}`);
  return { success: "Profil rozwoju zapisany." };
}

export async function addPlayerAssessmentAction(
  _prev: AcademyActionState,
  formData: FormData,
): Promise<AcademyActionState> {
  const access = await requireAccessContext();
  if (!canManageAcademy(access.roles)) return { error: "Brak uprawnień." };

  const playerId = readString(formData, "playerId");
  if (!playerId) return { error: "Brak zawodnika." };

  const scores = {
    technique: readInt(formData, "technique", 1, 10),
    speed: readInt(formData, "speed", 1, 10),
    motorics: readInt(formData, "motorics", 1, 10),
    endurance: readInt(formData, "endurance", 1, 10),
    strength: readInt(formData, "strength", 1, 10),
    tactics: readInt(formData, "tactics", 1, 10),
    engagement: readInt(formData, "engagement", 1, 10),
    discipline: readInt(formData, "discipline", 1, 10),
    cooperation: readInt(formData, "cooperation", 1, 10),
  };
  if (Object.values(scores).some((v) => v == null)) return { error: "Oceny muszą być w skali 1–10." };

  const supabase = await createClient();
  const { error } = await supabase.from("player_assessments").insert({
    club_id: access.clubId,
    player_id: playerId,
    assessor_id: access.userId,
    assessed_at: readString(formData, "assessedAt") || new Date().toISOString().slice(0, 10),
    technique: scores.technique!,
    speed: scores.speed!,
    motorics: scores.motorics!,
    endurance: scores.endurance!,
    strength: scores.strength!,
    tactics: scores.tactics!,
    engagement: scores.engagement!,
    discipline: scores.discipline!,
    cooperation: scores.cooperation!,
    average_score: computeAssessmentAverage(scores as Record<string, number>),
    notes: readString(formData, "notes") || null,
  });
  if (error) return { error: error.message };

  revalidateAcademy();
  revalidatePath(`/academy/development/${playerId}`);
  return { success: "Ocena trenerska dodana." };
}

export async function upsertPlayerGoalAction(
  _prev: AcademyActionState,
  formData: FormData,
): Promise<AcademyActionState> {
  const access = await requireAccessContext();
  if (!canManageAcademy(access.roles)) return { error: "Brak uprawnień." };

  const playerId = readString(formData, "playerId");
  const title = readString(formData, "title");
  if (!playerId || !title) return { error: "Podaj tytuł celu." };

  const status = (readString(formData, "status") || "active") as PlayerGoalStatus;
  const supabase = await createClient();
  const payload = {
    id: readString(formData, "goalId") || crypto.randomUUID(),
    club_id: access.clubId,
    player_id: playerId,
    title,
    description: readString(formData, "description") || null,
    status,
    target_date: readString(formData, "targetDate") || null,
    completed_at: status === "completed" ? new Date().toISOString() : null,
    created_by: access.userId,
  };

  const { error } = await supabase.from("player_goals").upsert(payload, { onConflict: "id" });
  if (error) return { error: error.message };

  revalidateAcademy();
  revalidatePath(`/academy/development/${playerId}`);
  return { success: "Cel rozwojowy zapisany." };
}

export async function addFitnessTestAction(
  _prev: AcademyActionState,
  formData: FormData,
): Promise<AcademyActionState> {
  const access = await requireAccessContext();
  if (!canManageAcademy(access.roles)) return { error: "Brak uprawnień." };

  const playerId = readString(formData, "playerId");
  const testType = readString(formData, "testType") as FitnessTestType;
  const resultValue = Number(readString(formData, "resultValue"));
  if (!playerId || !testType || !Number.isFinite(resultValue)) return { error: "Uzupełnij wynik testu." };

  const supabase = await createClient();
  const { error } = await supabase.from("fitness_tests").insert({
    club_id: access.clubId,
    player_id: playerId,
    test_type: testType,
    result_value: resultValue,
    unit: FITNESS_TEST_UNITS[testType] ?? "",
    test_date: readString(formData, "testDate") || new Date().toISOString().slice(0, 10),
    notes: readString(formData, "notes") || null,
    recorded_by: access.userId,
  });
  if (error) return { error: error.message };

  revalidateAcademy();
  revalidatePath(`/academy/development/${playerId}`);
  return { success: "Test motoryczny zapisany." };
}

export async function addTeamTransitionAction(
  _prev: AcademyActionState,
  formData: FormData,
): Promise<AcademyActionState> {
  const access = await requireAccessContext();
  if (!canManageAcademy(access.roles)) return { error: "Brak uprawnień." };

  const playerId = readString(formData, "playerId");
  const reason = readString(formData, "reason");
  const toAgeGroup = readString(formData, "toAgeGroup");
  if (!playerId || !reason || !toAgeGroup) return { error: "Uzupełnij dane awansu." };

  const supabase = await createClient();
  const { error } = await supabase.from("player_team_transitions").insert({
    club_id: access.clubId,
    player_id: playerId,
    from_age_group: readString(formData, "fromAgeGroup") || null,
    to_age_group: toAgeGroup,
    from_team_id: readString(formData, "fromTeamId") || null,
    to_team_id: readString(formData, "toTeamId") || null,
    transition_date: readString(formData, "transitionDate") || new Date().toISOString().slice(0, 10),
    transition_type: readString(formData, "transitionType") || "promotion",
    reason,
    decision_by: access.userId,
    notes: readString(formData, "notes") || null,
  });
  if (error) return { error: error.message };

  revalidateAcademy();
  return { success: "Przejście między drużynami zapisane." };
}

export async function upsertScoutingPlayerAction(
  _prev: AcademyActionState,
  formData: FormData,
): Promise<AcademyActionState> {
  const access = await requireAccessContext();
  if (!canManageScouting(access.roles)) return { error: "Brak uprawnień do skautingu." };

  const firstName = readString(formData, "firstName");
  const lastName = readString(formData, "lastName");
  const externalClubName = readString(formData, "externalClubName");
  if (!firstName || !lastName || !externalClubName) return { error: "Uzupełnij dane zawodnika." };

  const supabase = await createClient();
  const { error } = await supabase.from("scouting_players").upsert(
    {
      id: readString(formData, "id") || crypto.randomUUID(),
      club_id: access.clubId,
      first_name: firstName,
      last_name: lastName,
      external_club_name: externalClubName,
      position: readString(formData, "position") || "midfielder",
      age_years: readInt(formData, "ageYears", 5, 50),
      status: (readString(formData, "status") || "observed") as ScoutingPlayerStatus,
      notes: readString(formData, "notes") || null,
      scouted_by: access.userId,
    },
    { onConflict: "id" },
  );
  if (error) return { error: error.message };

  revalidateAcademy();
  return { success: "Zawodnik skautingowy zapisany." };
}

export async function addScoutingReportAction(
  _prev: AcademyActionState,
  formData: FormData,
): Promise<AcademyActionState> {
  const access = await requireAccessContext();
  if (!canManageScouting(access.roles)) return { error: "Brak uprawnień." };

  const scoutingPlayerId = readString(formData, "scoutingPlayerId");
  if (!scoutingPlayerId) return { error: "Wybierz zawodnika." };

  const ratings = {
    technique: readInt(formData, "technique", 1, 10),
    motorics: readInt(formData, "motorics", 1, 10),
    tactics: readInt(formData, "tactics", 1, 10),
    character: readInt(formData, "character", 1, 10),
    potential: readInt(formData, "potential", 1, 10),
    final_rating: readInt(formData, "finalRating", 1, 10),
  };
  if (Object.values(ratings).some((v) => v == null)) return { error: "Oceny 1–10 wymagane." };

  const supabase = await createClient();
  const { error } = await supabase.from("scouting_reports").insert({
    club_id: access.clubId,
    scouting_player_id: scoutingPlayerId,
    author_id: access.userId,
    report_date: readString(formData, "reportDate") || new Date().toISOString().slice(0, 10),
    ...ratings,
    summary: readString(formData, "summary") || null,
  });
  if (error) return { error: error.message };

  revalidateAcademy();
  return { success: "Raport skautingowy dodany." };
}

export async function upsertOpponentAnalysisAction(
  _prev: AcademyActionState,
  formData: FormData,
): Promise<AcademyActionState> {
  const access = await requireAccessContext();
  if (!canManageScouting(access.roles)) return { error: "Brak uprawnień." };

  const opponentName = readString(formData, "opponentName");
  if (!opponentName) return { error: "Podaj nazwę przeciwnika." };

  const supabase = await createClient();
  const { error } = await supabase.from("opponent_analysis").upsert(
    {
      id: readString(formData, "id") || crypto.randomUUID(),
      club_id: access.clubId,
      opponent_name: opponentName,
      scouting_club_id: readString(formData, "scoutingClubId") || null,
      strengths: readString(formData, "strengths"),
      weaknesses: readString(formData, "weaknesses"),
      key_players: readString(formData, "keyPlayers"),
      tactical_setup: readString(formData, "tacticalSetup"),
      analysis_date: readString(formData, "analysisDate") || new Date().toISOString().slice(0, 10),
      author_id: access.userId,
    },
    { onConflict: "id" },
  );
  if (error) return { error: error.message };

  revalidateAcademy();
  return { success: "Analiza przeciwnika zapisana." };
}

export async function upsertScoutingClubAction(
  _prev: AcademyActionState,
  formData: FormData,
): Promise<AcademyActionState> {
  const access = await requireAccessContext();
  if (!canManageScouting(access.roles)) return { error: "Brak uprawnień." };

  const name = readString(formData, "name");
  if (!name) return { error: "Podaj nazwę klubu." };

  const supabase = await createClient();
  const { error } = await supabase.from("scouting_clubs").upsert(
    {
      id: readString(formData, "id") || crypto.randomUUID(),
      club_id: access.clubId,
      name,
      club_type: readString(formData, "clubType") || "league_opponent",
      city: readString(formData, "city") || null,
      contact_info: readString(formData, "contactInfo") || null,
      notes: readString(formData, "notes") || null,
    },
    { onConflict: "club_id,name" },
  );
  if (error) return { error: error.message };

  revalidateAcademy();
  return { success: "Klub obserwowany zapisany." };
}
