import type pg from "pg";

export type PlatformSyncMetricsRow = {
  clubId: string;
  lastSuccessAt: string | null;
  successRate: number | null;
  failedCount: number;
  jobCount: number;
  freshnessHours: number | null;
  avgDurationMs: number | null;
  p95DurationMs: number | null;
  hasRunningJob: boolean;
};

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
       has_running_job
     FROM public.platform_sync_metrics($1::uuid, $2::text, $3::int)`,
    [params?.clubId ?? null, params?.provider ?? null, params?.windowDays ?? 7],
  );

  return rows.map((row) => ({
    clubId: String(row.out_club_id),
    lastSuccessAt: row.last_success_at != null ? String(row.last_success_at) : null,
    successRate: row.success_rate != null ? Number(row.success_rate) : null,
    failedCount: Number(row.failed_count ?? 0),
    jobCount: Number(row.job_count ?? 0),
    freshnessHours: row.freshness_hours != null ? Number(row.freshness_hours) : null,
    avgDurationMs: row.avg_duration_ms != null ? Number(row.avg_duration_ms) : null,
    p95DurationMs: row.p95_duration_ms != null ? Number(row.p95_duration_ms) : null,
    hasRunningJob: Boolean(row.has_running_job),
  }));
}
