import type pg from "pg";

import { connectServerDb } from "@/lib/db/server-client";

export type PlatformSyncMetricsRow = {
  clubId: string;
  /** @deprecated Prefer lastMirrorLiveAt — kept for backward compat (= mirror_live). */
  lastSuccessAt: string | null;
  successRate: number | null;
  failedCount: number;
  jobCount: number;
  /** @deprecated Prefer mirrorLiveFreshnessHours — kept for backward compat (= mirror_live). */
  freshnessHours: number | null;
  avgDurationMs: number | null;
  p95DurationMs: number | null;
  hasRunningJob: boolean;
  lastMirrorLiveAt: string | null;
  lastManualImportAt: string | null;
  mirrorLiveFreshnessHours: number | null;
  manualImportFreshnessHours: number | null;
};

/** Freshness used by Health v2 and League Sync Stale alerts (mirror_live only). */
export function mirrorFreshnessHours(metrics: PlatformSyncMetricsRow | undefined): number | null {
  if (!metrics) return null;
  return metrics.mirrorLiveFreshnessHours ?? metrics.freshnessHours ?? null;
}

export async function fetchPlatformSyncMetrics(
  client: pg.Client,
  params?: {
    clubId?: string;
    provider?: string;
    windowDays?: number;
  },
): Promise<PlatformSyncMetricsRow[]> {
  const { rows } = await client.query(
    `SELECT
       out_club_id,
       last_success_at,
       success_rate,
       failed_count,
       job_count,
       freshness_hours,
       avg_duration_ms,
       p95_duration_ms,
       has_running_job,
       last_mirror_live_at,
       last_manual_import_at,
       mirror_live_freshness_hours,
       manual_import_freshness_hours
     FROM public.platform_sync_metrics($1::uuid, $2::text, $3::int)`,
    [params?.clubId ?? null, params?.provider ?? null, params?.windowDays ?? 7],
  );

  return rows.map((row) => {
    const lastMirror =
      row.last_mirror_live_at != null ? String(row.last_mirror_live_at) : null;
    const mirrorFresh =
      row.mirror_live_freshness_hours != null
        ? Number(row.mirror_live_freshness_hours)
        : null;
    return {
      clubId: String(row.out_club_id),
      lastSuccessAt: lastMirror ?? (row.last_success_at != null ? String(row.last_success_at) : null),
      successRate: row.success_rate != null ? Number(row.success_rate) : null,
      failedCount: Number(row.failed_count ?? 0),
      jobCount: Number(row.job_count ?? 0),
      freshnessHours: mirrorFresh ?? (row.freshness_hours != null ? Number(row.freshness_hours) : null),
      avgDurationMs: row.avg_duration_ms != null ? Number(row.avg_duration_ms) : null,
      p95DurationMs: row.p95_duration_ms != null ? Number(row.p95_duration_ms) : null,
      hasRunningJob: Boolean(row.has_running_job),
      lastMirrorLiveAt: lastMirror,
      lastManualImportAt:
        row.last_manual_import_at != null ? String(row.last_manual_import_at) : null,
      mirrorLiveFreshnessHours: mirrorFresh,
      manualImportFreshnessHours:
        row.manual_import_freshness_hours != null
          ? Number(row.manual_import_freshness_hours)
          : null,
    };
  });
}

/** Single global fetch for Health v2 (all clubs, all providers, default 7d window). */
export async function loadPlatformSyncMetrics(
  params?: {
    clubId?: string;
    provider?: string;
    windowDays?: number;
  },
): Promise<PlatformSyncMetricsRow[]> {
  const client = await connectServerDb();
  try {
    return await fetchPlatformSyncMetrics(client, params);
  } finally {
    await client.end();
  }
}
