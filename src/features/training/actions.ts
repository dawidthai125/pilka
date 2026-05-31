"use server";

import { revalidatePath } from "next/cache";

import {
  canManageTrainings,
  canMarkTrainingAttendance,
  canSetTrainingAvailability,
} from "@/config/permissions";
import { DEFAULT_CLUB_ID, requireAccessContext } from "@/lib/auth/session";
import { buildReminderCopy, reminderScheduledAt } from "@/lib/training/notifications";
import { TRAINING_REMINDER_TYPES } from "@/types/trainings";
import {
  parseAbsenceReason,
  parseAttendanceStatus,
  parseAvailabilityStatus,
  parseTrainingStatus,
} from "@/lib/validators";
import { createClient } from "@/lib/supabase/server";

export type TrainingActionState = {
  error?: string;
  success?: string;
  trainingId?: string;
};

function nullableString(value: FormDataEntryValue | null): string | null {
  const trimmed = String(value ?? "").trim();
  return trimmed || null;
}

function revalidateTrainingPaths(trainingId?: string) {
  revalidatePath("/training");
  revalidatePath("/training/coach");
  revalidatePath("/training/ranking");
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
  if (trainingId) {
    revalidatePath(`/training/${trainingId}`);
  }
}

async function verifyTeamInClub(teamId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teams")
    .select("id")
    .eq("id", teamId)
    .eq("club_id", DEFAULT_CLUB_ID)
    .maybeSingle();

  return !error && !!data;
}

async function verifyCoachInClub(coachUserId: string | null) {
  if (!coachUserId) return true;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("club_memberships")
    .select("id")
    .eq("club_id", DEFAULT_CLUB_ID)
    .eq("user_id", coachUserId)
    .eq("status", "active")
    .in("role", ["owner", "president", "sports_director", "coach"])
    .maybeSingle();

  return !error && !!data;
}

async function verifyTrainingInClub(trainingId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trainings")
    .select("id, team_id, status")
    .eq("id", trainingId)
    .eq("club_id", DEFAULT_CLUB_ID)
    .maybeSingle();

  if (error || !data) return null;
  return data;
}

async function verifyPlayerOnTrainingTeam(trainingId: string, playerId: string) {
  const training = await verifyTrainingInClub(trainingId);
  if (!training) return false;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("players")
    .select("id")
    .eq("id", playerId)
    .eq("club_id", DEFAULT_CLUB_ID)
    .eq("team_id", training.team_id)
    .maybeSingle();

  return !error && !!data;
}

function isEndTimeAfterStart(startTime: string, endTime: string) {
  return endTime > startTime;
}

async function syncRemindersForTraining(
  clubId: string,
  trainingId: string,
  name: string,
  trainingDate: string,
  startTime: string,
) {
  const supabase = await createClient();
  const { data: members } = await supabase
    .from("club_memberships")
    .select("user_id")
    .eq("club_id", clubId)
    .eq("status", "active")
    .in("role", ["owner", "president", "sports_director", "coach", "player", "parent"]);

  const time = startTime.slice(0, 5);
  const rows = [];

  for (const member of members ?? []) {
    for (const reminderType of TRAINING_REMINDER_TYPES) {
      const scheduledAt = reminderScheduledAt(trainingDate, time, reminderType);
      const copy = buildReminderCopy(name, trainingDate, time, reminderType);
      rows.push({
        club_id: clubId,
        user_id: member.user_id,
        training_id: trainingId,
        reminder_type: reminderType,
        title: copy.title,
        body: copy.body,
        href: `/training/${trainingId}`,
        scheduled_at: scheduledAt.toISOString(),
        delivery_channels: ["in_app"],
      });
    }
  }

  if (rows.length) {
    await supabase.from("club_notifications").upsert(rows, {
      onConflict: "user_id,training_id,reminder_type",
      ignoreDuplicates: true,
    });
  }
}

