import type { SyncHistoryRow } from "@/lib/platform/sync-history";

export type SyncHistoryQuickFilter =
  | "all"
  | "failed"
  | "mirror_live"
  | "manual_import"
  | "critical_clubs"
  | "last_24h";

export type SyncHistoryFilters = {
  clubId: string;
  sourceId: string;
  provider: string;
  status: string;
  quick: SyncHistoryQuickFilter;
};

export const EMPTY_SYNC_HISTORY_FILTERS: SyncHistoryFilters = {
  clubId: "",
  sourceId: "",
  provider: "",
  status: "",
  quick: "all",
};

export function filtersFromClub(clubId: string): SyncHistoryFilters {
  return { clubId, sourceId: "", provider: "", status: "", quick: "all" };
}

export function filtersFromLeague(
  clubId: string,
  sourceId: string,
  providerId: string | null,
): SyncHistoryFilters {
  return {
    clubId,
    sourceId,
    provider: providerId ?? "",
    status: "",
    quick: "all",
  };
}

export function applyQuickFilter(
  quick: SyncHistoryQuickFilter,
  criticalClubIds: string[],
): SyncHistoryFilters {
  switch (quick) {
    case "failed":
      return { clubId: "", sourceId: "", provider: "", status: "", quick };
    case "mirror_live":
      return { clubId: "", sourceId: "", provider: "mirror_live", status: "", quick };
    case "manual_import":
      return { clubId: "", sourceId: "", provider: "manual_import", status: "", quick };
    case "critical_clubs":
      return { clubId: "", sourceId: "", provider: "", status: "", quick };
    case "last_24h":
      return { clubId: "", sourceId: "", provider: "", status: "", quick };
    default:
      return { ...EMPTY_SYNC_HISTORY_FILTERS };
  }
}

function matchesQuick(
  row: SyncHistoryRow,
  quick: SyncHistoryQuickFilter,
  criticalClubIds: Set<string>,
): boolean {
  if (quick === "all") return true;
  if (quick === "failed") {
    return row.status === "failed" || row.category === "FAIL";
  }
  if (quick === "mirror_live") return row.provider === "mirror_live";
  if (quick === "manual_import") return row.provider === "manual_import";
  if (quick === "critical_clubs") return criticalClubIds.has(row.clubId);
  if (quick === "last_24h") {
    const started = new Date(row.startedAt).getTime();
    return Number.isFinite(started) && Date.now() - started <= 24 * 60 * 60 * 1000;
  }
  return true;
}

export function filterSyncHistoryRows(
  rows: SyncHistoryRow[],
  filters: SyncHistoryFilters,
  criticalClubIds: string[],
): SyncHistoryRow[] {
  const criticalSet = new Set(criticalClubIds);

  return rows.filter((row) => {
    if (filters.clubId && row.clubId !== filters.clubId) return false;
    if (filters.sourceId && row.sourceId !== filters.sourceId) return false;
    if (filters.provider && row.provider !== filters.provider) return false;
    if (filters.status && row.status !== filters.status) return false;
    if (!matchesQuick(row, filters.quick, criticalSet)) return false;
    return true;
  });
}

export function syncHistoryFilterSummary(
  filters: SyncHistoryFilters,
  labels: { clubName?: string; leagueName?: string },
): string | null {
  const parts: string[] = [];
  if (labels.clubName) parts.push(`Klub: ${labels.clubName}`);
  if (labels.leagueName) parts.push(`Źródło: ${labels.leagueName}`);
  if (filters.provider) parts.push(`Provider: ${filters.provider}`);
  if (filters.status) parts.push(`Status: ${filters.status}`);
  if (filters.quick === "failed") parts.push("Quick: błędy");
  if (filters.quick === "mirror_live") parts.push("Quick: mirror live");
  if (filters.quick === "manual_import") parts.push("Quick: import ręczny");
  if (filters.quick === "critical_clubs") parts.push("Quick: kluby CRITICAL");
  if (filters.quick === "last_24h") parts.push("Quick: ostatnie 24 h");
  return parts.length ? parts.join(" · ") : null;
}
