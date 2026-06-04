"use client";

import Link from "next/link";
import { useCallback, useMemo, useRef, useState } from "react";

import {
  formatPlatformDate,
  HealthLevelBadge,
} from "@/features/platform/components/platform-status-badges";
import { PlatformAlertsPanel } from "@/features/platform/components/platform-alerts-panel";
import { SyncHistorySection } from "@/features/platform/components/sync-history-section";
import type { ClubHealthRow, LeagueHealthRow } from "@/lib/platform/health";
import type { PlatformAlert } from "@/lib/platform/platform-alerts";
import {
  EMPTY_SYNC_HISTORY_FILTERS,
  filtersFromAlert,
  filtersFromClub,
  filtersFromLeague,
  syncHistoryFilterSummary,
  type SyncHistoryFilters,
} from "@/lib/platform/monitoring-filters";
import type { SyncHistoryRow } from "@/lib/platform/sync-history";
import { cn } from "@/lib/utils";

type MonitoringInteractiveProps = {
  alerts: PlatformAlert[];
  clubHealth: ClubHealthRow[];
  leagueHealth: LeagueHealthRow[];
  syncHistory: SyncHistoryRow[];
};

export function MonitoringInteractive({
  alerts,
  clubHealth,
  leagueHealth,
  syncHistory,
}: MonitoringInteractiveProps) {
  const historyRef = useRef<HTMLElement>(null);
  const [filters, setFilters] = useState<SyncHistoryFilters>(EMPTY_SYNC_HISTORY_FILTERS);
  const [healthFocus, setHealthFocus] = useState<string | null>(null);

  const criticalClubIds = useMemo(
    () => clubHealth.filter((c) => c.level === "CRITICAL").map((c) => c.clubId),
    [clubHealth],
  );

  const filterHint = useMemo(() => {
    const club = filters.clubId
      ? clubHealth.find((c) => c.clubId === filters.clubId)
      : undefined;
    const league = filters.sourceId
      ? leagueHealth.find((l) => l.sourceId === filters.sourceId)
      : undefined;
    return syncHistoryFilterSummary(filters, {
      clubName: club?.publicName,
      leagueName: league?.sourceName,
    });
  }, [filters, clubHealth, leagueHealth]);

  const scrollToHistory = useCallback(() => {
    historyRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }, []);

  const applyFromClub = useCallback(
    (row: ClubHealthRow) => {
      setFilters(filtersFromClub(row.clubId));
      setHealthFocus(`club:${row.clubId}`);
      scrollToHistory();
    },
    [scrollToHistory],
  );

  const applyFromLeague = useCallback(
    (row: LeagueHealthRow) => {
      setFilters(filtersFromLeague(row.clubId, row.sourceId, row.providerId));
      setHealthFocus(`league:${row.sourceId}`);
      scrollToHistory();
    },
    [scrollToHistory],
  );

  const applyFromAlert = useCallback(
    (alert: PlatformAlert) => {
      setFilters(filtersFromAlert(alert));
      if (alert.sourceId) {
        setHealthFocus(`league:${alert.sourceId}`);
      } else if (alert.clubId) {
        setHealthFocus(`club:${alert.clubId}`);
      } else {
        setHealthFocus(null);
      }
      scrollToHistory();
    },
    [scrollToHistory],
  );

  const filterHintWithAlert = filterHint;

  return (
    <>
      <PlatformAlertsPanel alerts={alerts} onAlertSelect={applyFromAlert} />

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-white/45">Club Health</h2>
          <p className="text-xs text-white/40">Kliknij wiersz → filtruj Sync History</p>
        </div>
        <ClubHealthPanel
          rows={clubHealth}
          healthFocus={healthFocus}
          onRowSelect={applyFromClub}
        />
      </section>

      <section className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-bold uppercase tracking-wide text-white/45">League Health</h2>
          <p className="text-xs text-white/40">Kliknij wiersz → filtruj Sync History</p>
        </div>
        <LeagueHealthPanel
          rows={leagueHealth}
          healthFocus={healthFocus}
          onRowSelect={applyFromLeague}
        />
      </section>

      <SyncHistorySection
        rows={syncHistory}
        filters={filters}
        onFiltersChange={setFilters}
        criticalClubIds={criticalClubIds}
        filterHint={filterHintWithAlert}
        sectionRef={historyRef}
      />
    </>
  );
}

const rowActiveClass =
  "bg-amber-950/35 ring-1 ring-inset ring-amber-500/40";

