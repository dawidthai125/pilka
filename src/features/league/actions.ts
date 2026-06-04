"use server";

import { revalidatePath } from "next/cache";

import {
  canManageLeague,
  canSyncLeague,
} from "@/config/permissions";
import { requireAccessContext } from "@/lib/auth/session";
import { detectImportFormat } from "@/lib/integrations/import-parsers";
import { getLeagueAdapter } from "@/lib/league/adapters";
import { MAX_LEAGUE_IMPORT_BYTES } from "@/lib/league/constants";
import {
  assertLeagueCompetitionBelongsToClub,
  assertLeagueImportContext,
  assertLeagueSeasonBelongsToClub,
  assertPlayerBelongsToClub,
  isAllowedLeagueImportFileName,
  MAX_LEAGUE_IMPORT_ROWS,
} from "@/lib/league/validation";
import {
  ingestLeaguePayload,
  resolveLeagueConflict,
  runLeagueSyncJob,
} from "@/lib/league/sync";
import {
  bulkApproveHighConfidenceMatches,
  recomputeLeaguePlayerMatches,
} from "@/lib/league/player-match-service";
import { MATCH_AUTO_THRESHOLD } from "@/lib/league/player-matching";
import { readString } from "@/lib/form-data";
import {
  buildSyncJobCompleteFields,
  buildSyncJobStartFields,
  detectProviderFromSourceConfig,
} from "@/lib/league/sync-job-meta";
import { createClient } from "@/lib/supabase/server";
import type { LeagueImportType, LeagueSourceAdapter } from "@/types/league";

async function resolveActiveLeagueProvider(clubId: string) {
  const supabase = await createClient();
  const { data } = await supabase
    .from("league_sources")
    .select("config")
    .eq("club_id", clubId)
    .eq("is_active", true)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();
  const config =
    data?.config && typeof data.config === "object" ? (data.config as Record<string, unknown>) : null;
  return detectProviderFromSourceConfig(config);
}

export type LeagueActionState = { error?: string; success?: string };

const REVALIDATE_PATHS = [
  "/league",
  "/league/table",
  "/league/fixtures",
  "/league/import",
  "/league/sync",
  "/league/teams",
  "/league/players",
  "/league/sources",
  "/matches",
  "/matches/league-table",
];

function revalidateLeaguePaths() {
  for (const path of REVALIDATE_PATHS) revalidatePath(path);
}

function isLeagueImportType(value: string): value is LeagueImportType {
  return ["league_table", "fixtures", "results", "full"].includes(value);
}

function isLeagueAdapter(value: string): value is LeagueSourceAdapter {
  return ["csv", "json", "xlsx", "api", "extranet", "manual"].includes(value);
}

