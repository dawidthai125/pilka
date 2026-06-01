"use server";

import { revalidatePath } from "next/cache";

import {
  canManageMatchSquad,
  canManageTrainings,
  canSetTrainingAvailability,
} from "@/config/permissions";
import { requireAccessContext } from "@/lib/auth/session";
import { notifyMatchSquadCall } from "@/lib/attendance/dispatch";
import { mapMatchCallStatus, mapSquadResponse } from "@/lib/attendance/mappers";
import { resolveOwnPlayerIds } from "@/lib/players/access";
import { createClient } from "@/lib/supabase/server";
import {
  parseAbsenceReason,
  parseAvailabilityStatus,
} from "@/lib/validators";

export type AttendanceActionState = { error?: string; success?: string };

function revalidateAttendance() {
  revalidatePath("/attendance");
  revalidatePath("/attendance/calendar");
  revalidatePath("/attendance/coach");
  revalidatePath("/attendance/ai");
  revalidatePath("/dashboard");
  revalidatePath("/training");
  revalidatePath("/matches");
}

async function resolveTargetPlayerId(access: Awaited<ReturnType<typeof requireAccessContext>>, raw?: string) {
  const ownIds = await resolveOwnPlayerIds(access);
  if (raw) {
    if (canManageTrainings(access.roles) || ownIds.includes(raw)) return raw;
    return null;
  }
  return ownIds[0] ?? null;
}

export async function setPlayerAvailabilityAction(
  _prev: AttendanceActionState,
  formData: FormData,
): Promise<AttendanceActionState> {
  const access = await requireAccessContext();
  if (!canSetTrainingAvailability(access.roles) && !canManageTrainings(access.roles)) {
    return { error: "Brak uprawnień." };
  }

  const eventType = String(formData.get("eventType") ?? "training");
  const trainingId = String(formData.get("trainingId") ?? "").trim() || null;
  const matchId = String(formData.get("matchId") ?? "").trim() || null;
  const statusRaw = String(formData.get("status") ?? "");
  const playerIdRaw = String(formData.get("playerId") ?? "").trim() || undefined;
  const absenceReasonRaw = String(formData.get("absenceReason") ?? "").trim() || null;
  const comment = String(formData.get("comment") ?? "").trim() || null;

  const statusParsed = parseAvailabilityStatus(statusRaw);
  if (!statusParsed.success) return { error: "Nieprawidłowy status." };

  const playerId = await resolveTargetPlayerId(access, playerIdRaw);
  if (!playerId) return { error: "Nie znaleziono zawodnika." };

  let absenceReason = null;
  if (statusParsed.data === "absent") {
    if (!absenceReasonRaw) return { error: "Podaj powód nieobecności." };
    const reasonParsed = parseAbsenceReason(absenceReasonRaw);
    if (!reasonParsed.success) return { error: "Nieprawidłowy powód." };
    absenceReason = reasonParsed.data;
  }

  const supabase = await createClient();

  let existingQuery = supabase
    .from("player_availability")
    .select("id")
    .eq("club_id", access.clubId)
    .eq("player_id", playerId);

  if (trainingId) existingQuery = existingQuery.eq("training_id", trainingId);
  if (matchId) existingQuery = existingQuery.eq("match_id", matchId);

  const { data: existing } = await existingQuery.maybeSingle();

  const row = {
    club_id: access.clubId,
    player_id: playerId,
    event_type: eventType,
    training_id: trainingId,
    match_id: matchId,
    status: statusParsed.data,
    absence_reason: absenceReason,
    comment,
    declared_by: access.userId,
  };

  const { error } = existing?.id
    ? await supabase.from("player_availability").update(row).eq("id", existing.id)
    : await supabase.from("player_availability").insert(row);

  if (error) return { error: error.message };

  if (eventType === "training" && trainingId) {
    await supabase.from("training_availability").upsert({
      club_id: access.clubId,
      training_id: trainingId,
      player_id: playerId,
      status: statusParsed.data,
      absence_reason: absenceReason,
      notes: comment,
      responded_by: access.userId,
    });
  }

  revalidateAttendance();
  return { success: "Dostępność zapisana." };
}

