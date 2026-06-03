"use server";

import { revalidatePath } from "next/cache";
import { randomUUID } from "node:crypto";

import { canAccessCoachNotes, canManagePlayers } from "@/config/permissions";
import { requireAccessContext } from "@/lib/auth/session";
import {
  CLUB_ASSETS_BUCKET,
  playerDocumentPath,
  playerPhotoPath,
} from "@/lib/players/constants";
import {
  CLUB_ASSET_DOCUMENT_MIME_TYPES,
  CLUB_ASSET_PHOTO_MIME_TYPES,
  isClubPlayerAssetPath,
  photoExtensionForMime,
  sanitizeStorageFileName,
  validateClubAssetFile,
} from "@/lib/players/uploads";
import { hasPermission } from "@/lib/rbac/permissions";
import {
  parseCoachNoteType,
  parseDominantFoot,
  parsePlayerDocumentType,
  parsePlayerHistoryEventType,
  parsePlayerPosition,
  parsePlayerStatus,
} from "@/lib/validators";
import { createClient } from "@/lib/supabase/server";
import type { DominantFoot, PlayerPosition, PlayerStatus } from "@/types/players";

export type PlayerActionState = {
  error?: string;
  success?: string;
  playerId?: string;
};

function nullableString(value: FormDataEntryValue | null): string | null {
  const trimmed = String(value ?? "").trim();
  return trimmed || null;
}

function parseOptionalInt(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = Number.parseInt(raw, 10);
  return Number.isNaN(parsed) ? null : parsed;
}

function parseOptionalFloat(value: FormDataEntryValue | null): number | null {
  const raw = String(value ?? "").trim();
  if (!raw) return null;
  const parsed = Number.parseFloat(raw);
  return Number.isNaN(parsed) ? null : parsed;
}

type PlayerFormData = {
  first_name: string;
  last_name: string;
  date_of_birth: string;
  phone: string | null;
  email: string | null;
  address: string | null;
  city: string | null;
  postal_code: string | null;
  team_id: string | null;
  jersey_number: number | null;
  primary_position: PlayerPosition | null;
  secondary_position: PlayerPosition | null;
  dominant_foot: DominantFoot | null;
  height_cm: number | null;
  weight_kg: number | null;
  status: PlayerStatus;
  joined_at: string | null;
  left_at: string | null;
};

function parsePlayerFormData(formData: FormData): { error: string } | { data: PlayerFormData } {
  const firstName = String(formData.get("firstName") ?? "").trim();
  const lastName = String(formData.get("lastName") ?? "").trim();
  const dateOfBirth = String(formData.get("dateOfBirth") ?? "").trim();

  if (!firstName || !lastName || !dateOfBirth) {
    return { error: "Imię, nazwisko i data urodzenia są wymagane." as const };
  }

  const statusResult = parsePlayerStatus(String(formData.get("status") ?? "active"));
  if (!statusResult.success) {
    return { error: "Nieprawidłowy status zawodnika." as const };
  }

  const primaryPositionRaw = String(formData.get("primaryPosition") ?? "").trim();
  const secondaryPositionRaw = String(formData.get("secondaryPosition") ?? "").trim();
  const dominantFootRaw = String(formData.get("dominantFoot") ?? "").trim();

  const primaryPosition = primaryPositionRaw
    ? parsePlayerPosition(primaryPositionRaw)
    : { success: true as const, data: null };
  const secondaryPosition = secondaryPositionRaw
    ? parsePlayerPosition(secondaryPositionRaw)
    : { success: true as const, data: null };
  const dominantFoot = dominantFootRaw
    ? parseDominantFoot(dominantFootRaw)
    : { success: true as const, data: null };

  if (!primaryPosition.success || !secondaryPosition.success || !dominantFoot.success) {
    return { error: "Nieprawidłowe dane piłkarskie." as const };
  }

  return {
    data: {
      first_name: firstName,
      last_name: lastName,
      date_of_birth: dateOfBirth,
      phone: nullableString(formData.get("phone")),
      email: nullableString(formData.get("email")),
      address: nullableString(formData.get("address")),
      city: nullableString(formData.get("city")),
      postal_code: nullableString(formData.get("postalCode")),
      team_id: nullableString(formData.get("teamId")),
      jersey_number: parseOptionalInt(formData.get("jerseyNumber")),
      primary_position: primaryPosition.data,
      secondary_position: secondaryPosition.data,
      dominant_foot: dominantFoot.data,
      height_cm: parseOptionalInt(formData.get("heightCm")),
      weight_kg: parseOptionalFloat(formData.get("weightKg")),
      status: statusResult.data,
      joined_at: nullableString(formData.get("joinedAt")),
      left_at: nullableString(formData.get("leftAt")),
    },
  };
}

