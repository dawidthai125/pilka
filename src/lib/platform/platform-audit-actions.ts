export const PLATFORM_AUDIT_ACTIONS = [
  "club_created",
  "league_configuration_saved",
  "league_sync_activated",
  "club_activated",
] as const;

export type PlatformAuditAction = (typeof PLATFORM_AUDIT_ACTIONS)[number];

export const PLATFORM_AUDIT_ACTION_LABELS: Record<PlatformAuditAction, string> = {
  club_created: "Utworzenie klubu",
  league_configuration_saved: "Zapis konfiguracji ligi",
  league_sync_activated: "Aktywacja sync ligi",
  club_activated: "Aktywacja klubu",
};

export function isPlatformAuditAction(value: string): value is PlatformAuditAction {
  return (PLATFORM_AUDIT_ACTIONS as readonly string[]).includes(value);
}
