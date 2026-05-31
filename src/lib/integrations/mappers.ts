import type {
  ExternalLeague,
  ExternalMatch,
  ExternalTeam,
  Integration,
  IntegrationClubMapping,
  IntegrationImport,
  IntegrationSource,
  QualityIssue,
  SyncConflict,
  SyncJob,
  SyncLog,
} from "@/types/integrations";

function parseJson(value: unknown): Record<string, unknown> {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    return value as Record<string, unknown>;
  }
  return {};
}

function parseIssues(value: unknown): QualityIssue[] {
  if (!Array.isArray(value)) return [];
  return value.map((item) => {
    const row = item as Record<string, unknown>;
    return {
      code: String(row.code ?? "unknown"),
      message: String(row.message ?? ""),
      row: row.row != null ? Number(row.row) : undefined,
      field: row.field ? String(row.field) : undefined,
    };
  });
}

export function mapIntegration(row: Record<string, unknown>): Integration {
  return {
    id: String(row.id),
    clubId: String(row.club_id),
    provider: row.provider as Integration["provider"],
    status: row.status as Integration["status"],
    baseUrl: row.base_url ? String(row.base_url) : null,
    apiKeyConfigured: Boolean(row.api_key_configured),
    autoSyncEnabled: Boolean(row.auto_sync_enabled),
    autoSyncIntervalMinutes: Number(row.auto_sync_interval_minutes ?? 1440),
    lastSyncAt: row.last_sync_at ? String(row.last_sync_at) : null,
    lastError: row.last_error ? String(row.last_error) : null,
    config: parseJson(row.config),
    createdAt: String(row.created_at),
    updatedAt: String(row.updated_at),
  };
}

export function mapIntegrationSource(row: Record<string, unknown>): IntegrationSource {
  return {
    id: String(row.id),
    clubId: String(row.club_id),
    integrationId: String(row.integration_id),
    name: String(row.name),
    format: row.format as IntegrationSource["format"],
    sourceUrl: row.source_url ? String(row.source_url) : null,
    filePath: row.file_path ? String(row.file_path) : null,
    isActive: Boolean(row.is_active),
    priority: Number(row.priority ?? 0),
    config: parseJson(row.config),
  };
}

export function mapIntegrationClubMapping(row: Record<string, unknown>): IntegrationClubMapping {
  return {
    id: String(row.id),
    clubId: String(row.club_id),
    publicName: String(row.public_name),
    leagueName: String(row.league_name),
    externalClubId: row.external_club_id ? String(row.external_club_id) : null,
    provider: row.provider ? (row.provider as IntegrationClubMapping["provider"]) : null,
    isPrimary: Boolean(row.is_primary),
    notes: row.notes ? String(row.notes) : null,
  };
}

export function mapExternalLeague(row: Record<string, unknown>): ExternalLeague {
  return {
    id: String(row.id),
    clubId: String(row.club_id),
    provider: row.provider as ExternalLeague["provider"],
    externalId: String(row.external_id),
    externalName: String(row.external_name),
    competition: String(row.competition),
    season: String(row.season),
    lastSyncedAt: row.last_synced_at ? String(row.last_synced_at) : null,
  };
}

export function mapExternalTeam(row: Record<string, unknown>): ExternalTeam {
  return {
    id: String(row.id),
    clubId: String(row.club_id),
    teamId: row.team_id ? String(row.team_id) : null,
    provider: row.provider as ExternalTeam["provider"],
    externalId: String(row.external_id),
    externalName: String(row.external_name),
    categoryLabel: String(row.category_label),
    competition: row.competition ? String(row.competition) : null,
    season: row.season ? String(row.season) : null,
  };
}

export function mapExternalMatch(row: Record<string, unknown>): ExternalMatch {
  return {
    id: String(row.id),
    clubId: String(row.club_id),
    externalLeagueId: row.external_league_id ? String(row.external_league_id) : null,
    provider: row.provider as ExternalMatch["provider"],
    externalId: String(row.external_id),
    competition: String(row.competition),
    season: String(row.season),
    roundNumber: row.round_number != null ? Number(row.round_number) : null,
    matchDate: String(row.match_date),
    matchTime: String(row.match_time).slice(0, 5),
    homeTeamName: String(row.home_team_name),
    awayTeamName: String(row.away_team_name),
    homeScore: row.home_score != null ? Number(row.home_score) : null,
    awayScore: row.away_score != null ? Number(row.away_score) : null,
    status: String(row.status),
    matchId: row.match_id ? String(row.match_id) : null,
    syncedAt: row.synced_at ? String(row.synced_at) : null,
  };
}

