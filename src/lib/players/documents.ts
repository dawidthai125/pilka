import type {
  DocumentAlert,
  DocumentAlertLevel,
  DocumentValidityStatus,
  PlayerDocument,
} from "@/types/players";

export function daysUntilDate(isoDate: string): number {
  const target = new Date(isoDate);
  const today = new Date();
  target.setHours(0, 0, 0, 0);
  today.setHours(0, 0, 0, 0);
  return Math.ceil((target.getTime() - today.getTime()) / 86_400_000);
}

export function getDocumentAlertLevel(expiresAt: string | null): DocumentAlertLevel | null {
  if (!expiresAt) return null;

  const days = daysUntilDate(expiresAt);
  if (days < 0) return "expired";
  if (days <= 7) return "days_7";
  if (days <= 14) return "days_14";
  if (days <= 30) return "days_30";
  return null;
}

export function getDocumentValidityStatus(expiresAt: string | null): DocumentValidityStatus {
  if (!expiresAt) return "valid";

  const days = daysUntilDate(expiresAt);
  if (days < 0) return "expired";
  if (days <= 30) return "expiring_soon";
  return "valid";
}

export const DOCUMENT_ALERT_LABELS: Record<DocumentAlertLevel, string> = {
  expired: "Dokument wygasł",
  days_7: "Wygasa za 7 dni lub mniej",
  days_14: "Wygasa za 14 dni lub mniej",
  days_30: "Wygasa za 30 dni lub mniej",
};

export const DOCUMENT_ALERT_PRIORITY: Record<DocumentAlertLevel, number> = {
  expired: 0,
  days_7: 1,
  days_14: 2,
  days_30: 3,
};

export function enrichDocument(
  doc: Omit<PlayerDocument, "validityStatus" | "alertLevel">,
): PlayerDocument {
  return {
    ...doc,
    validityStatus: getDocumentValidityStatus(doc.expiresAt),
    alertLevel: getDocumentAlertLevel(doc.expiresAt),
  };
}

export function sortDocumentAlerts(alerts: DocumentAlert[]): DocumentAlert[] {
  return [...alerts].sort((a, b) => {
    const priorityDiff =
      DOCUMENT_ALERT_PRIORITY[a.alertLevel] - DOCUMENT_ALERT_PRIORITY[b.alertLevel];
    if (priorityDiff !== 0) return priorityDiff;
    return daysUntilDate(a.expiresAt) - daysUntilDate(b.expiresAt);
  });
}

export function formatAlertMessage(alert: DocumentAlert): string {
  const days = daysUntilDate(alert.expiresAt);
  if (alert.alertLevel === "expired") {
    return `${alert.documentTitle} (${alert.playerName}) — wygasł ${Math.abs(days)} dni temu`;
  }
  return `${alert.documentTitle} (${alert.playerName}) — wygasa za ${days} dni`;
}
