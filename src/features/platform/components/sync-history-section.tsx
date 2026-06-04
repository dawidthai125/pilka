"use client";

import Link from "next/link";
import { useMemo, type RefObject } from "react";

import {
  formatPlatformDate,
  SyncCategoryBadge,
} from "@/features/platform/components/platform-status-badges";
import { Button } from "@/components/ui/button";
import {
  applyQuickFilter,
  EMPTY_SYNC_HISTORY_FILTERS,
  filterSyncHistoryRows,
  type SyncHistoryFilters,
  type SyncHistoryQuickFilter,
} from "@/lib/platform/monitoring-filters";
import type { SyncHistoryRow } from "@/lib/platform/sync-history";
import { cn } from "@/lib/utils";

const selectClassName =
  "h-9 w-full min-h-9 rounded-lg border border-white/15 bg-[#041810] px-2 text-sm text-white";

const QUICK_FILTERS: { id: SyncHistoryQuickFilter; label: string }[] = [
  { id: "all", label: "Wszystkie" },
  { id: "failed", label: "Błędy" },
  { id: "mirror_live", label: "Mirror live" },
  { id: "manual_import", label: "Import ręczny" },
  { id: "critical_clubs", label: "Kluby CRITICAL" },
  { id: "last_24h", label: "24 h" },
];

export type SyncHistorySectionProps = {
  rows: SyncHistoryRow[];
  filters: SyncHistoryFilters;
  onFiltersChange: (filters: SyncHistoryFilters) => void;
  criticalClubIds: string[];
  filterHint: string | null;
  sectionRef?: RefObject<HTMLElement | null>;
};

