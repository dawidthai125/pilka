import { DEFAULT_COMPETITION, DEFAULT_SEASON } from "@/lib/matches/constants";
import {
  detectDuplicateExternalIds,
  detectEmptyTeamNames,
  detectInvalidScores,
  detectMismatchedIdentifiers,
  mergeQualityIssues,
} from "@/lib/integrations/quality";
import {
  getPrimaryClubMapping,
  isOwnClubTeamName,
  resolvePublicTeamName,
} from "@/lib/integrations/mappers";
import { capQualityIssues, mapExternalMatchStatus } from "@/lib/integrations/validation";
import { createClient } from "@/lib/supabase/server";
import { dzpnClient } from "@/integrations/dzpn";
import { pzpnClient } from "@/integrations/pzpn";
import type {
  ExternalTeam,
  IntegrationClubMapping,
  IntegrationProvider,
  QualityIssue,
  SyncJobType,
  SyncLogStatus,
  SyncTriggerType,
} from "@/types/integrations";

export type RunSyncParams = {
  clubId: string;
  userId: string;
  provider: IntegrationProvider;
  jobType: SyncJobType;
  triggerType: SyncTriggerType;
  integrationId?: string | null;
  sourceId?: string | null;
  competition?: string;
  season?: string;
};

export type RunSyncResult = {
  syncJobId: string;
  syncLogId: string;
  status: SyncLogStatus;
  message: string;
  recordsProcessed: number;
  recordsFailed: number;
  qualityIssues: QualityIssue[];
};

type PendingConflict = {
  entityType: string;
  entityKey: string;
  localData: Record<string, unknown>;
  externalData: Record<string, unknown>;
};

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

async function loadExternalTeams(clubId: string): Promise<ExternalTeam[]> {
  const supabase = await createClient();
  const { data } = await supabase.from("external_teams").select("*").eq("club_id", clubId);
  return (data ?? []).map((row) => ({
    id: String(row.id),
    clubId,
    teamId: row.team_id ? String(row.team_id) : null,
    provider: row.provider as ExternalTeam["provider"],
    externalId: String(row.external_id),
    externalName: String(row.external_name),
    categoryLabel: String(row.category_label),
    competition: String(row.competition),
    season: String(row.season),
  }));
}

async function resolveTeamIdForMatch(
  clubId: string,
  home: string,
  away: string,
  mappings: IntegrationClubMapping[],
  externalTeams: ExternalTeam[],
): Promise<string | null> {
  const supabase = await createClient();
  const ownSide = isOwnClubTeamName(home, mappings) ? home : isOwnClubTeamName(away, mappings) ? away : null;
  if (ownSide) {
    const normalizedOwn = ownSide.trim().toLowerCase();
    const mapped = externalTeams.find(
      (t) =>
        t.externalName.trim().toLowerCase() === normalizedOwn ||
        mappings.some(
          (m) =>
            normalizedOwn === m.leagueName.trim().toLowerCase() &&
            t.externalName.trim().toLowerCase() === m.leagueName.trim().toLowerCase(),
        ),
    );
    if (mapped?.teamId) return mapped.teamId;
  }

  const seniorTeamRes = await supabase
    .from("teams")
    .select("id")
    .eq("club_id", clubId)
    .eq("category", "seniors")
    .maybeSingle();
  return seniorTeamRes.data?.id ? String(seniorTeamRes.data.id) : null;
}

async function writeSyncLog(params: {
  clubId: string;
  userId: string;
  integrationId: string | null;
  syncJobId: string;
  sourceId: string | null;
  provider: IntegrationProvider;
  jobType: SyncJobType;
  triggerType: SyncTriggerType;
  status: SyncLogStatus;
  message: string;
  recordsProcessed: number;
  recordsFailed: number;
  qualityIssues: QualityIssue[];
}): Promise<string> {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sync_logs")
    .insert({
      club_id: params.clubId,
      integration_id: params.integrationId,
      sync_job_id: params.syncJobId,
      source_id: params.sourceId,
      provider: params.provider,
      job_type: params.jobType,
      trigger_type: params.triggerType,
      status: params.status,
      message: params.message,
      records_processed: params.recordsProcessed,
      records_failed: params.recordsFailed,
      quality_issues: capQualityIssues(params.qualityIssues),
      created_by: params.userId,
    })
    .select("id")
    .single();
  if (error) throw new Error(error.message);
  return String(data.id);
}