function revalidatePlayerPaths(playerId?: string) {
  revalidatePath("/players");
  revalidatePath("/dashboard");
  if (playerId) {
    revalidatePath(`/players/${playerId}`);
  }
}

async function verifyPlayerInClub(playerId: string, clubId: string) {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("players")
    .select("id")
    .eq("id", playerId)
    .eq("club_id", clubId)
    .maybeSingle();

  if (error || !data) {
    return false;
  }

  return true;
}

async function verifyTeamInClub(teamId: string | null, clubId: string) {
  if (!teamId) return true;

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("teams")
    .select("id")
    .eq("id", teamId)
    .eq("club_id", clubId)
    .maybeSingle();

  return !error && !!data;
}

export async function createPlayer(
  _prev: PlayerActionState,
  formData: FormData,
): Promise<PlayerActionState> {
  const access = await requireAccessContext();
  if (!canManagePlayers(access.roles)) {
    return { error: "Brak uprawnień do dodawania zawodników." };
  }

  const parsed = parsePlayerFormData(formData);
  if (!("data" in parsed)) {
    return { error: parsed.error };
  }

  const playerData = parsed.data;

  if (!(await verifyTeamInClub(playerData.team_id, access.clubId))) {
    return { error: "Wybrana drużyna nie należy do tego klubu." };
  }

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("players")
    .insert({ club_id: access.clubId, ...playerData })
    .select("id")
    .single();

  if (error || !data) {
    return { error: "Nie udało się utworzyć zawodnika." };
  }

  const { error: historyError } = await supabase.from("player_club_history").insert({
    club_id: access.clubId,
    player_id: data.id,
    event_type: "transfer_in",
    event_date: playerData.joined_at ?? new Date().toISOString().slice(0, 10),
    description: "Dołączenie do klubu",
    created_by: access.userId,
  });

  if (historyError) {
    return {
      error: "Zawodnik utworzony, ale nie udało się zapisać wpisu historii.",
      playerId: data.id,
    };
  }

  revalidatePlayerPaths(data.id);
  return { success: "Zawodnik dodany.", playerId: data.id };
}

