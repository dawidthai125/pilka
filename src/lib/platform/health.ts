import { createAdminClient } from "@/lib/supabase/admin";
import { parseClubSettings } from "@/lib/platform/club-test";
import { getNextCronRun } from "@/lib/platform/cron-schedule";
import type { ClubOnboardingStatus, OnboardingStepStatus } from "@/lib/platform/onboarding-status";
import { loadSyncMonitoring, type SyncMonitoringData } from "@/lib/platform/monitoring";
import { evaluatePlatformAlerts, type PlatformAlert } from "@/lib/platform/platform-alerts";
import { loadSyncHistory, type SyncHistoryRow } from "@/lib/platform/sync-history";
import {
  loadPlatformSyncMetrics,
  type PlatformSyncMetricsRow,
} from "@/lib/platform/sync-metrics";

export type HealthLevel = "HEALTHY" | "WARNING" | "CRITICAL";

const HEALTH_WINDOW_DAYS = 7;

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

type ClubRecord = {
  id: string;
  slug: string;
  public_name: string;
  status: string;
  created_at: string;
  settings: Record<string, unknown> | null;
};

type LeagueSourceRecord = {
  id: string;
  club_id: string;
  name: string;
  is_active: boolean;
  config: unknown;
  last_sync_at: string | null;
};

export type HealthMetricsContext = {
  windowDays: number;
  metricsByClubId: Map<string, PlatformSyncMetricsRow>;
  clubs: ClubRecord[];
  sourcesByClubId: Map<string, LeagueSourceRecord[]>;
  onboardingByClubId: Map<string, ClubOnboardingStatus>;
};

function detectProviderFromConfig(config: Record<string, unknown>): string | null {
  if (config.provider === "manual_import") return "manual_import";
  if (config.provider === "mirror_live" || config.ninetyMinutUrl || config.ninety_minut_url) {
    return "mirror_live";
  }
  return null;
}

function levelFromScore(score: number): HealthLevel {
  if (score >= 80) return "HEALTHY";
  if (score >= 50) return "WARNING";
  return "CRITICAL";
}

export function freshnessScore(freshnessHours: number | null): number {
  if (freshnessHours == null) return 0;
  if (freshnessHours <= 24) return 100;
  if (freshnessHours <= 48) return 80;
  if (freshnessHours <= 72) return 60;
  if (freshnessHours <= 96) return 40;
  return 0;
}

export function successScore(successRate: number | null, jobCount: number): number {
  if (jobCount === 0) return 100;
  if (successRate == null) return 0;
  return Math.max(0, Math.min(100, successRate));
}

export function latencyScore(avgDurationMs: number | null): number {
  if (avgDurationMs == null) return 100;
  const seconds = avgDurationMs / 1000;
  if (seconds < 30) return 100;
  if (seconds < 60) return 80;
  if (seconds < 120) return 60;
  if (seconds < 300) return 30;
  return 0;
}

export function computeSyncHealthScore(metrics: PlatformSyncMetricsRow | undefined): number {
  const jobCount = metrics?.jobCount ?? 0;
  const fresh = freshnessScore(metrics?.freshnessHours ?? null);
  const success = successScore(metrics?.successRate ?? null, jobCount);
  const latency = latencyScore(metrics?.avgDurationMs ?? null);
  const score = fresh * 0.4 + success * 0.35 + latency * 0.25;
  return Math.round(Math.max(0, Math.min(100, score)));
}

function formatHours(hours: number): string {
  return `${Math.round(hours)} h`;
}