async function persistConflicts(
  clubId: string,
  syncLogId: string,
  conflicts: PendingConflict[],
): Promise<void> {
  if (!conflicts.length) return;
  const supabase = await createClient();
  const { error } = await supabase.from("sync_conflicts").insert(
    conflicts.map((c) => ({
      club_id: clubId,
      sync_log_id: syncLogId,
      entity_type: c.entityType,
      entity_key: c.entityKey,
      local_data: c.localData,
      external_data: c.externalData,
      status: "pending",
    })),
  );
  if (error) throw new Error(error.message);
}

async function syncLeagueTableFromStaging(
  clubId: string,
  mappings: IntegrationClubMapping[],
  competition: string,
  season: string,
): Promise<{ processed: number; failed: number; issues: QualityIssue[] }> {
  const supabase = await createClient();
  const { data: leagueRows, error } = await supabase
    .from("league_table_entries")
    .select("team_name")
    .eq("club_id", clubId)
    .eq("competition", competition)
    .eq("season", season);

  if (error) throw new Error(error.message);

  let processed = 0;
  for (const row of leagueRows ?? []) {
    const teamName = String(row.team_name);
    if (!isOwnClubTeamName(teamName, mappings)) continue;
    processed += 1;
    await supabase
      .from("league_table_entries")
      .update({ is_own_club: true })
      .eq("club_id", clubId)
      .eq("competition", competition)
      .eq("season", season)
      .eq("team_name", teamName);
  }

  await supabase
    .from("external_leagues")
    .update({ last_synced_at: new Date().toISOString() })
    .eq("club_id", clubId)
    .eq("competition", competition)
    .eq("season", season);

  return { processed, failed: 0, issues: [] };
}

