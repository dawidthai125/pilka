"use server";

import {
  canManageInjuryConfig,
  canManageInjuryStaff,
} from "@/config/permissions";
import { requireAccessContext } from "@/lib/auth/session";
import {
  notifyInjuryReported,
  notifyReturnToMatch,
  notifyReturnToTraining,
} from "@/lib/injuries/dispatch";
import {
  parseInjuryAvailabilityImpact,
  parseInjuryRecordStatus,
  parseRehabilitationPlanStatus,
  parseReturnToMatchStatus,
  parseReturnToTrainingStatus,
} from "@/lib/injuries/mappers";
import { revalidateInjuryPaths } from "@/lib/injuries/revalidate";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export type InjuryActionState = {
  error?: string;
  success?: string;
  injuryId?: string;
};

function requireInjuryStaff(access: Awaited<ReturnType<typeof requireAccessContext>>) {
  if (!canManageInjuryStaff(access.roles)) {
    return { error: "Brak uprawnień do zarządzania urazami." };
  }
  return null;
}

function requireInjuryConfig(access: Awaited<ReturnType<typeof requireAccessContext>>) {
  if (!canManageInjuryConfig(access.roles)) {
    return { error: "Brak uprawnień do konfiguracji kategorii urazów." };
  }
  return null;
}

async function getStaffNotifyUserIds(clubId: string): Promise<string[]> {
  const admin = createAdminClient();
  const { data } = await admin
    .from("club_memberships")
    .select("user_id")
    .eq("club_id", clubId)
    .eq("status", "active")
    .in("role", ["owner", "president", "sports_director", "coach"]);
  return (data ?? []).map((row) => String(row.user_id));
}