export async function importLeagueFileAction(
  _prev: LeagueActionState,
  formData: FormData,
): Promise<LeagueActionState> {
  const access = await requireAccessContext();
  if (!canSyncLeague(access.roles)) return { error: "Brak uprawnień do importu." };

  const competitionId = readString(formData, "competitionId");
  const seasonId = readString(formData, "seasonId");
  const importTypeRaw = readString(formData, "importType") || "full";
  const sourceId = readString(formData, "sourceId") || null;
  const adapterRaw = readString(formData, "adapter") || "csv";

  if (!competitionId || !seasonId) return { error: "Wybierz sezon i rozgrywki." };
  if (!isLeagueImportType(importTypeRaw)) return { error: "Nieprawidłowy typ importu." };
  if (!isLeagueAdapter(adapterRaw)) return { error: "Nieprawidłowy adapter." };

  const file = formData.get("file");
  if (!(file instanceof File) || file.size === 0) return { error: "Wybierz plik." };
  if (file.size > MAX_LEAGUE_IMPORT_BYTES) return { error: "Plik przekracza limit 5 MB." };
  if (!isAllowedLeagueImportFileName(file.name, adapterRaw)) {
    return { error: "Nieprawidłowe rozszerzenie pliku dla wybranego adaptera." };
  }

  const supabase = await createClient();
  const ctxCheck = await assertLeagueImportContext(supabase, access.clubId, {
    competitionId,
    seasonId,
    sourceId,
  });
  if ("error" in ctxCheck) return { error: ctxCheck.error };

  const jobStartMeta = buildSyncJobStartFields({
    provider: "manual_import",
    triggerSource: "import",
  });

  const { data: job, error: jobError } = await supabase
    .from("league_sync_jobs")
    .insert({
      club_id: access.clubId,
      source_id: sourceId,
      competition_id: competitionId,
      import_type: importTypeRaw,
      status: "pending",
      triggered_by: access.userId,
      ...jobStartMeta,
      metadata: { fileName: file.name, adapter: adapterRaw },
    })
    .select("id, created_at")
    .single();

  if (jobError || !job) return { error: jobError?.message ?? "Nie udało się utworzyć zadania." };

  const jobId = String(job.id);

  try {
    const content = await file.arrayBuffer();
    const format = detectImportFormat(file.name, new TextDecoder().decode(content.slice(0, 512)));
    const adapterKey = adapterRaw === "manual" ? (format === "json" ? "json" : "csv") : adapterRaw;
    const adapter = getLeagueAdapter(adapterKey);
    const payload = await adapter.parse(content, importTypeRaw, file.name);

    if (!payload.leagueTable.length && !payload.fixtures.length) {
      throw new Error("Plik nie zawiera rozpoznanych danych ligowych.");
    }

    const totalRows = payload.leagueTable.length + payload.fixtures.length;
    if (totalRows > MAX_LEAGUE_IMPORT_ROWS) {
      throw new Error(`Import przekracza limit ${MAX_LEAGUE_IMPORT_ROWS} wierszy.`);
    }

    const ingest = await ingestLeaguePayload({
      clubId: access.clubId,
      jobId,
      competitionId,
      seasonId,
      sourceId,
      payload,
      importType: importTypeRaw,
    });

    const sync = await runLeagueSyncJob({
      clubId: access.clubId,
      userId: access.userId,
      jobId,
      competitionId,
      importType: importTypeRaw,
      provider: "manual_import",
      triggerSource: "import",
      createdAt: job.created_at != null ? String(job.created_at) : null,
    });

    if (sourceId) {
      await supabase
        .from("league_sources")
        .update({ last_sync_at: new Date().toISOString() })
        .eq("id", sourceId)
        .eq("club_id", access.clubId);
    }

    revalidateLeaguePaths();
    return {
      success: `Import: ${ingest.processed} rekordów. ${sync.message}`,
    };
  } catch (err) {
    const completedAt = new Date().toISOString();
    const timing = buildSyncJobCompleteFields({
      startedAt: null,
      completedAt,
      createdAt: job.created_at != null ? String(job.created_at) : null,
    });
    await supabase
      .from("league_sync_jobs")
      .update({
        status: "failed",
        error_message: err instanceof Error ? err.message : "Błąd importu.",
        ...timing,
      })
      .eq("id", jobId)
      .eq("club_id", access.clubId);
    return { error: err instanceof Error ? err.message : "Błąd importu." };
  }
}