export async function createTraining(
  _prev: TrainingActionState,
  formData: FormData,
): Promise<TrainingActionState> {
  const access = await requireAccessContext();
  if (!canManageTrainings(access.roles)) {
    return { error: "Brak uprawnień do tworzenia treningów." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const teamId = String(formData.get("teamId") ?? "").trim();
  const trainingDate = String(formData.get("trainingDate") ?? "").trim();
  const startTime = String(formData.get("startTime") ?? "").trim();
  const endTime = String(formData.get("endTime") ?? "").trim();
  const location = nullableString(formData.get("location"));
  const description = nullableString(formData.get("description"));
  const coachUserId = nullableString(formData.get("coachUserId"));
  const statusParsed = parseTrainingStatus(String(formData.get("status") ?? "planned"));

  if (!name || !teamId || !trainingDate || !startTime || !endTime) {
    return { error: "Wypełnij wymagane pola treningu." };
  }
  if (!statusParsed.success) {
    return { error: "Nieprawidłowy status treningu." };
  }
  if (!isEndTimeAfterStart(startTime, endTime)) {
    return { error: "Godzina zakończenia musi być późniejsza niż rozpoczęcia." };
  }
  if (!(await verifyTeamInClub(teamId))) {
    return { error: "Wybrana drużyna nie należy do klubu." };
  }
  if (!(await verifyCoachInClub(coachUserId))) {
    return { error: "Wybrany trener nie jest członkiem sztabu klubu." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("trainings")
    .insert({
      club_id: DEFAULT_CLUB_ID,
      team_id: teamId,
      name,
      training_date: trainingDate,
      start_time: startTime,
      end_time: endTime,
      location,
      description,
      coach_user_id: coachUserId,
      status: statusParsed.data,
    })
    .select("id")
    .single();

  if (error || !data) {
    return { error: error?.message ?? "Nie udało się utworzyć treningu." };
  }

  if (statusParsed.data === "planned") {
    await syncRemindersForTraining(
      DEFAULT_CLUB_ID,
      data.id,
      name,
      trainingDate,
      startTime,
    );
  }

  revalidateTrainingPaths(data.id);
  return { success: "Trening został utworzony.", trainingId: data.id };
}

export async function updateTraining(
  trainingId: string,
  _prev: TrainingActionState,
  formData: FormData,
): Promise<TrainingActionState> {
  const access = await requireAccessContext();
  if (!canManageTrainings(access.roles)) {
    return { error: "Brak uprawnień do edycji treningów." };
  }

  const name = String(formData.get("name") ?? "").trim();
  const teamId = String(formData.get("teamId") ?? "").trim();
  const trainingDate = String(formData.get("trainingDate") ?? "").trim();
  const startTime = String(formData.get("startTime") ?? "").trim();
  const endTime = String(formData.get("endTime") ?? "").trim();
  const location = nullableString(formData.get("location"));
  const description = nullableString(formData.get("description"));
  const coachUserId = nullableString(formData.get("coachUserId"));
  const statusParsed = parseTrainingStatus(String(formData.get("status") ?? "planned"));

  if (!name || !teamId || !trainingDate || !startTime || !endTime) {
    return { error: "Wypełnij wymagane pola treningu." };
  }
  if (!statusParsed.success) {
    return { error: "Nieprawidłowy status treningu." };
  }
  if (!isEndTimeAfterStart(startTime, endTime)) {
    return { error: "Godzina zakończenia musi być późniejsza niż rozpoczęcia." };
  }
  if (!(await verifyTeamInClub(teamId))) {
    return { error: "Wybrana drużyna nie należy do klubu." };
  }
  if (!(await verifyCoachInClub(coachUserId))) {
    return { error: "Wybrany trener nie jest członkiem sztabu klubu." };
  }
  if (!(await verifyTrainingInClub(trainingId))) {
    return { error: "Trening nie istnieje w tym klubie." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("trainings")
    .update({
      team_id: teamId,
      name,
      training_date: trainingDate,
      start_time: startTime,
      end_time: endTime,
      location,
      description,
      coach_user_id: coachUserId,
      status: statusParsed.data,
    })
    .eq("club_id", DEFAULT_CLUB_ID)
    .eq("id", trainingId);

  if (error) {
    return { error: error.message };
  }

  if (statusParsed.data === "planned") {
    await syncRemindersForTraining(
      DEFAULT_CLUB_ID,
      trainingId,
      name,
      trainingDate,
      startTime,
    );
  }

  revalidateTrainingPaths(trainingId);
  return { success: "Trening został zaktualizowany." };
}

export async function setTrainingAvailability(
  trainingId: string,
  _prev: TrainingActionState,
  formData: FormData,
): Promise<TrainingActionState> {
  const access = await requireAccessContext();
  if (!canSetTrainingAvailability(access.roles)) {
    return { error: "Brak uprawnień do potwierdzania obecności." };
  }

  const statusParsed = parseAvailabilityStatus(String(formData.get("status") ?? ""));
  if (!statusParsed.success) {
    return { error: "Wybierz status dostępności." };
  }

  const absenceReasonRaw = nullableString(formData.get("absenceReason"));
  const notes = nullableString(formData.get("notes"));
  let absenceReason = null;

  if (statusParsed.data === "absent") {
    if (!absenceReasonRaw) {
      return { error: "Podaj powód nieobecności." };
    }
    const reasonParsed = parseAbsenceReason(absenceReasonRaw);
    if (!reasonParsed.success) {
      return { error: "Nieprawidłowy powód nieobecności." };
    }
    absenceReason = reasonParsed.data;
  }

  const training = await verifyTrainingInClub(trainingId);
  if (!training) {
    return { error: "Trening nie istnieje w tym klubie." };
  }
  if (training.status !== "planned") {
    return { error: "Dostępność można ustawić tylko dla zaplanowanych treningów." };
  }

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("email")
    .eq("id", access.userId)
    .maybeSingle();

  const { data: player } = profile?.email
    ? await supabase
        .from("players")
        .select("id")
        .eq("club_id", DEFAULT_CLUB_ID)
        .ilike("email", profile.email)
        .maybeSingle()
    : { data: null };

  if (!player) {
    return { error: "Nie znaleziono profilu zawodnika powiązanego z kontem." };
  }
  if (!(await verifyPlayerOnTrainingTeam(trainingId, player.id))) {
    return { error: "Zawodnik nie należy do drużyny tego treningu." };
  }

  const { error } = await supabase.from("training_availability").upsert(
    {
      club_id: DEFAULT_CLUB_ID,
      training_id: trainingId,
      player_id: player.id,
      status: statusParsed.data,
      absence_reason: absenceReason,
      notes,
      responded_by: access.userId,
    },
    { onConflict: "training_id,player_id" },
  );

  if (error) {
    return { error: error.message };
  }

  revalidateTrainingPaths(trainingId);
  return { success: "Dostępność została zapisana." };
}

export async function setTrainingAttendance(
  trainingId: string,
  _prev: TrainingActionState,
  formData: FormData,
): Promise<TrainingActionState> {
  const access = await requireAccessContext();
  if (!canMarkTrainingAttendance(access.roles)) {
    return { error: "Brak uprawnień do listy obecności." };
  }

  const playerId = String(formData.get("playerId") ?? "").trim();
  const statusParsed = parseAttendanceStatus(String(formData.get("status") ?? ""));
  const notes = nullableString(formData.get("notes"));

  if (!playerId || !statusParsed.success) {
    return { error: "Wybierz zawodnika i status obecności." };
  }
  if (!(await verifyPlayerOnTrainingTeam(trainingId, playerId))) {
    return { error: "Zawodnik nie należy do drużyny tego treningu." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("training_attendance").upsert(
    {
      club_id: DEFAULT_CLUB_ID,
      training_id: trainingId,
      player_id: playerId,
      status: statusParsed.data,
      notes,
      marked_by: access.userId,
      marked_at: new Date().toISOString(),
    },
    { onConflict: "training_id,player_id" },
  );

  if (error) {
    return { error: error.message };
  }

  revalidateTrainingPaths(trainingId);
  return { success: "Obecność zapisana." };
}

export async function completeTraining(
  trainingId: string,
): Promise<TrainingActionState> {
  const access = await requireAccessContext();
  if (!canManageTrainings(access.roles)) {
    return { error: "Brak uprawnień." };
  }
  if (!(await verifyTrainingInClub(trainingId))) {
    return { error: "Trening nie istnieje w tym klubie." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("trainings")
    .update({ status: "completed" })
    .eq("club_id", DEFAULT_CLUB_ID)
    .eq("id", trainingId);

  if (error) {
    return { error: error.message };
  }

  revalidateTrainingPaths(trainingId);
  return { success: "Trening oznaczony jako zakończony." };
}

export async function cancelTraining(trainingId: string): Promise<TrainingActionState> {
  const access = await requireAccessContext();
  if (!canManageTrainings(access.roles)) {
    return { error: "Brak uprawnień." };
  }
  if (!(await verifyTrainingInClub(trainingId))) {
    return { error: "Trening nie istnieje w tym klubie." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("trainings")
    .update({ status: "cancelled" })
    .eq("club_id", DEFAULT_CLUB_ID)
    .eq("id", trainingId);

  if (error) {
    return { error: error.message };
  }

  revalidateTrainingPaths(trainingId);
  return { success: "Trening został odwołany." };
}

export async function addTrainingSessionNote(
  trainingId: string,
  _prev: TrainingActionState,
  formData: FormData,
): Promise<TrainingActionState> {
  const access = await requireAccessContext();
  if (!canManageTrainings(access.roles)) {
    return { error: "Brak uprawnień do dodawania notatek." };
  }

  const content = String(formData.get("content") ?? "").trim();
  const playerId = nullableString(formData.get("playerId"));

  if (!content) {
    return { error: "Treść notatki jest wymagana." };
  }
  if (!(await verifyTrainingInClub(trainingId))) {
    return { error: "Trening nie istnieje w tym klubie." };
  }
  if (playerId && !(await verifyPlayerOnTrainingTeam(trainingId, playerId))) {
    return { error: "Zawodnik nie należy do drużyny tego treningu." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("training_session_notes").insert({
    club_id: DEFAULT_CLUB_ID,
    training_id: trainingId,
    author_id: access.userId,
    player_id: playerId,
    content,
  });

  if (error) {
    return { error: error.message };
  }

  revalidateTrainingPaths(trainingId);
  return { success: "Notatka została dodana." };
}

export async function markNotificationRead(notificationId: string): Promise<void> {
  const access = await requireAccessContext();
  const supabase = await createClient();
  await supabase
    .from("club_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("id", notificationId)
    .eq("user_id", access.userId)
    .eq("club_id", DEFAULT_CLUB_ID);
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
}

export async function markAllNotificationsRead(): Promise<void> {
  const access = await requireAccessContext();
  const supabase = await createClient();
  await supabase
    .from("club_notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", access.userId)
    .eq("club_id", DEFAULT_CLUB_ID)
    .is("read_at", null);
  revalidatePath("/notifications");
  revalidatePath("/dashboard");
}
