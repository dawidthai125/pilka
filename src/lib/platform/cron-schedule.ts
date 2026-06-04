/** Harmonogram z vercel.json — codziennie 06:00 UTC. */
export const LEAGUE_CRON_SCHEDULE = "0 6 * * *";
export const LEAGUE_CRON_SCHEDULE_LABEL = "Codziennie o 06:00 UTC";

export function getNextCronRun(from: Date = new Date()): Date {
  const next = new Date(from);
  next.setUTCHours(6, 0, 0, 0);
  if (next.getTime() <= from.getTime()) {
    next.setUTCDate(next.getUTCDate() + 1);
  }
  return next;
}

export function hoursSince(iso: string | null | undefined, from: Date = new Date()): number | null {
  if (!iso) return null;
  const ms = from.getTime() - new Date(iso).getTime();
  if (Number.isNaN(ms)) return null;
  return ms / (1000 * 60 * 60);
}
