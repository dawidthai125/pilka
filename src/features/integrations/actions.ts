"use server";

import { revalidatePath } from "next/cache";

import {
  canManageIntegrations,
  canSyncIntegrations,
} from "@/config/permissions";
import { requireAccessContext } from "@/lib/auth/session";
import { isOwnClubTeamName } from "@/lib/integrations/mappers";
import {
  detectImportFormat,
  parseCsvFixtures,
  parseCsvLeagueTable,
  parseJsonImport,
} from "@/lib/integrations/import-parsers";
import {
  detectDuplicateExternalIds,
  detectInvalidScores,
  detectEmptyTeamNames,
  mergeQualityIssues,
} from "@/lib/integrations/quality";
import { runIntegrationSync } from "@/lib/integrations/sync-engine";
import {
  capQualityIssues,
  IMPORT_BATCH_SIZE,
  isIntegrationImportType,
  isIntegrationProvider,
  isSyncConflictStatus,
  isSyncJobType,
  isValidIntegrationBaseUrl,
  mapExternalMatchStatus,
  mapExternalMatchStatusForStaging,
  MAX_IMPORT_FILE_BYTES,
  MAX_IMPORT_ROWS,
  stableFixtureExternalId,
} from "@/lib/integrations/validation";
import { DEFAULT_COMPETITION, DEFAULT_SEASON } from "@/lib/matches/constants";
import { readString } from "@/lib/form-data";
import { createClient } from "@/lib/supabase/server";
import type { IntegrationClubMapping, QualityIssue } from "@/types/integrations";

export type IntegrationActionState = { error?: string; success?: string };

const REVALIDATE_PATHS = [
  "/integrations",
  "/integrations/pzpn",
  "/integrations/dzpn",
  "/integrations/extranet",
  "/integrations/manual",
  "/integrations/imports",
  "/integrations/mappings",
  "/integrations/sync",
  "/matches",
  "/matches/league-table",
];

function revalidateIntegrationPaths() {
  for (const path of REVALIDATE_PATHS) revalidatePath(path);
}

async function loadClubMappings(clubId: string): Promise<IntegrationClubMapping[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("integration_club_mappings")
    .select("*")
    .eq("club_id", clubId);
  return (data ?? []).map((row) => ({
    id: String(row.id),
    clubId,
    publicName: String(row.public_name),
    leagueName: String(row.league_name),
    externalClubId: row.external_club_id ? String(row.external_club_id) : null,
    provider: row.provider as IntegrationClubMapping["provider"],
    isPrimary: Boolean(row.is_primary),
    notes: row.notes ? String(row.notes) : null,
  }));
}

async function assertTeamBelongsToClub(clubId: string, teamId: string): Promise<boolean> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("teams")
    .select("id")
    .eq("id", teamId)
    .eq("club_id", clubId)
    .maybeSingle();
  return Boolean(data);
}

async function assertIntegrationBelongsToClub(
  clubId: string,
  integrationId: string,
  provider?: string,
): Promise<{ ok: true } | { ok: false; error: string }> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("integrations")
    .select("provider, club_id")
    .eq("id", integrationId)
    .maybeSingle();
  if (!data || String(data.club_id) !== clubId) {
    return { ok: false, error: "Nieprawidłowa integracja." };
  }
  if (provider && data.provider !== provider) {
    return { ok: false, error: "Integracja nie pasuje do źródła." };
  }
  return { ok: true };
}

export async function runIntegrationSyncAction(
  _prev: IntegrationActionState,
  formData: FormData,
): Promise<IntegrationActionState> {
  const access = await requireAccessContext();
  if (!canSyncIntegrations(access.roles)) return { error: "Brak uprawnień do synchronizacji." };

  const providerRaw = readString(formData, "provider");
  const jobTypeRaw = readString(formData, "jobType");
  const integrationId = readString(formData, "integrationId") || null;

  if (!isIntegrationProvider(providerRaw) || !isSyncJobType(jobTypeRaw)) {
    return { error: "Wybierz poprawną integrację i typ synchronizacji." };
  }

  if (integrationId) {
    const check = await assertIntegrationBelongsToClub(access.clubId, integrationId, providerRaw);
    if (!check.ok) return { error: check.error };
  }

  const result = await runIntegrationSync({
    clubId: access.clubId,
    userId: access.userId,
    provider: providerRaw,
    jobType: jobTypeRaw,
    triggerType: "manual",
    integrationId,
    competition: readString(formData, "competition") || DEFAULT_COMPETITION,
    season: readString(formData, "season") || DEFAULT_SEASON,
  });

  revalidateIntegrationPaths();
  return {
    success:
      result.status === "error"
        ? undefined
        : `${result.message} (przetworzono: ${result.recordsProcessed}, błędy: ${result.recordsFailed})`,
    error: result.status === "error" ? result.message : undefined,
  };
}