export async function reportInjuryAction(
  _prev: InjuryActionState,
  formData: FormData,
): Promise<InjuryActionState> {
  const access = await requireAccessContext();
  const denied = requireInjuryStaff(access);
  if (denied) return denied;

  const playerId = String(formData.get("playerId") ?? "").trim();
  const injuryDate = String(formData.get("injuryDate") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();
  const categoryId = String(formData.get("categoryId") ?? "").trim() || null;
  const expectedReturn = String(formData.get("expectedReturnDate") ?? "").trim() || null;
  const availabilityImpact = parseInjuryAvailabilityImpact(
    String(formData.get("availabilityImpact") ?? "unavailable"),
  );
  const injuryStatus =
    parseInjuryRecordStatus(String(formData.get("injuryStatus") ?? "active")) ?? "active";

  if (!playerId || !injuryDate || !description) {
    return { error: "Zawodnik, data zgłoszenia i opis są wymagane." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("player_injuries")
    .insert({
      club_id: access.clubId,
      player_id: playerId,
      category_id: categoryId,
      injury_date: injuryDate,
      expected_return_date: expectedReturn,
      recovery_date: expectedReturn,
      description,
      injury_status: injuryStatus,
      availability_impact: availabilityImpact,
      created_by: access.userId,
    })
    .select("id, players(first_name, last_name)")
    .single();

  if (error) return { error: error.message };

  const injuryId = String(data.id);
  const player = data.players as { first_name?: string; last_name?: string } | null;
  const playerName = player
    ? `${player.first_name ?? ""} ${player.last_name ?? ""}`.trim()
    : "Zawodnik";

  await supabase.from("rehabilitation_plans").insert({
    club_id: access.clubId,
    injury_id: injuryId,
    player_id: playerId,
    stage_label: "Etap I",
    status: "started",
    updated_by: access.userId,
  });

  await supabase.from("return_to_play").insert({
    club_id: access.clubId,
    injury_id: injuryId,
    player_id: playerId,
    training_status: "no_clearance",
    match_status: "unavailable",
    updated_by: access.userId,
  });

  const notifyIds = await getStaffNotifyUserIds(access.clubId);
  await notifyInjuryReported(access.clubId, notifyIds, playerName, injuryId);

  revalidateInjuryPaths(injuryId);
  return { success: "Uraz zgłoszony.", injuryId };
}

export async function updateInjuryAction(
  _prev: InjuryActionState,
  formData: FormData,
): Promise<InjuryActionState> {
  const access = await requireAccessContext();
  const denied = requireInjuryStaff(access);
  if (denied) return denied;

  const injuryId = String(formData.get("injuryId") ?? "").trim();
  const injuryStatus = parseInjuryRecordStatus(String(formData.get("injuryStatus") ?? ""));
  const availabilityImpact = parseInjuryAvailabilityImpact(
    String(formData.get("availabilityImpact") ?? ""),
  );
  const expectedReturn = String(formData.get("expectedReturnDate") ?? "").trim() || null;
  const description = String(formData.get("description") ?? "").trim();

  if (!injuryId || !injuryStatus) return { error: "Brak wymaganych danych." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("player_injuries")
    .update({
      injury_status: injuryStatus,
      availability_impact:
        injuryStatus === "closed" || injuryStatus === "ready_for_training"
          ? null
          : availabilityImpact,
      expected_return_date: expectedReturn,
      recovery_date: expectedReturn,
      description: description || undefined,
    })
    .eq("id", injuryId)
    .eq("club_id", access.clubId);

  if (error) return { error: error.message };

  revalidateInjuryPaths(injuryId);
  return { success: "Wpis urazu zaktualizowany." };
}

export async function updateRehabilitationAction(
  _prev: InjuryActionState,
  formData: FormData,
): Promise<InjuryActionState> {
  const access = await requireAccessContext();
  const denied = requireInjuryStaff(access);
  if (denied) return denied;

  const injuryId = String(formData.get("injuryId") ?? "").trim();
  const playerId = String(formData.get("playerId") ?? "").trim();
  const stageLabel = String(formData.get("stageLabel") ?? "").trim() || "Etap I";
  const coachNote = String(formData.get("coachNote") ?? "").trim() || null;
  const progressNote = String(formData.get("progressNote") ?? "").trim() || null;
  const status =
    parseRehabilitationPlanStatus(String(formData.get("status") ?? "in_progress")) ??
    "in_progress";

  if (!injuryId || !playerId) return { error: "Brak identyfikatora urazu." };

  const supabase = await createClient();
  const { error } = await supabase.from("rehabilitation_plans").upsert(
    {
      club_id: access.clubId,
      injury_id: injuryId,
      player_id: playerId,
      stage_label: stageLabel,
      coach_note: coachNote,
      progress_note: progressNote,
      status,
      updated_by: access.userId,
    },
    { onConflict: "injury_id" },
  );

  if (error) return { error: error.message };

  revalidateInjuryPaths(injuryId);
  return { success: "Plan rehabilitacji zaktualizowany." };
}

export async function updateReturnToPlayAction(
  _prev: InjuryActionState,
  formData: FormData,
): Promise<InjuryActionState> {
  const access = await requireAccessContext();
  const denied = requireInjuryStaff(access);
  if (denied) return denied;

  const injuryId = String(formData.get("injuryId") ?? "").trim();
  const playerId = String(formData.get("playerId") ?? "").trim();
  const trainingStatus =
    parseReturnToTrainingStatus(String(formData.get("trainingStatus") ?? "")) ?? "no_clearance";
  const matchStatus =
    parseReturnToMatchStatus(String(formData.get("matchStatus") ?? "")) ?? "unavailable";
  const notes = String(formData.get("notes") ?? "").trim() || null;

  if (!injuryId || !playerId) return { error: "Brak identyfikatora urazu." };

  const supabase = await createClient();

  const { data: injury } = await supabase
    .from("player_injuries")
    .select("id, players(first_name, last_name)")
    .eq("id", injuryId)
    .eq("club_id", access.clubId)
    .maybeSingle();

  const { error } = await supabase.from("return_to_play").upsert(
    {
      club_id: access.clubId,
      injury_id: injuryId,
      player_id: playerId,
      training_status: trainingStatus,
      match_status: matchStatus,
      notes,
      updated_by: access.userId,
    },
    { onConflict: "injury_id" },
  );

  if (error) return { error: error.message };

  const player = injury?.players as { first_name?: string; last_name?: string } | null;
  const playerName = player
    ? `${player.first_name ?? ""} ${player.last_name ?? ""}`.trim()
    : "Zawodnik";
  const notifyIds = await getStaffNotifyUserIds(access.clubId);

  if (trainingStatus === "full" || trainingStatus === "partial") {
    await notifyReturnToTraining(access.clubId, notifyIds, playerName, injuryId);
  }
  if (matchStatus === "available" || matchStatus === "conditional") {
    await notifyReturnToMatch(access.clubId, notifyIds, playerName, injuryId);
  }

  revalidateInjuryPaths(injuryId);
  return { success: "Status powrotu zaktualizowany." };
}

export async function upsertInjuryCategoryAction(
  _prev: InjuryActionState,
  formData: FormData,
): Promise<InjuryActionState> {
  const access = await requireAccessContext();
  const denied = requireInjuryConfig(access);
  if (denied) return denied;

  const name = String(formData.get("name") ?? "").trim();
  const slug = String(formData.get("slug") ?? "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "-");
  const sortOrder = Number(formData.get("sortOrder") ?? 0);
  const categoryId = String(formData.get("categoryId") ?? "").trim();

  if (!name || !slug) return { error: "Nazwa i slug są wymagane." };

  const supabase = await createClient();
  const row = {
    club_id: access.clubId,
    slug,
    name,
    sort_order: sortOrder,
  };

  if (categoryId) {
    const { error } = await supabase
      .from("injury_categories")
      .update(row)
      .eq("id", categoryId)
      .eq("club_id", access.clubId);
    if (error) return { error: error.message };
  } else {
    const { error } = await supabase.from("injury_categories").insert(row);
    if (error) return { error: error.message };
  }

  revalidateInjuryPaths();
  return { success: "Kategoria zapisana." };
}