function buildSyncHealthFactors(metrics: PlatformSyncMetricsRow | undefined): string[] {
  if (!metrics || metrics.jobCount === 0) {
    return ["Brak jobów sync w oknie 7 dni"];
  }

  const factors: string[] = [];
  const fresh = freshnessScore(metrics.freshnessHours);
  const success = successScore(metrics.successRate, metrics.jobCount);
  const latency = latencyScore(metrics.avgDurationMs);

  if (metrics.freshnessHours != null) {
    factors.push(`Świeżość: ${formatHours(metrics.freshnessHours)} (${fresh}/100)`);
  } else {
    factors.push("Świeżość: brak udanego syncu (0/100)");
  }

  factors.push(
    `Sukces: ${metrics.successRate ?? 0}% · ${metrics.jobCount} jobów (${success}/100)`,
  );

  if (metrics.avgDurationMs != null) {
    factors.push(
      `Latencja śr.: ${Math.round(metrics.avgDurationMs / 1000)} s (${latency}/100)`,
    );
  } else {
    factors.push(`Latencja: brak danych (${latency}/100)`);
  }

  if (metrics.hasRunningJob) {
    factors.push("Sync w toku");
  }
  if (metrics.failedCount > 0) {
    factors.push(`${metrics.failedCount} nieudanych jobów w oknie`);
  }

  return factors;
}

function stepFromFlags(complete: boolean, started: boolean): OnboardingStepStatus {
  if (complete) return "complete";
  if (started) return "in_progress";
  return "not_started";
}

async function buildOnboardingByClubId(
  clubIds: string[],
  sourcesByClubId: Map<string, LeagueSourceRecord[]>,
): Promise<Map<string, ClubOnboardingStatus>> {
  const admin = createAdminClient();
  const uniqueIds = [...new Set(clubIds)];
  const map = new Map<string, ClubOnboardingStatus>();

  if (uniqueIds.length === 0) return map;

  const [settingsRes, ownersRes, mediaRes] = await Promise.all([
    admin
      .from("website_settings")
      .select("club_id, logo_path, hero_image_path, public_site_enabled, hero_title")
      .in("club_id", uniqueIds),
    admin
      .from("club_memberships")
      .select("club_id, status")
      .in("club_id", uniqueIds)
      .eq("role", "owner"),
    admin
      .from("website_media")
      .select("club_id")
      .in("club_id", uniqueIds)
      .eq("is_active", true),
  ]);

  if (settingsRes.error) throw new Error(settingsRes.error.message);
  if (ownersRes.error) throw new Error(ownersRes.error.message);
  if (mediaRes.error) throw new Error(mediaRes.error.message);

  const settingsByClub = new Map(
    (settingsRes.data ?? []).map((row) => [String(row.club_id), row]),
  );
  const ownerByClub = new Map(
    (ownersRes.data ?? []).map((row) => [String(row.club_id), row]),
  );
  const mediaCountByClub = new Map<string, number>();
  for (const row of mediaRes.data ?? []) {
    const id = String(row.club_id);
    mediaCountByClub.set(id, (mediaCountByClub.get(id) ?? 0) + 1);
  }

  for (const clubId of uniqueIds) {
    const settings = settingsByClub.get(clubId);
    const hasLogo = Boolean(settings?.logo_path);
    const hasHero = Boolean(settings?.hero_image_path);
    const branding = stepFromFlags(hasLogo, Boolean(settings));

    const website = stepFromFlags(
      Boolean(settings?.public_site_enabled && settings?.hero_title),
      Boolean(settings),
    );

    const sources = sourcesByClubId.get(clubId) ?? [];
    const leagueActive = sources.some((s) => s.is_active);
    const league = stepFromFlags(leagueActive, sources.length > 0);

    const ownerStatus = ownerByClub.get(clubId)?.status ?? null;
    const owner = stepFromFlags(ownerStatus === "active", Boolean(ownerStatus));

    const mediaCount = mediaCountByClub.get(clubId) ?? 0;
    const media = stepFromFlags(mediaCount > 0 || hasLogo, mediaCount > 0 || hasHero);

    const values = [branding, website, league, owner, media];
    const overall: OnboardingStepStatus = values.every((v) => v === "complete")
      ? "complete"
      : values.some((v) => v !== "not_started")
        ? "in_progress"
        : "not_started";

    map.set(clubId, { branding, website, league, owner, media, overall });
  }

  return map;
}