export async function importIntegrationFileAction(
  _prev: IntegrationActionState,
  formData: FormData,
): Promise<IntegrationActionState> {
  const access = await requireAccessContext();
  if (!canSyncIntegrations(access.roles)) return { error: "Brak uprawnień do importu." };

  const file = formData.get("file");
  const importTypeRaw = readString(formData, "importType");
  if (!(file instanceof File) || file.size === 0) return { error: "Wybierz plik." };
  if (!isIntegrationImportType(importTypeRaw)) return { error: "Wybierz typ importu." };
  if (file.size > MAX_IMPORT_FILE_BYTES) {
    return { error: `Plik przekracza limit ${MAX_IMPORT_FILE_BYTES / (1024 * 1024)} MB.` };
  }

  if (file.name.toLowerCase().endsWith(".xlsx") || file.name.toLowerCase().endsWith(".xls")) {
    return { error: "Excel: zapisz plik jako CSV i zaimportuj ponownie." };
  }

  const content = await file.text();
  const format = detectImportFormat(file.name, content);
  const supabase = await createClient();

  const { data: importRow, error: importInsertError } = await supabase
    .from("integration_imports")
    .insert({
      club_id: access.clubId,
      file_name: file.name,
      format,
      import_type: importTypeRaw,
      status: "processing",
      created_by: access.userId,
    })
    .select("id")
    .single();

  if (importInsertError) return { error: importInsertError.message };
  const importId = String(importRow.id);

  let rowsTotal = 0;
  let rowsImported = 0;
  let rowsFailed = 0;
  let qualityIssues: QualityIssue[] = [];

  try {
    const clubMappings = await loadClubMappings(access.clubId);

    if (importTypeRaw === "league_table") {
      const rows =
        format === "json"
          ? (parseJsonImport(content, "league_table") as ReturnType<typeof parseCsvLeagueTable>)
          : parseCsvLeagueTable(content);
      if (rows.length > MAX_IMPORT_ROWS) {
        throw new Error(`Import przekracza limit ${MAX_IMPORT_ROWS} wierszy.`);
      }
      rowsTotal = rows.length;
      qualityIssues.push(...detectDuplicateExternalIds(rows.map((r) => r.teamName)));

      for (let i = 0; i < rows.length; i += IMPORT_BATCH_SIZE) {
        const batch = rows.slice(i, i + IMPORT_BATCH_SIZE);
        const payload = batch.map((row) => ({
          club_id: access.clubId,
          competition: DEFAULT_COMPETITION,
          season: DEFAULT_SEASON,
          team_name: row.teamName,
          played: row.played,
          won: row.won,
          drawn: row.drawn,
          lost: row.lost,
          goals_for: row.goalsFor,
          goals_against: row.goalsAgainst,
          points: row.points,
          is_own_club: isOwnClubTeamName(row.teamName, clubMappings),
        }));

        const { error } = await supabase.from("league_table_entries").upsert(payload, {
          onConflict: "club_id,competition,season,team_name",
        });
        if (error) {
          rowsFailed += batch.length;
          qualityIssues.push({ code: "upsert_failed", message: error.message });
        } else {
          rowsImported += batch.length;
        }
      }
    } else {
      const rows =
        format === "json"
          ? (parseJsonImport(content, importTypeRaw === "results" ? "results" : "fixtures") as ReturnType<
              typeof parseCsvFixtures
            >)
          : parseCsvFixtures(content);
      if (rows.length > MAX_IMPORT_ROWS) {
        throw new Error(`Import przekracza limit ${MAX_IMPORT_ROWS} wierszy.`);
      }
      rowsTotal = rows.length;
      qualityIssues.push(
        ...mergeQualityIssues(
          detectDuplicateExternalIds(
            rows.map(
              (r) =>
                r.externalId ??
                stableFixtureExternalId(r.homeTeamName, r.awayTeamName, r.matchDate, r.roundNumber),
            ),
          ),
          detectInvalidScores(rows),
          detectEmptyTeamNames(rows),
        ),
      );

      for (let i = 0; i < rows.length; i += IMPORT_BATCH_SIZE) {
        const batch = rows.slice(i, i + IMPORT_BATCH_SIZE);
        const payload = batch.map((row) => {
          const externalId =
            row.externalId ??
            stableFixtureExternalId(row.homeTeamName, row.awayTeamName, row.matchDate, row.roundNumber);
          return {
            club_id: access.clubId,
            provider: "manual" as const,
            external_id: externalId,
            competition: DEFAULT_COMPETITION,
            season: DEFAULT_SEASON,
            round_number: row.roundNumber ?? null,
            match_date: row.matchDate,
            match_time: row.matchTime ?? "15:00",
            home_team_name: row.homeTeamName,
            away_team_name: row.awayTeamName,
            home_score: row.homeScore ?? null,
            away_score: row.awayScore ?? null,
            status: mapExternalMatchStatusForStaging(row.status),
            raw_payload: { source: "file_import", fileName: file.name },
          };
        });

        const { error } = await supabase.from("external_matches").upsert(payload, {
          onConflict: "club_id,provider,external_id",
        });
        if (error) {
          rowsFailed += batch.length;
          qualityIssues.push({ code: "upsert_failed", message: error.message });
        } else {
          rowsImported += batch.length;
        }
      }
    }

    qualityIssues = capQualityIssues(qualityIssues);

    const syncResult = await runIntegrationSync({
      clubId: access.clubId,
      userId: access.userId,
      provider: "manual",
      jobType: importTypeRaw === "league_table" ? "league_table" : importTypeRaw === "results" ? "results" : "fixtures",
      triggerType: "import",
      integrationId: null,
    });

    const status = rowsFailed > 0 ? "partial" : "completed";
    await supabase
      .from("integration_imports")
      .update({
        status,
        rows_total: rowsTotal,
        rows_imported: rowsImported,
        rows_failed: rowsFailed,
        quality_issues: qualityIssues,
        sync_log_id: syncResult.syncLogId,
        completed_at: new Date().toISOString(),
      })
      .eq("id", importId);

    revalidateIntegrationPaths();
    return {
      success: `Import zakończony: ${rowsImported}/${rowsTotal} wierszy. ${syncResult.message}`,
    };
  } catch (err) {
    await supabase
      .from("integration_imports")
      .update({
        status: "failed",
        rows_total: rowsTotal,
        rows_imported: rowsImported,
        rows_failed: rowsFailed,
        quality_issues: capQualityIssues(qualityIssues),
        completed_at: new Date().toISOString(),
      })
      .eq("id", importId);
    return { error: err instanceof Error ? err.message : "Błąd importu." };
  }
}