export async function updatePlayer(
  playerId: string,
  _prev: PlayerActionState,
  formData: FormData,
): Promise<PlayerActionState> {
  const access = await requireAccessContext();
  if (!canManagePlayers(access.roles)) {
    return { error: "Brak uprawnień do edycji zawodnika." };
  }

  const parsed = parsePlayerFormData(formData);
  if (!("data" in parsed)) {
    return { error: parsed.error };
  }

  const playerData = parsed.data;

  if (!(await verifyPlayerInClub(playerId, access.clubId))) {
    return { error: "Nie znaleziono zawodnika w tym klubie." };
  }

  if (!(await verifyTeamInClub(playerData.team_id, access.clubId))) {
    return { error: "Wybrana drużyna nie należy do tego klubu." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("players")
    .update(playerData)
    .eq("id", playerId)
    .eq("club_id", access.clubId);

  if (error) {
    return { error: "Nie udało się zaktualizować zawodnika." };
  }

  revalidatePlayerPaths(playerId);
  return { success: "Dane zawodnika zaktualizowane." };
}

export async function uploadPlayerPhoto(
  playerId: string,
  _prev: PlayerActionState,
  formData: FormData,
): Promise<PlayerActionState> {
  const access = await requireAccessContext();
  if (!canManagePlayers(access.roles)) {
    return { error: "Brak uprawnień." };
  }

  if (!(await verifyPlayerInClub(playerId, access.clubId))) {
    return { error: "Nie znaleziono zawodnika w tym klubie." };
  }

  const file = formData.get("photo");
  if (!(file instanceof File)) {
    return { error: "Wybierz plik zdjęcia." };
  }

  const validationError = validateClubAssetFile(file, CLUB_ASSET_PHOTO_MIME_TYPES);
  if (validationError) {
    return { error: validationError };
  }

  const ext = photoExtensionForMime(file.type);
  if (!ext) {
    return { error: "Niedozwolony typ pliku." };
  }

  const path = playerPhotoPath(access.clubId, playerId, ext);
  const supabase = await createClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(CLUB_ASSETS_BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: true });

  if (uploadError) {
    return { error: "Nie udało się przesłać zdjęcia." };
  }

  const { error } = await supabase
    .from("players")
    .update({ photo_url: path })
    .eq("id", playerId)
    .eq("club_id", access.clubId);

  if (error) {
    await supabase.storage.from(CLUB_ASSETS_BUCKET).remove([path]);
    return { error: "Nie udało się zapisać zdjęcia profilowego." };
  }

  revalidatePlayerPaths(playerId);
  return { success: "Zdjęcie profilowe zaktualizowane." };
}

export async function uploadPlayerDocument(
  playerId: string,
  _prev: PlayerActionState,
  formData: FormData,
): Promise<PlayerActionState> {
  const access = await requireAccessContext();
  if (!canManagePlayers(access.roles)) {
    return { error: "Brak uprawnień." };
  }

  if (!(await verifyPlayerInClub(playerId, access.clubId))) {
    return { error: "Nie znaleziono zawodnika w tym klubie." };
  }

  const file = formData.get("file");
  const title = String(formData.get("title") ?? "").trim();
  const documentTypeResult = parsePlayerDocumentType(String(formData.get("documentType") ?? ""));

  if (!(file instanceof File)) {
    return { error: "Wybierz plik dokumentu." };
  }

  const validationError = validateClubAssetFile(file, CLUB_ASSET_DOCUMENT_MIME_TYPES);
  if (validationError) {
    return { error: validationError };
  }

  if (!title || !documentTypeResult.success) {
    return { error: "Podaj tytuł i typ dokumentu." };
  }

  const documentId = randomUUID();
  const safeFileName = sanitizeStorageFileName(file.name);
  const path = playerDocumentPath(access.clubId, playerId, documentId, safeFileName);
  const supabase = await createClient();
  const buffer = Buffer.from(await file.arrayBuffer());

  const { error: uploadError } = await supabase.storage
    .from(CLUB_ASSETS_BUCKET)
    .upload(path, buffer, { contentType: file.type, upsert: false });

  if (uploadError) {
    return { error: "Nie udało się przesłać dokumentu." };
  }

  const { error } = await supabase.from("player_documents").insert({
    id: documentId,
    club_id: access.clubId,
    player_id: playerId,
    document_type: documentTypeResult.data,
    title,
    storage_path: path,
    file_name: safeFileName,
    mime_type: file.type,
    file_size: file.size,
    expires_at: nullableString(formData.get("expiresAt")),
    notes: nullableString(formData.get("notes")),
    uploaded_by: access.userId,
  });

  if (error) {
    await supabase.storage.from(CLUB_ASSETS_BUCKET).remove([path]);
    return { error: "Nie udało się zapisać metadanych dokumentu." };
  }

  revalidatePlayerPaths(playerId);
  return { success: "Dokument dodany." };
}

export async function deletePlayerDocument(documentId: string, playerId: string) {
  const access = await requireAccessContext();
  if (!canManagePlayers(access.roles)) {
    return { error: "Brak uprawnień." };
  }

  if (!(await verifyPlayerInClub(playerId, access.clubId))) {
    return { error: "Nie znaleziono zawodnika w tym klubie." };
  }

  const supabase = await createClient();
  const { data: doc, error: fetchError } = await supabase
    .from("player_documents")
    .select("storage_path")
    .eq("id", documentId)
    .eq("player_id", playerId)
    .eq("club_id", access.clubId)
    .maybeSingle();

  if (fetchError || !doc) {
    return { error: "Nie znaleziono dokumentu." };
  }

  const { error: storageError } = await supabase.storage
    .from(CLUB_ASSETS_BUCKET)
    .remove([doc.storage_path]);

  if (storageError) {
    return { error: "Nie udało się usunąć pliku z magazynu." };
  }

  const { error } = await supabase
    .from("player_documents")
    .delete()
    .eq("id", documentId)
    .eq("club_id", access.clubId);

  if (error) {
    return { error: "Nie udało się usunąć dokumentu." };
  }

  revalidatePlayerPaths(playerId);
  return { success: "Dokument usunięty." };
}

export async function getDocumentSignedUrl(storagePath: string) {
  const access = await requireAccessContext();
  if (!hasPermission(access, "player:read")) {
    return { error: "Brak uprawnień." };
  }

  if (!isClubPlayerAssetPath(storagePath, access.clubId)) {
    return { error: "Nieprawidłowa ścieżka pliku." };
  }

  const supabase = await createClient();
  const [{ data: document }, { data: photoOwner }] = await Promise.all([
    supabase
      .from("player_documents")
      .select("id")
      .eq("storage_path", storagePath)
      .eq("club_id", access.clubId)
      .maybeSingle(),
    supabase
      .from("players")
      .select("id")
      .eq("photo_url", storagePath)
      .eq("club_id", access.clubId)
      .maybeSingle(),
  ]);

  if (!document && !photoOwner) {
    return { error: "Nie znaleziono pliku." };
  }

  const { data, error } = await supabase.storage
    .from(CLUB_ASSETS_BUCKET)
    .createSignedUrl(storagePath, 3600);

  if (error || !data?.signedUrl) {
    return { error: "Nie udało się wygenerować linku do pliku." };
  }

  return { url: data.signedUrl };
}

export async function addPlayerHistoryEntry(
  playerId: string,
  _prev: PlayerActionState,
  formData: FormData,
): Promise<PlayerActionState> {
  const access = await requireAccessContext();
  if (!canManagePlayers(access.roles)) {
    return { error: "Brak uprawnień." };
  }

  if (!(await verifyPlayerInClub(playerId, access.clubId))) {
    return { error: "Nie znaleziono zawodnika w tym klubie." };
  }

  const eventTypeResult = parsePlayerHistoryEventType(String(formData.get("eventType") ?? ""));
  const eventDate = String(formData.get("eventDate") ?? "").trim();

  if (!eventTypeResult.success || !eventDate) {
    return { error: "Podaj typ zdarzenia i datę." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("player_club_history").insert({
    club_id: access.clubId,
    player_id: playerId,
    event_type: eventTypeResult.data,
    event_date: eventDate,
    description: nullableString(formData.get("description")),
    previous_value: nullableString(formData.get("previousValue")),
    new_value: nullableString(formData.get("newValue")),
    related_club_name: nullableString(formData.get("relatedClubName")),
    created_by: access.userId,
  });

  if (error) {
    return { error: "Nie udało się dodać wpisu historii." };
  }

  revalidatePlayerPaths(playerId);
  return { success: "Wpis historii dodany." };
}

export async function addPlayerInjury(
  playerId: string,
  _prev: PlayerActionState,
  formData: FormData,
): Promise<PlayerActionState> {
  const access = await requireAccessContext();
  if (!canManagePlayers(access.roles)) {
    return { error: "Brak uprawnień." };
  }

  if (!(await verifyPlayerInClub(playerId, access.clubId))) {
    return { error: "Nie znaleziono zawodnika w tym klubie." };
  }

  const injuryDate = String(formData.get("injuryDate") ?? "").trim();
  const description = String(formData.get("description") ?? "").trim();

  if (!injuryDate || !description) {
    return { error: "Data kontuzji i opis są wymagane." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("player_injuries").insert({
    club_id: access.clubId,
    player_id: playerId,
    injury_date: injuryDate,
    recovery_date: nullableString(formData.get("recoveryDate")),
    description,
    severity: nullableString(formData.get("severity")),
    is_active: formData.get("isActive") === "on",
    created_by: access.userId,
  });

  if (error) {
    return { error: "Nie udało się dodać kontuzji." };
  }

  revalidatePlayerPaths(playerId);
  return { success: "Kontuzja zapisana." };
}

export async function addCoachNote(
  playerId: string,
  _prev: PlayerActionState,
  formData: FormData,
): Promise<PlayerActionState> {
  const access = await requireAccessContext();
  if (!canAccessCoachNotes(access.roles)) {
    return { error: "Notatki trenerskie są dostępne tylko dla sztabu szkoleniowego." };
  }

  if (!(await verifyPlayerInClub(playerId, access.clubId))) {
    return { error: "Nie znaleziono zawodnika w tym klubie." };
  }

  const noteTypeResult = parseCoachNoteType(String(formData.get("noteType") ?? "observation"));
  const content = String(formData.get("content") ?? "").trim();

  if (!noteTypeResult.success || !content) {
    return { error: "Podaj typ i treść notatki." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("player_coach_notes").insert({
    club_id: access.clubId,
    player_id: playerId,
    author_id: access.userId,
    note_type: noteTypeResult.data,
    content,
  });

  if (error) {
    return { error: "Nie udało się dodać notatki." };
  }

  revalidatePlayerPaths(playerId);
  return { success: "Notatka dodana." };
}

export async function updatePlayerStats(
  playerId: string,
  statsId: string,
  _prev: PlayerActionState,
  formData: FormData,
): Promise<PlayerActionState> {
  const access = await requireAccessContext();
  if (!canManagePlayers(access.roles)) {
    return { error: "Brak uprawnień." };
  }

  if (!(await verifyPlayerInClub(playerId, access.clubId))) {
    return { error: "Nie znaleziono zawodnika w tym klubie." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("player_stats")
    .update({
      matches_played: parseOptionalInt(formData.get("matchesPlayed")) ?? 0,
      goals: parseOptionalInt(formData.get("goals")) ?? 0,
      assists: parseOptionalInt(formData.get("assists")) ?? 0,
      yellow_cards: parseOptionalInt(formData.get("yellowCards")) ?? 0,
      red_cards: parseOptionalInt(formData.get("redCards")) ?? 0,
      minutes_played: parseOptionalInt(formData.get("minutesPlayed")) ?? 0,
    })
    .eq("id", statsId)
    .eq("player_id", playerId)
    .eq("club_id", access.clubId);

  if (error) {
    return { error: "Nie udało się zaktualizować statystyk." };
  }

  revalidatePlayerPaths(playerId);
  return { success: "Statystyki zaktualizowane." };
}
