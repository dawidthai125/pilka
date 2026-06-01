/** ISO date (YYYY-MM-DD) for server-rendered form defaults — avoids client hydration drift. */
export function todayIsoDate(reference = new Date()): string {
  return reference.toISOString().slice(0, 10);
}