function ClubHealthPanel({
  rows,
  healthFocus,
  onRowSelect,
}: {
  rows: ClubHealthRow[];
  healthFocus: string | null;
  onRowSelect: (row: ClubHealthRow) => void;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-white/50">Brak klubów.</p>;
  }

  return (
    <>
      <div className="space-y-2 md:hidden">
        {rows.map((row) => {
          const active = healthFocus === `club:${row.clubId}`;
          return (
            <button
              key={row.clubId}
              type="button"
              onClick={() => onRowSelect(row)}
              className={cn(
                "w-full rounded-xl border border-white/10 bg-white/5 p-3 text-left text-sm transition-colors",
                active && rowActiveClass,
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <HealthLevelBadge level={row.level} />
                <span className="tabular-nums font-semibold text-white">{row.score}</span>
              </div>
              <p className="mt-2 font-medium text-white">{row.publicName}</p>
              <p className="text-xs text-white/45">/{row.slug} · {row.status}</p>
              <p className="mt-1 text-xs text-white/50 line-clamp-2">{row.factors.join(" · ")}</p>
            </button>
          );
        })}
      </div>
      <div className="hidden overflow-x-auto rounded-xl border border-white/10 md:block">
        <table className="w-full min-w-[880px] text-left text-sm">
          <thead className="border-b border-white/10 bg-white/5 text-white/45">
            <tr>
              <th className="px-3 py-3 font-medium lg:px-4">Health</th>
              <th className="px-3 py-3 font-medium lg:px-4">Score</th>
              <th className="px-3 py-3 font-medium lg:px-4">Klub</th>
              <th className="hidden px-3 py-3 font-medium lg:table-cell lg:px-4">Status</th>
              <th className="hidden px-3 py-3 font-medium xl:table-cell xl:px-4">Ostatni sync</th>
              <th className="px-3 py-3 font-medium lg:px-4">Czynniki</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const active = healthFocus === `club:${row.clubId}`;
              return (
                <tr
                  key={row.clubId}
                  tabIndex={0}
                  onClick={() => onRowSelect(row)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onRowSelect(row);
                    }
                  }}
                  className={cn(
                    "cursor-pointer border-b border-white/5 transition-colors last:border-0 hover:bg-white/5",
                    active && rowActiveClass,
                  )}
                >
                  <td className="px-3 py-3 lg:px-4">
                    <HealthLevelBadge level={row.level} />
                  </td>
                  <td className="px-3 py-3 tabular-nums font-semibold lg:px-4">{row.score}</td>
                  <td className="px-3 py-3 lg:px-4">
                    <Link
                      href={`/platform/clubs/${row.clubId}`}
                      className="font-medium hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {row.publicName}
                    </Link>
                    <span className="ml-2 text-white/45">/{row.slug}</span>
                  </td>
                  <td className="hidden px-3 py-3 text-white/60 lg:table-cell lg:px-4">{row.status}</td>
                  <td className="hidden px-3 py-3 text-white/60 xl:table-cell xl:px-4">
                    {row.lastSyncAt ? formatPlatformDate(row.lastSyncAt) : "—"}
                  </td>
                  <td className="px-3 py-3 text-xs text-white/50 lg:px-4">{row.factors.join(" · ")}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}

function LeagueHealthPanel({
  rows,
  healthFocus,
  onRowSelect,
}: {
  rows: LeagueHealthRow[];
  healthFocus: string | null;
  onRowSelect: (row: LeagueHealthRow) => void;
}) {
  if (rows.length === 0) {
    return <p className="text-sm text-white/50">Brak skonfigurowanych lig.</p>;
  }

  return (
    <>
      <div className="space-y-2 md:hidden">
        {rows.map((row) => {
          const active = healthFocus === `league:${row.sourceId}`;
          return (
            <button
              key={row.sourceId}
              type="button"
              onClick={() => onRowSelect(row)}
              className={cn(
                "w-full rounded-xl border border-white/10 bg-white/5 p-3 text-left text-sm transition-colors",
                active && rowActiveClass,
              )}
            >
              <div className="flex items-center justify-between gap-2">
                <HealthLevelBadge level={row.level} />
                <span className="text-xs text-white/45">{row.providerId ?? "—"}</span>
              </div>
              <p className="mt-2 font-medium text-white">{row.clubName}</p>
              <p className="text-xs text-white/45">{row.sourceName}</p>
            </button>
          );
        })}
      </div>
      <div className="hidden overflow-x-auto rounded-xl border border-white/10 md:block">
        <table className="w-full min-w-[960px] text-left text-sm">
          <thead className="border-b border-white/10 bg-white/5 text-white/45">
            <tr>
              <th className="px-3 py-3 font-medium lg:px-4">Health</th>
              <th className="px-3 py-3 font-medium lg:px-4">Klub / liga</th>
              <th className="px-3 py-3 font-medium lg:px-4">Provider</th>
              <th className="hidden px-3 py-3 font-medium lg:table-cell lg:px-4">Ostatni sync</th>
              <th className="hidden px-3 py-3 font-medium xl:table-cell xl:px-4">Kolejny cron</th>
              <th className="px-3 py-3 font-medium lg:px-4">Błędy 7d</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => {
              const active = healthFocus === `league:${row.sourceId}`;
              return (
                <tr
                  key={row.sourceId}
                  tabIndex={0}
                  onClick={() => onRowSelect(row)}
                  onKeyDown={(e) => {
                    if (e.key === "Enter" || e.key === " ") {
                      e.preventDefault();
                      onRowSelect(row);
                    }
                  }}
                  className={cn(
                    "cursor-pointer border-b border-white/5 transition-colors last:border-0 hover:bg-white/5",
                    active && rowActiveClass,
                  )}
                >
                  <td className="px-3 py-3 lg:px-4">
                    <HealthLevelBadge level={row.level} />
                  </td>
                  <td className="px-3 py-3 lg:px-4">
                    <Link
                      href={`/platform/clubs/${row.clubId}/league`}
                      className="font-medium hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {row.clubName}
                    </Link>
                    <p className="text-xs text-white/45">{row.sourceName}</p>
                  </td>
                  <td className="px-3 py-3 text-white/60 lg:px-4">{row.providerId ?? "—"}</td>
                  <td className="hidden px-3 py-3 text-white/60 lg:table-cell lg:px-4">
                    {row.lastSyncAt ? formatPlatformDate(row.lastSyncAt) : "—"}
                  </td>
                  <td className="hidden px-3 py-3 text-white/60 xl:table-cell xl:px-4">
                    {row.nextCronRunAt !== "—" ? formatPlatformDate(row.nextCronRunAt) : "—"}
                  </td>
                  <td className="px-3 py-3 tabular-nums lg:px-4">{row.recentErrorCount}</td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </>
  );
}
