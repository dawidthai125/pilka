/** Maks. wpisów platformAudit per klub (19.3B — bez nowej tabeli). */
export const PLATFORM_AUDIT_MAX_ENTRIES = 100;

export type PlatformAuditEntry = {
  action: string;
  at: string;
  actorUserId: string;
  actorEmail: string;
  metadata?: Record<string, unknown>;
};

/** Obcina tablicę audit do ostatnich N wpisów (odczyt i zapis). */
export function trimPlatformAuditEntries(
  entries: PlatformAuditEntry[],
  max = PLATFORM_AUDIT_MAX_ENTRIES,
): PlatformAuditEntry[] {
  if (entries.length <= max) return entries;
  return entries.slice(entries.length - max);
}

export function parsePlatformAuditFromSettings(
  settings: Record<string, unknown> | null | undefined,
): PlatformAuditEntry[] {
  const raw = settings?.platformAudit;
  if (!Array.isArray(raw)) return [];
  const parsed = raw.filter((entry): entry is PlatformAuditEntry => {
    return (
      entry &&
      typeof entry === "object" &&
      typeof (entry as PlatformAuditEntry).action === "string" &&
      typeof (entry as PlatformAuditEntry).at === "string"
    );
  });
  return trimPlatformAuditEntries(parsed);
}

export function buildPlatformAuditEntry(
  action: string,
  actor: { id: string; email: string },
  metadata?: Record<string, unknown>,
): PlatformAuditEntry {
  return {
    action,
    at: new Date().toISOString(),
    actorUserId: actor.id,
    actorEmail: actor.email,
    ...(metadata ? { metadata } : {}),
  };
}

export function appendAuditToClubSettings(
  settings: Record<string, unknown>,
  entry: PlatformAuditEntry,
): Record<string, unknown> {
  const existing = parsePlatformAuditFromSettings(settings);
  return {
    ...settings,
    platformAudit: trimPlatformAuditEntries([...existing, entry]),
  };
}

export function logPlatformAudit(entry: PlatformAuditEntry): void {
  console.info("[platform-audit]", JSON.stringify(entry));
}
