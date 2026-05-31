"use server";

import { revalidatePath } from "next/cache";

import {
  canManageMatchEvents,
  canManageMatches,
  canManageMatchSquad,
} from "@/config/permissions";
import { DEFAULT_CLUB_ID, requireAccessContext } from "@/lib/auth/session";
import {
  parseFormationCode,
  parseMatchEventType,
  parseMatchSquadRole,
  parseMatchStatus,
} from "@/lib/validators";
import { createClient } from "@/lib/supabase/server";

export type MatchActionState = { error?: string; success?: string; matchId?: string };

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

function revalidateMatchPaths(matchId?: string) {
  revalidatePath("/matches");
  revalidatePath("/matches/league-table");
  if (matchId) {
    revalidatePath(`/matches/${matchId}`);
    revalidatePath(`/matches/${matchId}/report`);
  }
}

async function verifyTeamInClub(teamId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("teams")
    .select("id")
    .eq("id", teamId)
    .eq("club_id", DEFAULT_CLUB_ID)
    .maybeSingle();
  return !!data;
}

async function verifyMatchInClub(matchId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("matches")
    .select("id, team_id, status")
    .eq("id", matchId)
    .eq("club_id", DEFAULT_CLUB_ID)
    .maybeSingle();
  return data;
}

async function verifyPlayerOnMatchTeam(matchId: string, playerId: string) {
  const match = await verifyMatchInClub(matchId);
  if (!match) return false;
  const supabase = await createClient();
  const { data } = await supabase
    .from("players")
    .select("id")
    .eq("id", playerId)
    .eq("club_id", DEFAULT_CLUB_ID)
    .eq("team_id", match.team_id)
    .maybeSingle();
  return !!data;
}

export async function createMatch(
  _prev: MatchActionState,
  formData: FormData,
): Promise<MatchActionState> {
  const access = await requireAccessContext();
  if (!canManageMatches(access.roles)) return { error: "Brak uprawnień." };

  const teamId = String(formData.get("teamId") ?? "").trim();
  const competition = String(formData.get("competition") ?? "").trim();
  const season = String(formData.get("season") ?? "").trim();
  const matchDate = String(formData.get("matchDate") ?? "").trim();
  const matchTime = String(formData.get("matchTime") ?? "").trim();
  const homeTeamName = String(formData.get("homeTeamName") ?? "").trim();
  const awayTeamName = String(formData.get("awayTeamName") ?? "").trim();
  const statusParsed = parseMatchStatus(String(formData.get("status") ?? "planned"));

  if (!teamId || !competition || !season || !matchDate || !matchTime || !homeTeamName || !awayTeamName) {
    return { error: "Wypełnij wymagane pola meczu." };
  }
  if (!statusParsed.success) return { error: "Nieprawidłowy status." };
  if (!(await verifyTeamInClub(teamId))) return { error: "Drużyna nie należy do klubu." };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("matches")
    .insert({
      club_id: DEFAULT_CLUB_ID,
      team_id: teamId,
      competition,
      season,
      round_number: parseOptionalInt(formData.get("roundNumber")),
      match_date: matchDate,
      match_time: matchTime,
      home_team_name: homeTeamName,
      away_team_name: awayTeamName,
      stadium: nullableString(formData.get("stadium")),
      stadium_address: nullableString(formData.get("stadiumAddress")),
      status: statusParsed.data,
      formation: nullableString(formData.get("formation")),
    })
    .select("id")
    .single();

  if (error || !data) return { error: error?.message ?? "Nie udało się utworzyć meczu." };
  revalidateMatchPaths(data.id);
  return { success: "Mecz utworzony.", matchId: data.id };
}

