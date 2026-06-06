export type LeagueSyncTriggerSource = "cron" | "platform_admin";

export type RunLeagueSyncOptions = {
  clubId?: string | null;
  dryRun?: boolean;
  triggerSource?: LeagueSyncTriggerSource;
  /** null = auto (skip on Vercel, repo fixtures locally) */
  persistFixtures?: boolean | null;
};

export type LeagueSyncClubResult = {
  ok: boolean;
  clubId: string;
  slug: string;
  publicName?: string;
  jobId?: string | null;
  recordsProcessed?: number;
  recordsFailed?: number;
  durationMs?: number;
  error?: string;
  dryRun?: boolean;
};

export type LeagueSyncResult = {
  ok: boolean;
  clubsTotal: number;
  clubsSucceeded: number;
  clubsFailed: number;
  recordsProcessed: number;
  recordsFailed: number;
  durationMs: number;
  jobIds: string[];
  results: LeagueSyncClubResult[];
};