export function mapSyncJob(row: Record<string, unknown>): SyncJob {
  return {
    id: String(row.id),
    clubId: String(row.club_id),
    integrationId: row.integration_id ? String(row.integration_id) : null,
    jobType: row.job_type as SyncJob["jobType"],
    triggerType: row.trigger_type as SyncJob["triggerType"],
    status: row.status as SyncJob["status"],
    startedAt: row.started_at ? String(row.started_at) : null,
    completedAt: row.completed_at ? String(row.completed_at) : null,
    createdBy: row.created_by ? String(row.created_by) : null,
    errorMessage: row.error_message ? String(row.error_message) : null,
    createdAt: String(row.created_at),
  };
}

export function mapSyncLog(row: Record<string, unknown>): SyncLog {
  const creator = row.creator as { full_name?: string } | null;
  return {
    id: String(row.id),
    clubId: String(row.club_id),
    integrationId: row.integration_id ? String(row.integration_id) : null,
    syncJobId: row.sync_job_id ? String(row.sync_job_id) : null,
    sourceId: row.source_id ? String(row.source_id) : null,
    provider: row.provider as SyncLog["provider"],
    jobType: row.job_type as SyncLog["jobType"],
    triggerType: row.trigger_type as SyncLog["triggerType"],
    status: row.status as SyncLog["status"],
    message: String(row.message ?? ""),
    recordsProcessed: Number(row.records_processed ?? 0),
    recordsFailed: Number(row.records_failed ?? 0),
    qualityIssues: parseIssues(row.quality_issues),
    startedAt: String(row.started_at),
    completedAt: String(row.completed_at),
    createdBy: row.created_by ? String(row.created_by) : null,
    creatorName: creator?.full_name ?? null,
  };
}

export function mapSyncConflict(row: Record<string, unknown>): SyncConflict {
  return {
    id: String(row.id),
    clubId: String(row.club_id),
    syncLogId: String(row.sync_log_id),
    entityType: String(row.entity_type),
    entityKey: String(row.entity_key),
    localData: parseJson(row.local_data),
    externalData: parseJson(row.external_data),
    status: row.status as SyncConflict["status"],
    resolvedBy: row.resolved_by ? String(row.resolved_by) : null,
    resolvedAt: row.resolved_at ? String(row.resolved_at) : null,
    createdAt: String(row.created_at),
  };
}

export function mapIntegrationImport(row: Record<string, unknown>): IntegrationImport {
  return {
    id: String(row.id),
    clubId: String(row.club_id),
    fileName: String(row.file_name),
    format: row.format as IntegrationImport["format"],
    importType: row.import_type as IntegrationImport["importType"],
    status: row.status as IntegrationImport["status"],
    rowsTotal: Number(row.rows_total ?? 0),
    rowsImported: Number(row.rows_imported ?? 0),
    rowsFailed: Number(row.rows_failed ?? 0),
    qualityIssues: parseIssues(row.quality_issues),
    syncLogId: row.sync_log_id ? String(row.sync_log_id) : null,
    createdBy: row.created_by ? String(row.created_by) : null,
    createdAt: String(row.created_at),
    completedAt: row.completed_at ? String(row.completed_at) : null,
  };
}

/** Mapuje nazwę drużyny z zewnętrznego systemu na nazwę w Football Club OS. */
export function resolveTeamDisplayName(
  externalName: string,
  mappings: IntegrationClubMapping[],
): string {
  for (const mapping of mappings) {
    if (externalName === mapping.leagueName) return mapping.publicName;
    if (externalName.includes(mapping.leagueName)) {
      return externalName.replace(mapping.leagueName, mapping.publicName);
    }
  }
  return externalName;
}

export function isOwnClubTeamName(teamName: string, mappings: IntegrationClubMapping[]): boolean {
  const normalized = teamName.trim().toLowerCase();
  return mappings.some(
    (m) =>
      normalized === m.leagueName.trim().toLowerCase() ||
      normalized === m.publicName.trim().toLowerCase(),
  );
}

export function getPrimaryClubMapping(
  mappings: IntegrationClubMapping[],
): IntegrationClubMapping | undefined {
  return mappings.find((m) => m.isPrimary) ?? mappings[0];
}

export function resolvePublicTeamName(
  externalName: string,
  mappings: IntegrationClubMapping[],
): string {
  return resolveTeamDisplayName(externalName, mappings);
}