export async function upsertClubMappingAction(
  _prev: IntegrationActionState,
  formData: FormData,
): Promise<IntegrationActionState> {
  const access = await requireAccessContext();
  if (!canManageIntegrations(access.roles)) return { error: "Brak uprawnień." };

  const publicName = readString(formData, "publicName");
  const leagueName = readString(formData, "leagueName");
  if (!publicName || !leagueName) return { error: "Podaj obie nazwy." };

  const providerRaw = readString(formData, "provider");
  const provider = providerRaw && isIntegrationProvider(providerRaw) ? providerRaw : null;

  const supabase = await createClient();
  const { error } = await supabase.from("integration_club_mappings").upsert(
    {
      id: readString(formData, "id") || crypto.randomUUID(),
      club_id: access.clubId,
      public_name: publicName,
      league_name: leagueName,
      external_club_id: readString(formData, "externalClubId") || null,
      provider,
      is_primary: formData.get("isPrimary") === "on",
      notes: readString(formData, "notes") || null,
    },
    { onConflict: "club_id,public_name,league_name" },
  );

  if (error) return { error: error.message };
  revalidateIntegrationPaths();
  return { success: "Mapowanie klubu zapisane." };
}

export async function upsertExternalTeamMappingAction(
  _prev: IntegrationActionState,
  formData: FormData,
): Promise<IntegrationActionState> {
  const access = await requireAccessContext();
  if (!canManageIntegrations(access.roles)) return { error: "Brak uprawnień." };

  const externalName = readString(formData, "externalName");
  const categoryLabel = readString(formData, "categoryLabel");
  const externalId = readString(formData, "externalId");
  if (!externalName || !categoryLabel || !externalId) return { error: "Uzupełnij wymagane pola." };

  const teamId = readString(formData, "teamId") || null;
  if (teamId) {
    const belongs = await assertTeamBelongsToClub(access.clubId, teamId);
    if (!belongs) return { error: "Wybrana drużyna nie należy do klubu." };
  }

  const providerRaw = readString(formData, "provider") || "dzpn";
  if (!isIntegrationProvider(providerRaw)) return { error: "Nieprawidłowy provider." };

  const supabase = await createClient();
  const { error } = await supabase.from("external_teams").upsert(
    {
      id: readString(formData, "id") || crypto.randomUUID(),
      club_id: access.clubId,
      team_id: teamId,
      provider: providerRaw,
      external_id: externalId,
      external_name: externalName,
      category_label: categoryLabel,
      competition: readString(formData, "competition") || DEFAULT_COMPETITION,
      season: readString(formData, "season") || DEFAULT_SEASON,
    },
    { onConflict: "club_id,provider,external_id,season" },
  );

  if (error) return { error: error.message };
  revalidateIntegrationPaths();
  return { success: "Mapowanie drużyny zapisane." };
}