async function syncFixturesFromStaging(
  clubId: string,
  mappings: IntegrationClubMapping[],
  externalTeams: ExternalTeam[],
  competition: string,
  season: string,
  pendingConflicts: PendingConflict[],
): Promise<{ processed: number; failed: number; issues: QualityIssue[] }> {
  const supabase = await createClient();
  const { data: externalMatches, error } = await supabase
    .from("external_matches")
    .select("*")
    .eq("club_id", clubId)
    .eq("competition", competition)
    .eq("season", season);

  if (error) throw new Error(error.message);

  const rows = externalMatches ?? [];
  const issues = mergeQualityIssues(
    detectDuplicateExternalIds(rows.map((r) => String(r.external_id))),
    detectEmptyTeamNames(
      rows.map((r) => ({
        homeTeamName: String(r.home_team_name),
        awayTeamName: String(r.away_team_name),
      })),
    ),
    detectInvalidScores(
      rows.map((r) => ({
        homeTeamName: String(r.home_team_name),
        awayTeamName: String(r.away_team_name),
        homeScore: r.home_score != null ? Number(r.home_score) : null,
        awayScore: r.away_score != null ? Number(r.away_score) : null,
      })),
    ),
    detectMismatchedIdentifiers(rows.map((r) => ({ externalId: String(r.external_id) }))),
  );

  const teamId = await resolveTeamIdForMatch(clubId, "", "", mappings, externalTeams);
  if (!teamId) {
    issues.push({ code: "missing_team", message: "Brak drużyny — skonfiguruj mapowanie drużyn lub dodaj seniorów." });
    return { processed: 0, failed: rows.length, issues };
  }

  let processed = 0;
  let failed = 0;

  for (const row of rows) {
    const home = String(row.home_team_name);
    const away = String(row.away_team_name);
    const involvesOwnClub = isOwnClubTeamName(home, mappings) || isOwnClubTeamName(away, mappings);
    if (!involvesOwnClub) continue;

    let linkedMatchId = row.match_id ? String(row.match_id) : null;

    const displayHome = isOwnClubTeamName(home, mappings) ? resolvePublicTeamName(home, mappings) : home;
    const displayAway = isOwnClubTeamName(away, mappings) ? resolvePublicTeamName(away, mappings) : away;
    const matchStatus = mapExternalMatchStatus(String(row.status ?? "planned"));
    const resolvedTeamId =
      (await resolveTeamIdForMatch(clubId, home, away, mappings, externalTeams)) ?? teamId;

    const externalPayload = {
      matchTime: String(row.match_time ?? "15:00"),
      homeScore: row.home_score != null ? Number(row.home_score) : null,
      awayScore: row.away_score != null ? Number(row.away_score) : null,
      status: matchStatus,
      homeTeamName: displayHome,
      awayTeamName: displayAway,
    };

    if (linkedMatchId) {
      const { data: existing } = await supabase
        .from("matches")
        .select("id, home_score, away_score, match_time, status")
        .eq("id", linkedMatchId)
        .eq("club_id", clubId)
        .maybeSingle();

      if (existing) {
        const scoreDiff =
          externalPayload.homeScore != null &&
          (existing.home_score !== externalPayload.homeScore ||
            existing.away_score !== externalPayload.awayScore);
        if (scoreDiff) {
          pendingConflicts.push({
            entityType: "match",
            entityKey: String(row.external_id),
            localData: {
              matchId: existing.id,
              homeScore: existing.home_score,
              awayScore: existing.away_score,
              status: existing.status,
            },
            externalData: externalPayload,
          });
        } else if (externalPayload.homeScore != null) {
          await supabase
            .from("matches")
            .update({
              home_score: externalPayload.homeScore,
              away_score: externalPayload.awayScore,
              status: matchStatus,
            })
            .eq("id", existing.id);
          processed += 1;
        }
        continue;
      }

      await supabase
        .from("external_matches")
        .update({ match_id: null })
        .eq("id", String(row.id));
      linkedMatchId = null;
    }

    const { data: duplicate } = await supabase
      .from("matches")
      .select("id, home_score, away_score")
      .eq("club_id", clubId)
      .eq("competition", competition)
      .eq("season", season)
      .eq("match_date", String(row.match_date))
      .eq("home_team_name", displayHome)
      .eq("away_team_name", displayAway)
      .maybeSingle();

    if (duplicate) {
      await supabase
        .from("external_matches")
        .update({ match_id: duplicate.id, synced_at: new Date().toISOString() })
        .eq("id", String(row.id));
      processed += 1;
      continue;
    }

    const { data: inserted, error: insertError } = await supabase
      .from("matches")
      .insert({
        club_id: clubId,
        team_id: resolvedTeamId,
        competition,
        season,
        round_number: row.round_number != null ? Number(row.round_number) : null,
        match_date: String(row.match_date),
        match_time: String(row.match_time ?? "15:00"),
        home_team_name: displayHome,
        away_team_name: displayAway,
        home_score: externalPayload.homeScore,
        away_score: externalPayload.awayScore,
        status: matchStatus,
      })
      .select("id")
      .single();

    if (insertError) {
      failed += 1;
      issues.push({ code: "insert_failed", message: insertError.message });
      continue;
    }

    await supabase
      .from("external_matches")
      .update({ match_id: inserted.id, synced_at: new Date().toISOString() })
      .eq("id", String(row.id));

    processed += 1;
  }

  return { processed, failed, issues };
}

