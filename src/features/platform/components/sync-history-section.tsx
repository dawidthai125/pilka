"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import {
  formatPlatformDate,
  SyncCategoryBadge,
} from "@/features/platform/components/platform-status-badges";
import type { SyncHistoryRow } from "@/lib/platform/sync-history";

const selectClassName =
  "h-9 w-full rounded-lg border border-white/15 bg-[#041810] px-2 text-sm text-white";

type SyncHistorySectionProps = {
  rows: SyncHistoryRow[];
};

export function SyncHistorySection({ rows }: SyncHistorySectionProps) {
  const [statusFilter, setStatusFilter] = useState("");
  const [providerFilter, setProviderFilter] = useState("");
  const [clubFilter, setClubFilter] = useState("");

  const statusOptions = useMemo(() => {
    const values = new Set(rows.map((r) => r.status));
    return [...values].sort();
  }, [rows]);

  const providerOptions = useMemo(() => {
    const values = new Set(rows.map((r) => r.provider));
    return [...values].sort();
  }, [rows]);

  const clubOptions = useMemo(() => {
    const byId = new Map<string, { id: string; label: string }>();
    for (const row of rows) {
      if (!byId.has(row.clubId)) {
        byId.set(row.clubId, {
          id: row.clubId,
          label: `${row.clubName} (/${row.clubSlug})`,
        });
      }
    }
    return [...byId.values()].sort((a, b) => a.label.localeCompare(b.label, "pl"));
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((row) => {
      if (statusFilter && row.status !== statusFilter) return false;
      if (providerFilter && row.provider !== providerFilter) return false;
      if (clubFilter && row.clubId !== clubFilter) return false;
      return true;
    });
  }, [rows, statusFilter, providerFilter, clubFilter]);

  return (
    <section className="space-y-3">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-white/45">Sync History</h2>
        <p className="text-xs text-white/40">
          {filtered.length} / {rows.length} runów · sortowanie: Started ↓
        </p>
      </div>

      <div className="grid gap-3 rounded-xl border border-white/10 bg-white/5 p-4 sm:grid-cols-3">
        <label className="space-y-1 text-sm">
          <span className="text-white/45">Status</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
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
            value={providerFilter}
            onChange={(e) => setProviderFilter(e.target.value)}
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
            value={clubFilter}
            onChange={(e) => setClubFilter(e.target.value)}
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

      {filtered.length === 0 ? (
        <p className="text-sm text-white/50">Brak runów dla wybranych filtrów.</p>
      ) : (
        <div className="overflow-x-auto rounded-xl border border-white/10">
          <table className="w-full min-w-[1100px] text-left text-sm">
            <thead className="border-b border-white/10 bg-white/5 text-white/45">
              <tr>
                <th className="px-4 py-3 font-medium">Started</th>
                <th className="px-4 py-3 font-medium">Provider</th>
                <th className="px-4 py-3 font-medium">Trigger</th>
                <th className="px-4 py-3 font-medium">Status</th>
                <th className="px-4 py-3 font-medium">Duration</th>
                <th className="px-4 py-3 font-medium">Club</th>
                <th className="px-4 py-3 font-medium">League</th>
                <th className="px-4 py-3 font-medium">Last Error</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => (
                <tr key={row.jobId} className="border-b border-white/5 last:border-0">
                  <td className="px-4 py-3 text-white/60">{formatPlatformDate(row.startedAt)}</td>
                  <td className="px-4 py-3 text-white/70">{row.providerLabel}</td>
                  <td className="px-4 py-3 text-white/60">{row.triggerLabel}</td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <SyncCategoryBadge category={row.category} />
                      <span className="uppercase text-white/50">{row.status}</span>
                    </div>
                  </td>
                  <td className="px-4 py-3 text-white/60">{row.durationLabel}</td>
                  <td className="px-4 py-3">
                    <Link
                      href={`/platform/clubs/${row.clubId}/league`}
                      className="font-medium hover:underline"
                    >
                      {row.clubName}
                    </Link>
                    <span className="ml-2 text-white/45">/{row.clubSlug}</span>
                  </td>
                  <td className="px-4 py-3 text-white/60">{row.leagueName}</td>
                  <td
                    className="max-w-[220px] truncate px-4 py-3 text-xs text-red-200/80"
                    title={row.lastErrorFull ?? undefined}
                  >
                    {row.lastErrorShort ?? "—"}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