export async function loadHealthMetricsContext(): Promise<HealthMetricsContext> {
  const admin = createAdminClient();

  const [metrics, clubsRes, sourcesRes] = await Promise.all([
    loadPlatformSyncMetrics({ windowDays: HEALTH_WINDOW_DAYS }),
    admin
      .from("clubs")
      .select("id, slug, public_name, status, created_at, settings")
      .order("public_name"),
    admin
      .from("league_sources")
      .select("id, club_id, name, is_active, config, last_sync_at"),
  ]);

  if (clubsRes.error) throw new Error(clubsRes.error.message);
  if (sourcesRes.error) throw new Error(sourcesRes.error.message);

  const clubs: ClubRecord[] = (clubsRes.data ?? []).map((row) => ({
    id: String(row.id),
    slug: String(row.slug),
    public_name: String(row.public_name),
    status: String(row.status),
    created_at: String(row.created_at),
    settings: parseClubSettings(row.settings),
  }));
  const sources = (sourcesRes.data ?? []) as LeagueSourceRecord[];
  const sourcesByClubId = new Map<string, LeagueSourceRecord[]>();

  for (const source of sources) {
    const clubId = String(source.club_id);
    const list = sourcesByClubId.get(clubId) ?? [];
    list.push(source);
    sourcesByClubId.set(clubId, list);
  }

  const metricsByClubId = new Map(metrics.map((row) => [row.clubId, row]));
  const onboardingByClubId = await buildOnboardingByClubId(
    clubs.map((c) => String(c.id)),
    sourcesByClubId,
  );

  return {
    windowDays: HEALTH_WINDOW_DAYS,
    metricsByClubId,
    clubs,
    sourcesByClubId,
    onboardingByClubId,
  };
}

function deriveLastJobStatus(metrics: PlatformSyncMetricsRow | undefined): string | null {
  if (!metrics || metrics.jobCount === 0) return null;
  if (metrics.hasRunningJob) return "running";
  if (metrics.failedCount > 0 && (metrics.successRate ?? 100) < 100) return "failed";
  return "completed";
}

function evaluateClubHealth(input: {
  status: string;
  onboardingOverall: string;
  leagueActive: boolean;
  providerId: string | null;
  lastSyncAt: string | null;
  metrics: PlatformSyncMetricsRow | undefined;
}): { score: number; level: HealthLevel; factors: string[] } {
  if (input.status === "archived") {
    return { score: 100, level: "HEALTHY", factors: ["Klub zarchiwizowany"] };
  }

  const factors = buildSyncHealthFactors(input.metrics);

  if (input.onboardingOverall !== "complete") {
    factors.push("Onboarding niekompletny");
  }

  if (!input.leagueActive) {
    factors.push("Brak aktywnego źródła ligi");
  }

  if (
    input.providerId === "manual_import" &&
    input.leagueActive &&
    !input.lastSyncAt &&
    (input.metrics?.jobCount ?? 0) === 0
  ) {
    factors.push("Import ręczny — brak pierwszego importu");
  }

  const score =
    input.providerId === "manual_import" && (input.metrics?.jobCount ?? 0) === 0
      ? 100
      : computeSyncHealthScore(input.metrics);

  return {
    score,
    level: levelFromScore(score),
    factors: factors.length ? factors : ["Brak problemów"],
  };
}