export async function runIntegrationSync(params: RunSyncParams): Promise<RunSyncResult> {
  const supabase = await createClient();
  const competition = params.competition ?? DEFAULT_COMPETITION;
  const season = params.season ?? DEFAULT_SEASON;
  const startedAt = new Date().toISOString();
  const pendingConflicts: PendingConflict[] = [];

  if (params.integrationId) {
    const { data: integration } = await supabase
      .from("integrations")
      .select("provider, club_id")
      .eq("id", params.integrationId)
      .maybeSingle();
    if (!integration || String(integration.club_id) !== params.clubId) {
      throw new Error("Nieprawidłowy identyfikator integracji.");
    }
    if (integration.provider !== params.provider) {
      throw new Error("Integracja nie pasuje do wybranego źródła.");
    }
  }

  const { data: job, error: jobError } = await supabase
    .from("sync_jobs")
    .insert({
      club_id: params.clubId,
      integration_id: params.integrationId ?? null,
      job_type: params.jobType,
      trigger_type: params.triggerType,
      status: "running",
      started_at: startedAt,
      created_by: params.userId,
    })
    .select("id")
    .single();

  if (jobError) throw new Error(jobError.message);
  const syncJobId = String(job.id);

  let status: SyncLogStatus = "success";
  let message = "Synchronizacja zakończona.";
  let recordsProcessed = 0;
  let recordsFailed = 0;
  let qualityIssues: QualityIssue[] = [];

  try {
    if (params.provider === "pzpn" && params.jobType === "fixtures") {
      try {
        await pzpnClient.fetchFixtures(season);
      } catch (apiError) {
        qualityIssues.push({
          code: "api_unavailable",
          message: apiError instanceof Error ? apiError.message : "PZPN API niedostępne",
        });
        status = "error";
        message = "PZPN: brak publicznego API — użyj importu CSV/JSON lub stagingu.";
      }
    }

    if (params.provider === "dzpn" && params.jobType === "league_table") {
      try {
        await dzpnClient.fetchLeagueTable(competition, season);
      } catch {
        const mappings = await loadClubMappings(params.clubId);
        const result = await syncLeagueTableFromStaging(params.clubId, mappings, competition, season);
        recordsProcessed = result.processed;
        recordsFailed = result.failed;
        qualityIssues = result.issues;
        message = "DZPN: oznaczono własny klub w tabeli ze stagingu (brak live API).";
        if (qualityIssues.length) status = "partial";
      }
    }

    if (params.jobType === "fixtures" || params.jobType === "results" || params.jobType === "full") {
      if (status !== "error") {
        const mappings = await loadClubMappings(params.clubId);
        const externalTeams = await loadExternalTeams(params.clubId);
        if (!getPrimaryClubMapping(mappings)) {
          qualityIssues.push({
            code: "missing_mapping",
            message: "Brak mapowania klubu — dodaj w sekcji Mapowania.",
          });
          status = "error";
          message = "Synchronizacja meczów wymaga mapowania klubu.";
        } else {
          const result = await syncFixturesFromStaging(
            params.clubId,
            mappings,
            externalTeams,
            competition,
            season,
            pendingConflicts,
          );
          recordsProcessed += result.processed;
          recordsFailed += result.failed;
          qualityIssues = mergeQualityIssues(qualityIssues, result.issues);
          if (pendingConflicts.length > 0) status = "partial";
          if (result.failed > 0 || (result.issues.length > 0 && result.processed === 0)) {
            status = recordsProcessed > 0 ? "partial" : "error";
          } else if (recordsProcessed === 0 && params.jobType !== "full") {
            message = "Brak nowych meczów do synchronizacji ze stagingu.";
          } else {
            message = `Zsynchronizowano ${result.processed} mecz(ów) ze stagingu.`;
          }
        }
      }
    }

    if (params.jobType === "league_table" && params.provider !== "dzpn" && status !== "error") {
      const mappings = await loadClubMappings(params.clubId);
      const result = await syncLeagueTableFromStaging(params.clubId, mappings, competition, season);
      recordsProcessed += result.processed;
      qualityIssues = mergeQualityIssues(qualityIssues, result.issues);
      message = `Oznaczono ${result.processed} pozycji własnego klubu w tabeli.`;
    }

    await supabase
      .from("integrations")
      .update({
        last_sync_at: new Date().toISOString(),
        last_error: status === "error" ? message : null,
      })
      .eq("club_id", params.clubId)
      .eq("provider", params.provider);

    await supabase
      .from("sync_jobs")
      .update({
        status: status === "error" ? "failed" : "completed",
        completed_at: new Date().toISOString(),
        error_message: status === "error" ? message : null,
      })
      .eq("id", syncJobId);
  } catch (err) {
    status = "error";
    message = err instanceof Error ? err.message : "Błąd synchronizacji";
    await supabase
      .from("sync_jobs")
      .update({ status: "failed", completed_at: new Date().toISOString(), error_message: message })
      .eq("id", syncJobId);
  }

  const syncLogId = await writeSyncLog({
    clubId: params.clubId,
    userId: params.userId,
    integrationId: params.integrationId ?? null,
    syncJobId,
    sourceId: params.sourceId ?? null,
    provider: params.provider,
    jobType: params.jobType,
    triggerType: params.triggerType,
    status,
    message,
    recordsProcessed,
    recordsFailed,
    qualityIssues,
  });

  try {
    await persistConflicts(params.clubId, syncLogId, pendingConflicts);
  } catch (conflictErr) {
    qualityIssues = mergeQualityIssues(qualityIssues, [
      {
        code: "conflict_persist_failed",
        message: conflictErr instanceof Error ? conflictErr.message : "Nie udało się zapisać konfliktów.",
      },
    ]);
  }

  return {
    syncJobId,
    syncLogId,
    status,
    message,
    recordsProcessed,
    recordsFailed,
    qualityIssues: capQualityIssues(qualityIssues),
  };
}