export function SyncHistorySection({
  rows,
  filters,
  onFiltersChange,
  criticalClubIds,
  filterHint,
  sectionRef,
}: SyncHistorySectionProps) {
  const statusOptions = useMemo(() => [...new Set(rows.map((r) => r.status))].sort(), [rows]);
  const providerOptions = useMemo(() => [...new Set(rows.map((r) => r.provider))].sort(), [rows]);
  const clubOptions = useMemo(() => {
    const byId = new Map<string, { id: string; label: string }>();
    for (const row of rows) {
      if (!byId.has(row.clubId)) {
        byId.set(row.clubId, { id: row.clubId, label: `${row.clubName} (/${row.clubSlug})` });
      }
    }
    return [...byId.values()].sort((a, b) => a.label.localeCompare(b.label, "pl"));
  }, [rows]);

  const filtered = useMemo(
    () => filterSyncHistoryRows(rows, filters, criticalClubIds),
    [rows, filters, criticalClubIds],
  );

  const hasActiveFilters =
    Boolean(filters.clubId || filters.sourceId || filters.provider || filters.status) ||
    filters.quick !== "all";

  return (
    <section ref={sectionRef} id="sync-history" className="scroll-mt-6 space-y-3">
      <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:items-end sm:justify-between">
        <h2 className="text-sm font-bold uppercase tracking-wide text-white/45">Sync History</h2>
        <p className="text-xs text-white/40">
          {filtered.length} / {rows.length} runów · Started ↓
        </p>
      </div>

      {filterHint ? (
        <p className="rounded-lg border border-amber-500/25 bg-amber-950/25 px-3 py-2 text-xs text-amber-100/90">
          Filtr z Health: {filterHint}
        </p>
      ) : null}

      <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
        {QUICK_FILTERS.map((chip) => (
          <Button
            key={chip.id}
            type="button"
            size="sm"
            variant="outline"
            className={cn(
              "shrink-0 border-white/15 bg-[#041810] text-xs text-white/80",
              filters.quick === chip.id && "border-[var(--club-secondary,#F4C430)] bg-amber-950/40 text-white",
            )}
            onClick={() => onFiltersChange(applyQuickFilter(chip.id, criticalClubIds))}
          >
            {chip.label}
          </Button>
        ))}
      </div>

      <div className="grid gap-3 rounded-xl border border-white/10 bg-white/5 p-3 sm:p-4 md:grid-cols-3">
        <label className="space-y-1 text-sm">
          <span className="text-white/45">Status</span>
          <select
            value={filters.status}
            onChange={(e) =>
              onFiltersChange({ ...filters, status: e.target.value, quick: "all" })
            }
            className={selectClassName}
          >
            <option value="">Wszystkie</option>
            {statusOptions.map((status) => (
              <option key={status} value={status}>
                {status}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-white/45">Provider</span>
          <select
            value={filters.provider}
            onChange={(e) =>
              onFiltersChange({ ...filters, provider: e.target.value, quick: "all" })
            }
            className={selectClassName}
          >
            <option value="">Wszystkie</option>
            {providerOptions.map((provider) => (
              <option key={provider} value={provider}>
                {provider}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-white/45">Klub</span>
          <select
            value={filters.clubId}
            onChange={(e) =>
              onFiltersChange({
                ...filters,
                clubId: e.target.value,
                sourceId: "",
                quick: "all",
              })
            }
            className={selectClassName}
          >
            <option value="">Wszystkie kluby</option>
            {clubOptions.map((club) => (
              <option key={club.id} value={club.id}>
                {club.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      {hasActiveFilters ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="border-white/15 bg-transparent text-xs text-white/70"
          onClick={() => onFiltersChange(EMPTY_SYNC_HISTORY_FILTERS)}
        >
          Wyczyść filtry
        </Button>
      ) : null}

      {filtered.length === 0 ? (
        <p className="text-sm text-white/50">Brak runów dla wybranych filtrów.</p>
      ) : (
        <>
          <div className="space-y-2 md:hidden">
            {filtered.map((row) => (
              <SyncHistoryMobileCard key={row.jobId} row={row} />
            ))}
          </div>
          <div className="hidden overflow-x-auto rounded-xl border border-white/10 md:block">
            <table className="w-full min-w-[1100px] text-left text-sm">
              <thead className="border-b border-white/10 bg-white/5 text-white/45">
                <tr>
                  <th className="px-3 py-3 font-medium lg:px-4">Started</th>
                  <th className="px-3 py-3 font-medium lg:px-4">Provider</th>
                  <th className="hidden px-3 py-3 font-medium lg:table-cell lg:px-4">Trigger</th>
                  <th className="px-3 py-3 font-medium lg:px-4">Status</th>
                  <th className="px-3 py-3 font-medium lg:px-4">Duration</th>
                  <th className="px-3 py-3 font-medium lg:px-4">Club</th>
                  <th className="hidden px-3 py-3 font-medium xl:table-cell xl:px-4">League</th>
                  <th className="px-3 py-3 font-medium lg:px-4">Last Error</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((row) => (
                  <tr key={row.jobId} className="border-b border-white/5 last:border-0">
                    <td className="px-3 py-3 text-white/60 lg:px-4">
                      {formatPlatformDate(row.startedAt)}
                    </td>
                    <td className="px-3 py-3 text-white/70 lg:px-4">{row.providerLabel}</td>
                    <td className="hidden px-3 py-3 text-white/60 lg:table-cell lg:px-4">
                      {row.triggerLabel}
                    </td>
                    <td className="px-3 py-3 lg:px-4">
                      <div className="flex flex-wrap items-center gap-2">
                        <SyncCategoryBadge category={row.category} />
                        <span className="text-xs uppercase text-white/50">{row.status}</span>
                      </div>
                    </td>
                    <td className="px-3 py-3 text-white/60 lg:px-4">{row.durationLabel}</td>
                    <td className="px-3 py-3 lg:px-4">
                      <Link
                        href={`/platform/clubs/${row.clubId}/league`}
                        className="font-medium hover:underline"
                        onClick={(e) => e.stopPropagation()}
                      >
                        {row.clubName}
                      </Link>
                      <span className="ml-1 text-xs text-white/45">/{row.clubSlug}</span>
                    </td>
                    <td className="hidden px-3 py-3 text-white/60 xl:table-cell xl:px-4">
                      {row.leagueName}
                    </td>
                    <td
                      className="max-w-[180px] truncate px-3 py-3 text-xs text-red-200/80 lg:max-w-[220px] lg:px-4"
                      title={row.lastErrorFull ?? undefined}
                    >
                      {row.lastErrorShort ?? "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}

function SyncHistoryMobileCard({ row }: { row: SyncHistoryRow }) {
  return (
    <article className="rounded-xl border border-white/10 bg-white/5 p-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div>
          <p className="font-medium text-white">{row.clubName}</p>
          <p className="text-xs text-white/45">
            {row.leagueName} · {row.providerLabel}
          </p>
        </div>
        <SyncCategoryBadge category={row.category} />
      </div>
      <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-1 text-xs text-white/60">
        <div>
          <dt className="text-white/40">Started</dt>
          <dd>{formatPlatformDate(row.startedAt)}</dd>
        </div>
        <div>
          <dt className="text-white/40">Duration</dt>
          <dd>{row.durationLabel}</dd>
        </div>
        <div>
          <dt className="text-white/40">Trigger</dt>
          <dd>{row.triggerLabel}</dd>
        </div>
        <div>
          <dt className="text-white/40">Status</dt>
          <dd className="uppercase">{row.status}</dd>
        </div>
      </dl>
      {row.lastErrorShort ? (
        <p className="mt-2 line-clamp-2 text-xs text-red-200/80" title={row.lastErrorFull ?? undefined}>
          {row.lastErrorShort}
        </p>
      ) : null}
    </article>
  );
}
