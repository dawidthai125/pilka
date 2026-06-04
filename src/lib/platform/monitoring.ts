import { createAdminClient } from "@/lib/supabase/admin";
import {
  getNextCronRun,
  hoursSince,
  LEAGUE_CRON_SCHEDULE,
  LEAGUE_CRON_SCHEDULE_LABEL,
} from "@/lib/platform/cron-schedule";
import {
  classifySyncJob,
  formatDurationMs,
  syncDurationMs,
  type SyncCategory,
} from "@/lib/platform/sync-category";

export type SyncMonitoringRow = {
  jobId: string;
  clubId: string;
  clubSlug: string;
  clubName: string;
  status: string;
  category: SyncCategory;
  recordsProcessed: number;
  recordsFailed: number;
  errorMessage: string | null;
  durationMs: number | null;
  durationLabel: string;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
  importType: string;
};

export type CronMonitoringInfo = {
  schedule: string;
  scheduleLabel: string;
  nextRunAt: string;
  lastSuccessfulSyncAt: string | null;
  lastFailedSyncAt: string | null;
  recentFailCount: number;
  recentWarningCount: number;
  status: SyncCategory;
  statusMessage: string;
};

export type SyncMonitoringData = {
  syncs: SyncMonitoringRow[];
  cron: CronMonitoringInfo;
};

type SyncJobRow = {
  id: string;
  club_id: string;
  status: string;
  records_processed: number | null;
  records_failed: number | null;
  error_message: string | null;
  started_at: string | null;
  completed_at: string | null;
  created_at: string;
  import_type: string;
};

export async function loadSyncMonitoring(limit = 50): Promise<SyncMonitoringData> {
  const admin = createAdminClient();

  const [clubsRes, syncsRes] = await Promise.all([
    admin.from("clubs").select("id, slug, public_name"),
    admin
      .from("league_sync_jobs")
      .select(
        "id, club_id, status, records_processed, records_failed, error_message, started_at, completed_at, created_at, import_type",
      )
      .order("created_at", { ascending: false })
      .limit(limit),
  ]);

  if (clubsRes.error) throw new Error(clubsRes.error.message);
  if (syncsRes.error) throw new Error(syncsRes.error.message);

  const clubById = new Map((clubsRes.data ?? []).map((c) => [String(c.id), c]));
  const jobs = (syncsRes.data ?? []) as SyncJobRow[];

  const syncs: SyncMonitoringRow[] = jobs.map((row) => {
    const club = clubById.get(String(row.club_id));
    const jobLike = {
      status: String(row.status),
      recordsFailed: Number(row.records_failed ?? 0),
      errorMessage: row.error_message != null ? String(row.error_message) : null,
      startedAt: row.started_at != null ? String(row.started_at) : null,
      completedAt: row.completed_at != null ? String(row.completed_at) : null,
      createdAt: String(row.created_at),
    };
    const durationMs = syncDurationMs(jobLike);

    return {
      jobId: String(row.id),
      clubId: String(row.club_id),
      clubSlug: club ? String(club.slug) : "—",
      clubName: club ? String(club.public_name) : "—",
      status: String(row.status),
      category: classifySyncJob(jobLike),
      recordsProcessed: Number(row.records_processed ?? 0),
      recordsFailed: Number(row.records_failed ?? 0),
      errorMessage: jobLike.errorMessage,
      durationMs,
      durationLabel: formatDurationMs(durationMs),
      startedAt: jobLike.startedAt,
      completedAt: jobLike.completedAt,
      createdAt: jobLike.createdAt,
      importType: String(row.import_type),
    };
  });

  const nextRun = getNextCronRun();
  const lastSuccess = syncs.find((s) => s.category === "PASS");
  const lastFail = syncs.find((s) => s.category === "FAIL");
  const recentFailCount = syncs.filter((s) => s.category === "FAIL").length;
  const recentWarningCount = syncs.filter((s) => s.category === "WARNING").length;

  const lastSuccessHours = hoursSince(lastSuccess?.completedAt ?? lastSuccess?.createdAt ?? null);
  const cronStale = lastSuccessHours != null && lastSuccessHours > 36;

  let cronStatus: SyncCategory = "PASS";
  let cronMessage = "Cron skonfigurowany — ostatnie sync OK.";

  if (recentFailCount > 0 && (!lastSuccess || (lastFail && lastFail.createdAt > (lastSuccess?.createdAt ?? "")))) {
    cronStatus = "FAIL";
    cronMessage = `Ostatni sync zakończył się błędem (${recentFailCount} FAIL w ostatnich ${limit}).`;
  } else if (cronStale || recentWarningCount > 0) {
    cronStatus = "WARNING";
    cronMessage = cronStale
      ? "Brak udanego syncu w ostatnich 36 h — sprawdź cron lub aktywne kluby."
      : `${recentWarningCount} synców ze statusem WARNING w ostatnich ${limit}.`;
  } else if (syncs.length === 0) {
    cronStatus = "WARNING";
    cronMessage = "Brak historii synchronizacji — cron jeszcze nie uruchomiony lub brak aktywnych lig.";
  }

  return {
    syncs,
    cron: {
      schedule: LEAGUE_CRON_SCHEDULE,
      scheduleLabel: LEAGUE_CRON_SCHEDULE_LABEL,
      nextRunAt: nextRun.toISOString(),
      lastSuccessfulSyncAt: lastSuccess?.completedAt ?? lastSuccess?.createdAt ?? null,
      lastFailedSyncAt: lastFail?.createdAt ?? null,
      recentFailCount,
      recentWarningCount,
      status: cronStatus,
      statusMessage: cronMessage,
    },
  };
}
