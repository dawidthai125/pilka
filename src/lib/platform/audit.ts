export type PlatformAuditEntry = {
  action: string;
  at: string;
  actorUserId: string;
  actorEmail: string;
  metadata?: Record<string, unknown>;
};

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
  const existing = Array.isArray(settings.platformAudit) ? settings.platformAudit : [];
  return {
    ...settings,
    platformAudit: [...existing, entry],
  };
}

export function logPlatformAudit(entry: PlatformAuditEntry): void {
  console.info("[platform-audit]", JSON.stringify(entry));
}
