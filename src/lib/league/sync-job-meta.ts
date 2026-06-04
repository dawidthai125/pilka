export const LEAGUE_SYNC_PROVIDERS = ["mirror_live", "manual_import", "unknown"] as const;
export type LeagueSyncProvider = (typeof LEAGUE_SYNC_PROVIDERS)[number];

export const LEAGUE_SYNC_TRIGGER_SOURCES = [
  "cron",
  "platform_admin",
  "club_user",
  "import",
  "cli",
  "unknown",
] as const;
export type LeagueSyncTriggerSource = (typeof LEAGUE_SYNC_TRIGGER_SOURCES)[number];

export function detectProviderFromSourceConfig(
  config: Record<string, unknown> | null | undefined,
): LeagueSyncProvider {
  if (!config || typeof config !== "object") return "unknown";
  const raw = config.provider;
  if (raw === "manual_import") return "manual_import";
  if (raw === "mirror_live" || config.ninetyMinutUrl || config.ninety_minut_url) {
    return "mirror_live";
  }
  return "unknown";
}

export function computeSyncDurationMs(input: {
  startedAt: string | null | undefined;
  completedAt: string | null | undefined;
  createdAt?: string | null | undefined;
}): number | null {
  const start = input.startedAt ?? input.createdAt;
  const end = input.completedAt;
  if (!start || !end) return null;
  const ms = new Date(end).getTime() - new Date(start).getTime();
  return Number.isFinite(ms) && ms >= 0 ? Math.round(ms) : null;
}

export function buildSyncJobStartFields(input: {
  provider: LeagueSyncProvider;
  triggerSource: LeagueSyncTriggerSource;
}): { provider: LeagueSyncProvider; trigger_source: LeagueSyncTriggerSource } {
  return { provider: input.provider, trigger_source: input.triggerSource };
}

export function buildSyncJobCompleteFields(input: {
  startedAt: string | null | undefined;
  completedAt: string;
  createdAt?: string | null | undefined;
}): { completed_at: string; duration_ms: number | null } {
  const completedAt = input.completedAt;
  return {
    completed_at: completedAt,
    duration_ms: computeSyncDurationMs({
      startedAt: input.startedAt,
      completedAt,
      createdAt: input.createdAt,
    }),
  };
}
