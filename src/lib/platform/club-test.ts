/** Kanoniczny moduł test-club; `platform-alerts.ts` duplikuje slug-heurystykę dla importów Node. */
const TEST_CLUB_SLUGS = new Set(["pilot-club-test"]);

const TEST_CLUB_SLUG_PREFIXES = ["release-184a-", "pilot-club-"];

export function isTestClubSlug(slug: string): boolean {
  if (TEST_CLUB_SLUGS.has(slug)) return true;
  return TEST_CLUB_SLUG_PREFIXES.some((prefix) => slug.startsWith(prefix));
}

export function isTestClubFromSettings(settings: Record<string, unknown> | null | undefined): boolean {
  return settings?.isTest === true;
}

/** Flaga settings.isTest z fallbackiem heurystyki slug (18.6C). */
export function isTestClub(
  slug: string,
  settings?: Record<string, unknown> | null,
): boolean {
  if (isTestClubFromSettings(settings)) return true;
  return isTestClubSlug(slug);
}

export function parseClubSettings(settings: unknown): Record<string, unknown> | null {
  if (settings && typeof settings === "object" && !Array.isArray(settings)) {
    return settings as Record<string, unknown>;
  }
  return null;
}