export async function runLeagueSyncAction(
  _prev: LeagueActionState,
  formData: FormData,
): Promise<LeagueActionState> {
  const access = await requireAccessContext();
  if (!canSyncLeague(access.roles)) return { error: "Brak uprawnień." };

  const competitionId = readString(formData, "competitionId");
  if (!competitionId) return { error: "Wybierz rozgrywki." };

  const supabase = await createClient();
  const belongs = await assertLeagueCompetitionBelongsToClub(supabase, access.clubId, competitionId);
  if (!belongs) return { error: "Rozgrywki nie należą do tego klubu." };

  const provider = await resolveActiveLeagueProvider(access.clubId);
  const jobStartMeta = buildSyncJobStartFields({
    provider,
    triggerSource: "club_user",
  });

  const { data: job, error } = await supabase
    .from("league_sync_jobs")
    .insert({
      club_id: access.clubId,
      competition_id: competitionId,
      import_type: "full",
      status: "pending",
      triggered_by: access.userId,
      ...jobStartMeta,
    })
    .select("id, created_at")
    .single();

  if (error || !job) return { error: error?.message ?? "Błąd tworzenia zadania." };

  try {
    const result = await runLeagueSyncJob({
      clubId: access.clubId,
      userId: access.userId,
      jobId: String(job.id),
      competitionId,
      importType: "full",
      provider,
      triggerSource: "club_user",
      createdAt: job.created_at != null ? String(job.created_at) : null,
    });
    revalidateLeaguePaths();
    return { success: result.message };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Błąd synchronizacji." };
  }
}