export async function quickAvailableAction(
  trainingId: string,
  playerId?: string,
): Promise<AttendanceActionState> {
  const fd = new FormData();
  fd.set("eventType", "training");
  fd.set("trainingId", trainingId);
  fd.set("status", "present");
  if (playerId) fd.set("playerId", playerId);
  return setPlayerAvailabilityAction({}, fd);
}

export async function quickAbsentAction(
  trainingId: string,
  playerId?: string,
): Promise<AttendanceActionState> {
  const fd = new FormData();
  fd.set("eventType", "training");
  fd.set("trainingId", trainingId);
  fd.set("status", "absent");
  fd.set("absenceReason", "other");
  fd.set("comment", "Nie będzie mnie");
  if (playerId) fd.set("playerId", playerId);
  return setPlayerAvailabilityAction({}, fd);
}

export async function setMatchCallStatusAction(
  matchId: string,
  playerId: string,
  callStatusRaw: string,
): Promise<AttendanceActionState> {
  const access = await requireAccessContext();
  if (!canManageMatchSquad(access.roles)) return { error: "Brak uprawnień." };

  const callStatus = mapMatchCallStatus(callStatusRaw);
  if (!callStatus) return { error: "Nieprawidłowy status powołania." };

  const supabase = await createClient();
  const { data: match } = await supabase
    .from("matches")
    .select("team_id, home_team_name, away_team_name")
    .eq("id", matchId)
    .eq("club_id", access.clubId)
    .maybeSingle();
  if (!match) return { error: "Mecz nie istnieje." };

  const { data: existing } = await supabase
    .from("match_squad")
    .select("id")
    .eq("match_id", matchId)
    .eq("player_id", playerId)
    .maybeSingle();

  const { error } = existing?.id
    ? await supabase.from("match_squad").update({ call_status: callStatus }).eq("id", existing.id)
    : await supabase.from("match_squad").insert({
        club_id: access.clubId,
        match_id: matchId,
        player_id: playerId,
        squad_role: "squad",
        call_status: callStatus,
      });

  if (error) return { error: error.message };

  if (callStatus === "called_up" || callStatus === "reserve") {
    await notifyMatchSquadCall(
      access.clubId,
      matchId,
      String(match.team_id),
      "Powołanie na mecz",
      `${match.home_team_name} – ${match.away_team_name}: status ${callStatus}`,
    );
  }

  revalidateAttendance();
  revalidatePath(`/attendance/matches/${matchId}`);
  revalidatePath(`/matches/${matchId}`);
  return { success: "Status powołania zapisany." };
}

export async function respondMatchSquadAction(
  matchId: string,
  playerId: string,
  responseRaw: string,
): Promise<AttendanceActionState> {
  const access = await requireAccessContext();
  const response = mapSquadResponse(responseRaw);
  if (!response) return { error: "Nieprawidłowa odpowiedź." };

  const ownIds = await resolveOwnPlayerIds(access);
  if (!ownIds.includes(playerId)) return { error: "Brak dostępu do tego zawodnika." };

  const supabase = await createClient();
  const { error } = await supabase.from("match_squad_responses").upsert({
    club_id: access.clubId,
    match_id: matchId,
    player_id: playerId,
    user_id: access.userId,
    response,
    responded_at: new Date().toISOString(),
  });

  if (error) return { error: error.message };
  revalidatePath(`/attendance/matches/${matchId}`);
  return { success: "Odpowiedź zapisana." };
}

export async function setMatchAvailabilityAction(
  matchId: string,
  _prev: AttendanceActionState,
  formData: FormData,
): Promise<AttendanceActionState> {
  formData.set("eventType", "match");
  formData.set("matchId", matchId);
  return setPlayerAvailabilityAction(_prev, formData);
}