function evaluateLeagueHealth(input: {
  clubStatus: string;
  isActive: boolean;
  providerId: string | null;
  lastSyncAt: string | null;
  metrics: PlatformSyncMetricsRow | undefined;
}): { level: HealthLevel; factors: string[]; score: number } {
  if (input.clubStatus === "archived") {
    return { level: "HEALTHY", factors: ["Klub zarchiwizowany"], score: 100 };
  }

  if (input.clubStatus === "active" && !input.isActive) {
    return {
      level: "CRITICAL",
      factors: ["Klub aktywny, ale źródło ligi nieaktywne"],
      score: 0,
    };
  }

  if (
    input.providerId === "manual_import" &&
    input.isActive &&
    !input.lastSyncAt &&
    (input.metrics?.jobCount ?? 0) === 0
  ) {
    return {
      level: "WARNING",
      factors: ["Import ręczny — brak pierwszego importu"],
      score: 100,
    };
  }

  const score = computeSyncHealthScore(input.metrics);
  const level = levelFromScore(score);
  const factors = buildSyncHealthFactors(input.metrics);

  return { level, factors, score };
}

export async function computeClubHealthRows(
  ctx?: HealthMetricsContext,
): Promise<ClubHealthRow[]> {
  const context = ctx ?? (await loadHealthMetricsContext());
  const rows: ClubHealthRow[] = [];

  for (const club of context.clubs) {
    const clubId = String(club.id);
    const sources = context.sourcesByClubId.get(clubId) ?? [];
    const leagueActive = sources.some((s) => s.is_active);
    const primarySource = sources.find((s) => s.is_active) ?? sources[0];
    const config =
      primarySource?.config && typeof primarySource.config === "object"
        ? (primarySource.config as Record<string, unknown>)
        : {};
    const providerId = detectProviderFromConfig(config);
    const metrics = context.metricsByClubId.get(clubId);
    const onboarding = context.onboardingByClubId.get(clubId) ?? {
      branding: "not_started",
      website: "not_started",
      league: "not_started",
      owner: "not_started",
      media: "not_started",
      overall: "not_started",
    };

    const lastSyncAt =
      metrics?.lastSuccessAt ??
      (primarySource?.last_sync_at != null ? String(primarySource.last_sync_at) : null);

    const health = evaluateClubHealth({
      status: String(club.status),
      onboardingOverall: onboarding.overall,
      leagueActive,
      providerId,
      lastSyncAt,
      metrics,
    });

    rows.push({
      clubId,
      slug: String(club.slug),
      publicName: String(club.public_name),
      status: String(club.status),
      score: health.score,
      level: health.level,
      factors: health.factors,
      lastSyncAt,
      onboardingOverall: onboarding.overall,
      recentFailedSyncs: metrics?.failedCount ?? 0,
      leagueActive,
    });
  }

  return rows.sort((a, b) => a.score - b.score);
}

export async function computeLeagueHealthRows(
  ctx?: HealthMetricsContext,
): Promise<LeagueHealthRow[]> {
  const context = ctx ?? (await loadHealthMetricsContext());
  const nextCron = getNextCronRun().toISOString();
  const rows: LeagueHealthRow[] = [];

  for (const sources of context.sourcesByClubId.values()) {
    for (const source of sources) {
      const clubId = String(source.club_id);
      const club = context.clubs.find((c) => String(c.id) === clubId);
      if (!club) continue;

      const config =
        source.config && typeof source.config === "object"
          ? (source.config as Record<string, unknown>)
          : {};
      const providerId = detectProviderFromConfig(config);
      const metrics = context.metricsByClubId.get(clubId);

      const evaluation = evaluateLeagueHealth({
        clubStatus: String(club.status),
        isActive: Boolean(source.is_active),
        providerId,
        lastSyncAt: source.last_sync_at != null ? String(source.last_sync_at) : null,
        metrics,
      });

      rows.push({
        clubId,
        clubSlug: String(club.slug),
        clubName: String(club.public_name),
        clubStatus: String(club.status),
        sourceId: String(source.id),
        sourceName: String(source.name),
        providerId,
        isActive: Boolean(source.is_active),
        lastSyncAt: source.last_sync_at != null ? String(source.last_sync_at) : null,
        nextCronRunAt: providerId === "mirror_live" && source.is_active ? nextCron : "—",
        recentErrorCount: metrics?.failedCount ?? 0,
        lastJobStatus: deriveLastJobStatus(metrics),
        lastJobAt: metrics?.lastSuccessAt ?? null,
        level: evaluation.level,
        factors: evaluation.factors,
      });
    }
  }

  const severity = { CRITICAL: 0, WARNING: 1, HEALTHY: 2 };
  return rows.sort((a, b) => severity[a.level] - severity[b.level]);
}

