/** @typedef {'mirror_live' | 'manual_import' | 'unknown'} LeagueSyncProvider */
/** @typedef {'cron' | 'platform_admin' | 'club_user' | 'import' | 'cli' | 'unknown'} LeagueSyncTriggerSource */

/**
 * @param {string | null | undefined} startedAt
 * @param {string | null | undefined} completedAt
 * @param {string | null | undefined} [createdAt]
 * @returns {number | null}
 */
export function computeSyncDurationMs(startedAt, completedAt, createdAt) {
  const start = startedAt || createdAt;
  if (!start || !completedAt) return null;
  const ms = new Date(completedAt).getTime() - new Date(start).getTime();
  return Number.isFinite(ms) && ms >= 0 ? Math.round(ms) : null;
}

/**
 * @param {Record<string, unknown> | null | undefined} config
 * @returns {LeagueSyncProvider}
 */
export function detectProviderFromSourceConfig(config) {
  if (!config || typeof config !== "object") return "unknown";
  if (config.provider === "manual_import") return "manual_import";
  if (config.provider === "mirror_live" || config.ninetyMinutUrl || config.ninety_minut_url) {
    return "mirror_live";
  }
  return "unknown";
}