export async function resolveLeagueConflictAction(
  _prev: LeagueActionState,
  formData: FormData,
): Promise<LeagueActionState> {
  const access = await requireAccessContext();
  if (!canManageLeague(access.roles)) return { error: "Brak uprawnień." };

  const conflictId = readString(formData, "conflictId");
  const resolutionRaw = readString(formData, "resolution");
  if (!conflictId) return { error: "Brak identyfikatora konfliktu." };
  if (resolutionRaw !== "keep_local" && resolutionRaw !== "keep_external") {
    return { error: "Wybierz rozwiązanie konfliktu." };
  }

  try {
    await resolveLeagueConflict({
      clubId: access.clubId,
      conflictId,
      resolution: resolutionRaw,
      userId: access.userId,
    });
    revalidateLeaguePaths();
    return {
      success:
        resolutionRaw === "keep_external"
          ? "Przyjęto wynik z importu ligowego."
          : "Zachowano dane lokalne w module Mecze.",
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Błąd rozwiązywania konfliktu." };
  }
}

export async function upsertLeagueTeamAction(
  _prev: LeagueActionState,
  formData: FormData,
): Promise<LeagueActionState> {
  const access = await requireAccessContext();
  if (!canManageLeague(access.roles)) return { error: "Brak uprawnień." };

  const competitionId = readString(formData, "competitionId");
  const displayName = readString(formData, "displayName");
  const leagueName = readString(formData, "leagueName");
  if (!competitionId || !displayName || !leagueName) return { error: "Uzupełnij wymagane pola." };

  const supabase = await createClient();
  const belongs = await assertLeagueCompetitionBelongsToClub(supabase, access.clubId, competitionId);
  if (!belongs) return { error: "Rozgrywki nie należą do tego klubu." };

  const teamId = readString(formData, "teamId") || null;
  if (teamId) {
    const { data } = await supabase
      .from("teams")
      .select("id")
      .eq("id", teamId)
      .eq("club_id", access.clubId)
      .maybeSingle();
    if (!data) return { error: "Wybrana drużyna nie należy do klubu." };
  }

  const { error } = await supabase.from("league_teams").upsert(
    {
      id: readString(formData, "id") || crypto.randomUUID(),
      club_id: access.clubId,
      competition_id: competitionId,
      team_id: teamId,
      display_name: displayName,
      league_name: leagueName,
      external_id: readString(formData, "externalId") || null,
      is_own_club: formData.get("isOwnClub") === "on",
      provider: readString(formData, "provider") || null,
      notes: readString(formData, "notes") || null,
    },
    { onConflict: "club_id,competition_id,league_name" },
  );

  if (error) return { error: error.message };
  revalidateLeaguePaths();
  return { success: "Mapowanie drużyny zapisane." };
}

export async function upsertLeaguePlayerAction(
  _prev: LeagueActionState,
  formData: FormData,
): Promise<LeagueActionState> {
  const access = await requireAccessContext();
  if (!canManageLeague(access.roles)) return { error: "Brak uprawnień." };

  const leaguePlayerName = readString(formData, "leaguePlayerName");
  if (!leaguePlayerName) return { error: "Podaj nazwę ligową zawodnika." };

  const playerId = readString(formData, "playerId") || null;
  const competitionId = readString(formData, "competitionId") || null;
  const seasonId = readString(formData, "seasonId") || null;
  const supabase = await createClient();

  if (playerId) {
    const ok = await assertPlayerBelongsToClub(supabase, access.clubId, playerId);
    if (!ok) return { error: "Zawodnik nie należy do tego klubu." };
  }
  if (competitionId) {
    const ok = await assertLeagueCompetitionBelongsToClub(supabase, access.clubId, competitionId);
    if (!ok) return { error: "Rozgrywki nie należą do tego klubu." };
  }
  if (seasonId) {
    const ok = await assertLeagueSeasonBelongsToClub(supabase, access.clubId, seasonId);
    if (!ok) return { error: "Sezon nie należy do tego klubu." };
  }

  const { error } = await supabase.from("league_player_registry").upsert(
    {
      id: readString(formData, "id") || crypto.randomUUID(),
      club_id: access.clubId,
      competition_id: competitionId,
      season_id: seasonId,
      player_id: playerId,
      league_player_name: leaguePlayerName,
      league_team_name: readString(formData, "leagueTeamName") || null,
      external_id: readString(formData, "externalId") || null,
      jersey_number: readString(formData, "jerseyNumber")
        ? Number(readString(formData, "jerseyNumber"))
        : null,
      notes: readString(formData, "notes") || null,
      suggested_player_id: null,
      match_status: playerId ? "confirmed" : "unmatched",
      match_confidence: playerId ? 100 : null,
    },
    { onConflict: "id" },
  );

  if (error) return { error: error.message };
  revalidateLeaguePaths();
  return { success: "Powiązanie zawodnika zapisane." };
}

export async function approveLeaguePlayerMatchAction(
  _prev: LeagueActionState,
  formData: FormData,
): Promise<LeagueActionState> {
  const access = await requireAccessContext();
  if (!canManageLeague(access.roles)) return { error: "Brak uprawnień." };

  const registryId = readString(formData, "registryId");
  if (!registryId) return { error: "Brak wpisu rejestru." };

  const supabase = await createClient();
  const { data: row } = await supabase
    .from("league_player_registry")
    .select("id, player_id, suggested_player_id, match_confidence")
    .eq("id", registryId)
    .eq("club_id", access.clubId)
    .maybeSingle();

  if (!row) return { error: "Wpis nie istnieje." };

  const playerId = row.player_id ?? row.suggested_player_id;
  if (!playerId) return { error: "Brak kandydata do zatwierdzenia." };

  const ok = await assertPlayerBelongsToClub(supabase, access.clubId, String(playerId));
  if (!ok) return { error: "Zawodnik nie należy do tego klubu." };

  const { error } = await supabase
    .from("league_player_registry")
    .update({
      player_id: playerId,
      suggested_player_id: null,
      match_status: "confirmed",
    })
    .eq("id", registryId)
    .eq("club_id", access.clubId);

  if (error) return { error: error.message };
  revalidateLeaguePaths();
  return { success: "Powiązanie zatwierdzone." };
}

export async function rejectLeaguePlayerMatchAction(
  _prev: LeagueActionState,
  formData: FormData,
): Promise<LeagueActionState> {
  const access = await requireAccessContext();
  if (!canManageLeague(access.roles)) return { error: "Brak uprawnień." };

  const registryId = readString(formData, "registryId");
  if (!registryId) return { error: "Brak wpisu rejestru." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("league_player_registry")
    .update({
      player_id: null,
      suggested_player_id: null,
      match_status: "rejected",
      match_confidence: null,
    })
    .eq("id", registryId)
    .eq("club_id", access.clubId);

  if (error) return { error: error.message };
  revalidateLeaguePaths();
  return { success: "Sugestia odrzucona." };
}

export async function assignLeaguePlayerMatchAction(
  _prev: LeagueActionState,
  formData: FormData,
): Promise<LeagueActionState> {
  const access = await requireAccessContext();
  if (!canManageLeague(access.roles)) return { error: "Brak uprawnień." };

  const registryId = readString(formData, "registryId");
  const playerId = readString(formData, "playerId");
  if (!registryId || !playerId) return { error: "Wybierz zawodnika FC OS." };

  const supabase = await createClient();
  const ok = await assertPlayerBelongsToClub(supabase, access.clubId, playerId);
  if (!ok) return { error: "Zawodnik nie należy do tego klubu." };

  const { error } = await supabase
    .from("league_player_registry")
    .update({
      player_id: playerId,
      suggested_player_id: null,
      match_status: "confirmed",
      match_confidence: 100,
    })
    .eq("id", registryId)
    .eq("club_id", access.clubId);

  if (error) return { error: error.message };
  revalidateLeaguePaths();
  return { success: "Ręczne powiązanie zapisane." };
}

export async function recomputeLeaguePlayerMatchesAction(
  _prev: LeagueActionState,
): Promise<LeagueActionState> {
  const access = await requireAccessContext();
  if (!canManageLeague(access.roles)) return { error: "Brak uprawnień." };

  try {
    const result = await recomputeLeaguePlayerMatches(access.clubId);
    revalidateLeaguePaths();
    return {
      success: `Przeliczono ${result.updated} wpisów (${result.autoLinked} auto, ${result.suggested} sugestii, ${result.unmatched} bez dopasowania). Pominięto ${result.skipped} zatwierdzonych/odrzuconych.`,
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Błąd przeliczania." };
  }
}

export async function bulkApproveLeaguePlayerMatchesAction(
  _prev: LeagueActionState,
): Promise<LeagueActionState> {
  const access = await requireAccessContext();
  if (!canManageLeague(access.roles)) return { error: "Brak uprawnień." };

  try {
    const approved = await bulkApproveHighConfidenceMatches(access.clubId);
    revalidateLeaguePaths();
    return {
      success:
        approved > 0
          ? `Zatwierdzono ${approved} powiązań (≥${MATCH_AUTO_THRESHOLD}%).`
          : "Brak powiązań do zatwierdzenia z progiem ≥95%.",
    };
  } catch (err) {
    return { error: err instanceof Error ? err.message : "Błąd zatwierdzania." };
  }
}

export async function upsertLeagueSourceAction(
  _prev: LeagueActionState,
  formData: FormData,
): Promise<LeagueActionState> {
  const access = await requireAccessContext();
  if (!canManageLeague(access.roles)) return { error: "Brak uprawnień." };

  const name = readString(formData, "name");
  const adapterRaw = readString(formData, "adapter") || "manual";
  if (!name) return { error: "Podaj nazwę źródła." };
  if (!isLeagueAdapter(adapterRaw)) return { error: "Nieprawidłowy adapter." };

  const competitionId = readString(formData, "competitionId") || null;
  const supabase = await createClient();
  if (competitionId) {
    const ok = await assertLeagueCompetitionBelongsToClub(supabase, access.clubId, competitionId);
    if (!ok) return { error: "Rozgrywki nie należą do tego klubu." };
  }

  const { error } = await supabase.from("league_sources").upsert(
    {
      id: readString(formData, "id") || crypto.randomUUID(),
      club_id: access.clubId,
      competition_id: competitionId,
      name,
      adapter: adapterRaw,
      provider_label: readString(formData, "providerLabel") || null,
      is_active: formData.get("isActive") !== "off",
    },
    { onConflict: "id" },
  );

  if (error) return { error: error.message };
  revalidateLeaguePaths();
  return { success: "Źródło danych zapisane." };
}