export function platformHealthSummaryFromRows(
  clubRows: ClubHealthRow[],
  leagueRows: LeagueHealthRow[],
): PlatformHealthSummary {
  return {
    activeClubs: clubRows.filter((c) => c.status === "active").length,
    onboardingClubs: clubRows.filter((c) => c.status === "onboarding").length,
    archivedClubs: clubRows.filter((c) => c.status === "archived").length,
    healthyClubs: clubRows.filter((c) => c.level === "HEALTHY").length,
    warningClubs: clubRows.filter((c) => c.level === "WARNING").length,
    criticalClubs: clubRows.filter((c) => c.level === "CRITICAL").length,
    healthyLeagues: leagueRows.filter((l) => l.level === "HEALTHY").length,
    warningLeagues: leagueRows.filter((l) => l.level === "WARNING").length,
    criticalLeagues: leagueRows.filter((l) => l.level === "CRITICAL").length,
  };
}

export async function computePlatformHealthSummary(
  ctx?: HealthMetricsContext,
): Promise<PlatformHealthSummary> {
  const context = ctx ?? (await loadHealthMetricsContext());
  const [clubRows, leagueRows] = await Promise.all([
    computeClubHealthRows(context),
    computeLeagueHealthRows(context),
  ]);
  return platformHealthSummaryFromRows(clubRows, leagueRows);
}

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

function normalizeHealthPageSize(pageSize?: number): number {
  if (pageSize === 25 || pageSize === 100) return pageSize;
  return MONITORING_DEFAULT_HEALTH_PAGE_SIZE;
}

function paginateRows<T>(rows: T[], page: number, pageSize: number): {
  slice: T[];
  pagination: MonitoringHealthPagination;
} {
  const total = rows.length;
  const totalPages = Math.max(1, Math.ceil(total / pageSize));
  const safePage = Math.min(Math.max(1, page), totalPages);
  const offset = (safePage - 1) * pageSize;
  return {
    slice: rows.slice(offset, offset + pageSize),
    pagination: {
      page: safePage,
      pageSize,
      total,
      totalPages,
    },
  };
}

export async function loadPlatformMonitoringBundle(
  query: PlatformMonitoringBundleQuery = {},
): Promise<PlatformMonitoringBundle> {
  const healthPageSize = normalizeHealthPageSize(query.healthPageSize);
  const clubHealthPage = Math.max(1, query.clubHealthPage ?? 1);
  const leagueHealthPage = Math.max(1, query.leagueHealthPage ?? 1);

  const context = await loadHealthMetricsContext();
  const [syncMonitoring, clubHealthAll, leagueHealthAll, syncHistory] = await Promise.all([
    loadSyncMonitoring(),
    computeClubHealthRows(context),
    computeLeagueHealthRows(context),
    loadSyncHistory(),
  ]);
  const alerts = evaluatePlatformAlerts({
    ctx: context,
    clubHealth: clubHealthAll,
    leagueHealth: leagueHealthAll,
    cronStatus: syncMonitoring.cron.status,
  });

  const clubPaged = paginateRows(clubHealthAll, clubHealthPage, healthPageSize);
  const leaguePaged = paginateRows(leagueHealthAll, leagueHealthPage, healthPageSize);

  return {
    syncMonitoring,
    alerts,
    clubHealth: clubPaged.slice,
    leagueHealth: leaguePaged.slice,
    syncHistory,
    clubHealthPagination: clubPaged.pagination,
    leagueHealthPagination: leaguePaged.pagination,
  };
}
