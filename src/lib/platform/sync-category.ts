export type SyncCategory = "PASS" | "WARNING" | "FAIL";

export type SyncJobLike = {
  status: string;
  recordsFailed: number;
  errorMessage: string | null;
  startedAt: string | null;
  completedAt: string | null;
  createdAt: string;
};

export function classifySyncJob(job: SyncJobLike): SyncCategory {
  const status = job.status.toLowerCase();

  if (status === "failed" || job.errorMessage) {
    return "FAIL";
  }

  if (status === "cancelled") {
    return "WARNING";
  }

  if (status === "pending" || status === "running") {
    const ageHours = (Date.now() - new Date(job.createdAt).getTime()) / (1000 * 60 * 60);
    if (ageHours > 2) return "WARNING";
    return "WARNING";
  }

  if (status === "completed") {
    if (job.recordsFailed > 0) return "WARNING";
    return "PASS";
  }

  return "WARNING";
}

export function syncDurationMs(job: SyncJobLike): number | null {
  const start = job.startedAt ?? job.createdAt;
  const end = job.completedAt;
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Number.isFinite(ms) && ms >= 0 ? ms : null;
}

export function formatDurationMs(ms: number | null): string {
  if (ms == null) return "—";
  if (ms < 1000) return `${ms} ms`;
  const sec = Math.round(ms / 1000);
  if (sec < 60) return `${sec} s`;
  const min = Math.floor(sec / 60);
  const rem = sec % 60;
  return rem > 0 ? `${min} min ${rem} s` : `${min} min`;
}