export async function resolveSyncConflictAction(
  _prev: IntegrationActionState,
  formData: FormData,
): Promise<IntegrationActionState> {
  const access = await requireAccessContext();
  if (!canManageIntegrations(access.roles)) return { error: "Brak uprawnień." };

  const conflictId = readString(formData, "conflictId");
  const resolutionRaw = readString(formData, "resolution");
  if (!conflictId || !isSyncConflictStatus(resolutionRaw) || resolutionRaw === "pending") {
    return { error: "Brak danych konfliktu." };
  }

  const supabase = await createClient();
  const { data: conflict } = await supabase
    .from("sync_conflicts")
    .select("*")
    .eq("id", conflictId)
    .eq("club_id", access.clubId)
    .maybeSingle();

  if (!conflict) return { error: "Nie znaleziono konfliktu." };

  const { error } = await supabase
    .from("sync_conflicts")
    .update({
      status: resolutionRaw,
      resolved_by: access.userId,
      resolved_at: new Date().toISOString(),
    })
    .eq("id", conflictId);

  if (error) return { error: error.message };

  if (conflict.entity_type === "match") {
    const external = conflict.external_data as Record<string, unknown>;
    const local = conflict.local_data as Record<string, unknown>;
    const matchId = local.matchId ? String(local.matchId) : null;

    await supabase
      .from("external_matches")
      .update({
        match_time: String(external.matchTime ?? "15:00"),
        home_score: external.homeScore != null ? Number(external.homeScore) : null,
        away_score: external.awayScore != null ? Number(external.awayScore) : null,
        status: mapExternalMatchStatusForStaging(String(external.status ?? "planned")),
      })
      .eq("club_id", access.clubId)
      .eq("external_id", String(conflict.entity_key));

    if (resolutionRaw === "keep_external" && matchId) {
      await supabase
        .from("matches")
        .update({
          home_score: external.homeScore != null ? Number(external.homeScore) : null,
          away_score: external.awayScore != null ? Number(external.awayScore) : null,
          status: mapExternalMatchStatus(String(external.status ?? "planned")),
        })
        .eq("id", matchId)
        .eq("club_id", access.clubId);
    }
  }

  revalidateIntegrationPaths();
  return { success: "Konflikt rozstrzygnięty." };
}

export async function updateIntegrationConfigAction(
  _prev: IntegrationActionState,
  formData: FormData,
): Promise<IntegrationActionState> {
  const access = await requireAccessContext();
  if (!canManageIntegrations(access.roles)) return { error: "Brak uprawnień." };

  const integrationId = readString(formData, "integrationId");
  if (!integrationId) return { error: "Brak identyfikatora integracji." };

  const baseUrl = readString(formData, "baseUrl");
  if (baseUrl && !isValidIntegrationBaseUrl(baseUrl)) {
    return { error: "URL musi być poprawnym adresem http(s)." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("integrations")
    .update({
      status: readString(formData, "status") || "ready",
      base_url: baseUrl || null,
      auto_sync_enabled: formData.get("autoSyncEnabled") === "on",
      api_key_configured: formData.get("apiKeyConfigured") === "on",
    })
    .eq("id", integrationId)
    .eq("club_id", access.clubId);

  if (error) return { error: error.message };
  revalidateIntegrationPaths();
  return { success: "Konfiguracja zapisana." };
}
