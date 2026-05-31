import type { MatchStatus } from "@/types/matches";
import {
  INTEGRATION_IMPORT_TYPES,
  INTEGRATION_PROVIDERS,
  SYNC_CONFLICT_STATUSES,
  SYNC_JOB_TYPES,
  type IntegrationImportType,
  type IntegrationProvider,
  type SyncConflictStatus,
  type SyncJobType,
} from "@/types/integrations";

export const MAX_IMPORT_FILE_BYTES = 2 * 1024 * 1024;
export const MAX_IMPORT_ROWS = 1000;
export const MAX_QUALITY_ISSUES_STORED = 50;
export const IMPORT_BATCH_SIZE = 50;

export function isIntegrationProvider(value: string): value is IntegrationProvider {
  return (INTEGRATION_PROVIDERS as readonly string[]).includes(value);
}

export function isSyncJobType(value: string): value is SyncJobType {
  return (SYNC_JOB_TYPES as readonly string[]).includes(value);
}

export function isIntegrationImportType(value: string): value is IntegrationImportType {
  return (INTEGRATION_IMPORT_TYPES as readonly string[]).includes(value);
}

export function isSyncConflictStatus(value: string): value is SyncConflictStatus {
  return (SYNC_CONFLICT_STATUSES as readonly string[]).includes(value);
}

export function isValidIntegrationBaseUrl(value: string): boolean {
  if (!value) return true;
  try {
    const url = new URL(value);
    return url.protocol === "https:" || url.protocol === "http:";
  } catch {
    return false;
  }
}

export function mapExternalMatchStatus(status: string | null | undefined): MatchStatus {
  const normalized = String(status ?? "planned").toLowerCase();
  switch (normalized) {
    case "completed":
    case "finished":
      return "completed";
    case "in_progress":
    case "live":
      return "in_progress";
    case "cancelled":
    case "canceled":
      return "cancelled";
    case "postponed":
      return "postponed";
    case "scheduled":
    case "planned":
    default:
      return "planned";
  }
}

export function mapExternalMatchStatusForStaging(status: string | null | undefined): string {
  return mapExternalMatchStatus(status);
}

export function capQualityIssues<T extends { code: string; message: string }>(issues: T[]): T[] {
  if (issues.length <= MAX_QUALITY_ISSUES_STORED) return issues;
  const capped = issues.slice(0, MAX_QUALITY_ISSUES_STORED);
  capped.push({
    code: "truncated",
    message: `Pominięto ${issues.length - MAX_QUALITY_ISSUES_STORED} kolejnych problemów jakości.`,
  } as T);
  return capped;
}

export function stableFixtureExternalId(
  homeTeamName: string,
  awayTeamName: string,
  matchDate: string,
  roundNumber?: number,
): string {
  const base = `${matchDate}|${roundNumber ?? 0}|${homeTeamName.trim()}|${awayTeamName.trim()}`;
  return `FIX-${base.replace(/[^a-zA-Z0-9|]+/g, "-").slice(0, 120)}`;
}
