export const INTEGRATION_PROVIDERS = ["pzpn", "dzpn", "extranet", "manual", "other"] as const;
export type IntegrationProvider = (typeof INTEGRATION_PROVIDERS)[number];

export const INTEGRATION_DATA_FORMATS = [
  "api",
  "json",
  "xml",
  "csv",
  "rss",
  "file",
  "manual",
] as const;
export type IntegrationDataFormat = (typeof INTEGRATION_DATA_FORMATS)[number];

export const INTEGRATION_CONNECTION_STATUSES = [
  "not_configured",
  "ready",
  "disabled",
  "error",
] as const;
export type IntegrationConnectionStatus = (typeof INTEGRATION_CONNECTION_STATUSES)[number];

export const SYNC_JOB_TYPES = ["league_table", "fixtures", "results", "full"] as const;
export type SyncJobType = (typeof SYNC_JOB_TYPES)[number];

export const SYNC_TRIGGER_TYPES = ["manual", "automatic", "import"] as const;
export type SyncTriggerType = (typeof SYNC_TRIGGER_TYPES)[number];

export const SYNC_JOB_STATUSES = ["pending", "running", "completed", "failed", "cancelled"] as const;
export type SyncJobStatus = (typeof SYNC_JOB_STATUSES)[number];

export const SYNC_LOG_STATUSES = ["success", "partial", "error"] as const;
export type SyncLogStatus = (typeof SYNC_LOG_STATUSES)[number];

export const SYNC_CONFLICT_STATUSES = [
  "pending",
  "keep_local",
  "keep_external",
  "merged",
  "dismissed",
] as const;
export type SyncConflictStatus = (typeof SYNC_CONFLICT_STATUSES)[number];

export const INTEGRATION_IMPORT_TYPES = ["league_table", "fixtures", "results"] as const;
export type IntegrationImportType = (typeof INTEGRATION_IMPORT_TYPES)[number];

export const INTEGRATION_IMPORT_STATUSES = [
  "pending",
  "processing",
  "completed",
  "failed",
  "partial",
] as const;
export type IntegrationImportStatus = (typeof INTEGRATION_IMPORT_STATUSES)[number];

export type QualityIssue = {
  code: string;
  message: string;
  row?: number;
  field?: string;
};

export type Integration = {
  id: string;
  clubId: string;
  provider: IntegrationProvider;
  status: IntegrationConnectionStatus;
  baseUrl: string | null;
  apiKeyConfigured: boolean;
  autoSyncEnabled: boolean;
  autoSyncIntervalMinutes: number;
  lastSyncAt: string | null;
  lastError: string | null;
  config: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
};

export type IntegrationSource = {
  id: string;
  clubId: string;
  integrationId: string;
  name: string;
  format: IntegrationDataFormat;
  sourceUrl: string | null;
  filePath: string | null;
  isActive: boolean;
  priority: number;
  config: Record<string, unknown>;
};

export type IntegrationClubMapping = {
  id: string;
  clubId: string;
  publicName: string;
  leagueName: string;
  externalClubId: string | null;
  provider: IntegrationProvider | null;
  isPrimary: boolean;
  notes: string | null;
};

export type ExternalLeague = {
  id: string;
  clubId: string;
  provider: IntegrationProvider;
  externalId: string;
  externalName: string;
  competition: string;
  season: string;
  lastSyncedAt: string | null;
};

export type ExternalTeam = {
  id: string;
  clubId: string;
  teamId: string | null;
  provider: IntegrationProvider;
  externalId: string;
  externalName: string;
  categoryLabel: string;
  competition: string | null;
  season: string | null;
};

export type ExternalMatch = {
  id: string;
  clubId: string;
  externalLeagueId: string | null;
  provider: IntegrationProvider;
  externalId: string;
  competition: string;
  season: string;
  roundNumber: number | null;
  matchDate: string;
  matchTime: string;
  homeTeamName: string;
  awayTeamName: string;
  homeScore: number | null;
  awayScore: number | null;
  status: string;
  matchId: string | null;
  syncedAt: string | null;
};

export type SyncJob = {
  id: string;
  clubId: string;
  integrationId: string | null;
  jobType: SyncJobType;
  triggerType: SyncTriggerType;
  status: SyncJobStatus;
  startedAt: string | null;
  completedAt: string | null;
  createdBy: string | null;
  errorMessage: string | null;
  createdAt: string;
};

export type SyncLog = {
  id: string;
  clubId: string;
  integrationId: string | null;
  syncJobId: string | null;
  sourceId: string | null;
  provider: IntegrationProvider;
  jobType: SyncJobType;
  triggerType: SyncTriggerType;
  status: SyncLogStatus;
  message: string;
  recordsProcessed: number;
  recordsFailed: number;
  qualityIssues: QualityIssue[];
  startedAt: string;
  completedAt: string;
  createdBy: string | null;
  creatorName?: string | null;
};

export type SyncConflict = {
  id: string;
  clubId: string;
  syncLogId: string;
  entityType: string;
  entityKey: string;
  localData: Record<string, unknown>;
  externalData: Record<string, unknown>;
  status: SyncConflictStatus;
  resolvedBy: string | null;
  resolvedAt: string | null;
  createdAt: string;
};

export type IntegrationImport = {
  id: string;
  clubId: string;
  fileName: string;
  format: IntegrationDataFormat;
  importType: IntegrationImportType;
  status: IntegrationImportStatus;
  rowsTotal: number;
  rowsImported: number;
  rowsFailed: number;
  qualityIssues: QualityIssue[];
  syncLogId: string | null;
  createdBy: string | null;
  createdAt: string;
  completedAt: string | null;
};

export type IntegrationDashboardStats = {
  activeIntegrations: number;
  pendingConflicts: number;
  recentErrors: number;
  lastSyncAt: string | null;
};
