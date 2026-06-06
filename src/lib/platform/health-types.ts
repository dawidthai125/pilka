import type { PlatformAlert } from "@/lib/platform/platform-alerts";
import type { SyncMonitoringData } from "@/lib/platform/monitoring";
import type { SyncHistoryRow } from "@/lib/platform/sync-history";

/** Client-safe types and constants — no server/pg imports. */

export type HealthLevel = "HEALTHY" | "WARNING" | "CRITICAL";

export type ClubHealthRow = {
  clubId: string;
  slug: string;
  publicName: string;
  status: string;
  score: number;
  level: HealthLevel;
  factors: string[];
  lastSyncAt: string | null;
  onboardingOverall: string;
  recentFailedSyncs: number;
  leagueActive: boolean;
};

export type LeagueHealthRow = {
  clubId: string;
  clubSlug: string;
  clubName: string;
  clubStatus: string;
  sourceId: string;
  sourceName: string;
  providerId: string | null;
  isActive: boolean;
  lastSyncAt: string | null;
  nextCronRunAt: string;
  recentErrorCount: number;
  lastJobStatus: string | null;
  lastJobAt: string | null;
  level: HealthLevel;
  factors: string[];
};

export type PlatformHealthSummary = {
  activeClubs: number;
  onboardingClubs: number;
  archivedClubs: number;
  healthyClubs: number;
  warningClubs: number;
  criticalClubs: number;
  healthyLeagues: number;
  warningLeagues: number;
  criticalLeagues: number;
};

export const MONITORING_HEALTH_PAGE_SIZE_OPTIONS = [25, 50, 100] as const;
export const MONITORING_DEFAULT_HEALTH_PAGE_SIZE = 50;

export type MonitoringHealthPagination = {
  page: number;
  pageSize: number;
  total: number;
  totalPages: number;
};

export type PlatformMonitoringBundle = {
  syncMonitoring: SyncMonitoringData;
  alerts: PlatformAlert[];
  clubHealth: ClubHealthRow[];
  leagueHealth: LeagueHealthRow[];
  syncHistory: SyncHistoryRow[];
  clubHealthPagination: MonitoringHealthPagination;
  leagueHealthPagination: MonitoringHealthPagination;
};

export type PlatformMonitoringBundleQuery = {
  clubHealthPage?: number;
  leagueHealthPage?: number;
  healthPageSize?: number;
};