export async function updateMatch(
  matchId: string,
  _prev: MatchActionState,
  formData: FormData,
): Promise<MatchActionState> {
  const access = await requireAccessContext();
  if (!canManageMatches(access.roles)) return { error: "Brak uprawnień." };
  if (!(await verifyMatchInClub(matchId))) return { error: "Mecz nie istnieje." };

  const statusParsed = parseMatchStatus(String(formData.get("status") ?? "planned"));
  if (!statusParsed.success) return { error: "Nieprawidłowy status." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("matches")
    .update({
      team_id: String(formData.get("teamId") ?? "").trim(),
      competition: String(formData.get("competition") ?? "").trim(),
      season: String(formData.get("season") ?? "").trim(),
      round_number: parseOptionalInt(formData.get("roundNumber")),
      match_date: String(formData.get("matchDate") ?? "").trim(),
      match_time: String(formData.get("matchTime") ?? "").trim(),
      home_team_name: String(formData.get("homeTeamName") ?? "").trim(),
      away_team_name: String(formData.get("awayTeamName") ?? "").trim(),
      stadium: nullableString(formData.get("stadium")),
      stadium_address: nullableString(formData.get("stadiumAddress")),
      status: statusParsed.data,
      home_score: parseOptionalInt(formData.get("homeScore")),
      away_score: parseOptionalInt(formData.get("awayScore")),
      formation: nullableString(formData.get("formation")),
      coach_notes: nullableString(formData.get("coachNotes")),
    })
    .eq("id", matchId)
    .eq("club_id", DEFAULT_CLUB_ID);

  if (error) return { error: error.message };
  revalidateMatchPaths(matchId);
  return { success: "Mecz zaktualizowany." };
}

export async function setMatchSquadRole(
  matchId: string,
  _prev: MatchActionState,
  formData: FormData,
): Promise<MatchActionState> {
  const access = await requireAccessContext();
  if (!canManageMatchSquad(access.roles)) return { error: "Brak uprawnień." };
  if (!(await verifyMatchInClub(matchId))) return { error: "Mecz nie istnieje." };

  const playerId = String(formData.get("playerId") ?? "").trim();
  const roleParsed = parseMatchSquadRole(String(formData.get("squadRole") ?? ""));
  if (!playerId || !roleParsed.success) return { error: "Wybierz zawodnika i rolę." };
  if (!(await verifyPlayerOnMatchTeam(matchId, playerId))) {
    return { error: "Zawodnik nie należy do drużyny meczu." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("match_squad").upsert(
    {
      club_id: DEFAULT_CLUB_ID,
      match_id: matchId,
      player_id: playerId,
      squad_role: roleParsed.data,
    },
    { onConflict: "match_id,player_id" },
  );

  if (error) return { error: error.message };
  revalidateMatchPaths(matchId);
  return { success: "Kadra zaktualizowana." };
}

export async function saveMatchFormation(
  matchId: string,
  _prev: MatchActionState,
  formData: FormData,
): Promise<MatchActionState> {
  const access = await requireAccessContext();
  if (!canManageMatchSquad(access.roles)) return { error: "Brak uprawnień." };
  if (!(await verifyMatchInClub(matchId))) return { error: "Mecz nie istnieje." };

  const formation = String(formData.get("formation") ?? "").trim();
  const formationParsed = parseFormationCode(formation);
  if (!formationParsed.success) return { error: "Nieprawidłowa formacja." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("matches")
    .update({ formation: formationParsed.data })
    .eq("id", matchId)
    .eq("club_id", DEFAULT_CLUB_ID);

  if (error) return { error: error.message };
  revalidateMatchPaths(matchId);
  return { success: "Formacja zapisana." };
}

export async function saveLineupPosition(
  matchId: string,
  _prev: MatchActionState,
  formData: FormData,
): Promise<MatchActionState> {
  const access = await requireAccessContext();
  if (!canManageMatchSquad(access.roles)) return { error: "Brak uprawnień." };

  const playerId = String(formData.get("playerId") ?? "").trim();
  const slotCode = String(formData.get("slotCode") ?? "").trim();
  const posX = Number(formData.get("posX"));
  const posY = Number(formData.get("posY"));

  if (!playerId || !slotCode || Number.isNaN(posX) || Number.isNaN(posY)) {
    return { error: "Nieprawidłowe dane pozycji." };
  }
  if (!(await verifyPlayerOnMatchTeam(matchId, playerId))) {
    return { error: "Zawodnik nie należy do drużyny meczu." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("match_lineup_positions").upsert(
    {
      club_id: DEFAULT_CLUB_ID,
      match_id: matchId,
      player_id: playerId,
      slot_code: slotCode,
      pos_x: posX,
      pos_y: posY,
    },
    { onConflict: "match_id,player_id" },
  );

  if (error) return { error: error.message };
  revalidateMatchPaths(matchId);
  return { success: "Pozycja zapisana." };
}

export async function addMatchEvent(
  matchId: string,
  _prev: MatchActionState,
  formData: FormData,
): Promise<MatchActionState> {
  const access = await requireAccessContext();
  if (!canManageMatchEvents(access.roles)) return { error: "Brak uprawnień." };

  const eventParsed = parseMatchEventType(String(formData.get("eventType") ?? ""));
  const minute = parseOptionalInt(formData.get("minute"));
  const playerId = nullableString(formData.get("playerId"));
  const relatedPlayerId = nullableString(formData.get("relatedPlayerId"));
  const notes = nullableString(formData.get("notes"));

  if (!eventParsed.success || minute === null) {
    return { error: "Wybierz typ zdarzenia i minutę." };
  }
  if (playerId && !(await verifyPlayerOnMatchTeam(matchId, playerId))) {
    return { error: "Zawodnik nie należy do drużyny meczu." };
  }
  if (relatedPlayerId && !(await verifyPlayerOnMatchTeam(matchId, relatedPlayerId))) {
    return { error: "Powiązany zawodnik nie należy do drużyny meczu." };
  }

  const supabase = await createClient();
  const { error } = await supabase.from("match_events").insert({
    club_id: DEFAULT_CLUB_ID,
    match_id: matchId,
    event_type: eventParsed.data,
    minute,
    player_id: playerId,
    related_player_id: relatedPlayerId,
    notes,
    created_by: access.userId,
  });

  if (error) return { error: error.message };
  revalidateMatchPaths(matchId);
  return { success: "Zdarzenie dodane." };
}

export async function setMatchMvp(
  matchId: string,
  _prev: MatchActionState,
  formData: FormData,
): Promise<MatchActionState> {
  const access = await requireAccessContext();
  if (!canManageMatches(access.roles)) return { error: "Brak uprawnień." };

  const playerId = String(formData.get("playerId") ?? "").trim();
  if (!playerId || !(await verifyPlayerOnMatchTeam(matchId, playerId))) {
    return { error: "Wybierz zawodnika z kadry meczu." };
  }

  const supabase = await createClient();
  const { error: matchError } = await supabase
    .from("matches")
    .update({ mvp_player_id: playerId })
    .eq("id", matchId)
    .eq("club_id", DEFAULT_CLUB_ID);

  if (matchError) return { error: matchError.message };

  const { error: mvpError } = await supabase.from("match_mvp_history").upsert(
    {
      club_id: DEFAULT_CLUB_ID,
      match_id: matchId,
      player_id: playerId,
      selected_by: access.userId,
    },
    { onConflict: "match_id" },
  );

  if (mvpError) return { error: mvpError.message };
  revalidateMatchPaths(matchId);
  return { success: "MVP meczu zapisany." };
}

export async function upsertLeagueTableEntry(
  _prev: MatchActionState,
  formData: FormData,
): Promise<MatchActionState> {
  const access = await requireAccessContext();
  if (!canManageMatches(access.roles)) return { error: "Brak uprawnień." };

  const competition = String(formData.get("competition") ?? "").trim();
  const season = String(formData.get("season") ?? "").trim();
  const teamName = String(formData.get("teamName") ?? "").trim();
  const entryId = nullableString(formData.get("entryId"));

  if (!competition || !season || !teamName) {
    return { error: "Wypełnij dane tabeli." };
  }

  const updatePayload = {
    played: parseOptionalInt(formData.get("played")) ?? 0,
    won: parseOptionalInt(formData.get("won")) ?? 0,
    drawn: parseOptionalInt(formData.get("drawn")) ?? 0,
    lost: parseOptionalInt(formData.get("lost")) ?? 0,
    goals_for: parseOptionalInt(formData.get("goalsFor")) ?? 0,
    goals_against: parseOptionalInt(formData.get("goalsAgainst")) ?? 0,
    points: parseOptionalInt(formData.get("points")) ?? 0,
    is_own_club: formData.get("isOwnClub") === "on",
  };

  const insertPayload = {
    club_id: DEFAULT_CLUB_ID,
    competition,
    season,
    team_name: teamName,
    ...updatePayload,
  };

  const supabase = await createClient();
  const { error } = entryId
    ? await supabase.from("league_table_entries").update(updatePayload).eq("id", entryId)
    : await supabase.from("league_table_entries").insert(insertPayload);

  if (error) return { error: error.message };
  revalidateMatchPaths();
  return { success: "Wpis tabeli zapisany." };
}
