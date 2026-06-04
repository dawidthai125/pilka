import Link from "next/link";

import { formatPlatformDate } from "@/features/platform/components/platform-status-badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { AuditCenterData } from "@/lib/platform/audit-center";
import {
  PLATFORM_AUDIT_ACTION_LABELS,
  PLATFORM_AUDIT_ACTIONS,
} from "@/lib/platform/platform-audit-actions";

function buildAuditQuery(filters: AuditCenterData["filters"]) {
  const params = new URLSearchParams();
  if (filters.clubId) params.set("clubId", filters.clubId);
  if (filters.action) params.set("action", filters.action);
  if (filters.dateFrom) params.set("dateFrom", filters.dateFrom);
  if (filters.dateTo) params.set("dateTo", filters.dateTo);
  const qs = params.toString();
  return qs ? `/platform/audit?${qs}` : "/platform/audit";
}

export function AuditCenterView({ data }: { data: AuditCenterData }) {
  const { entries, clubs, filters } = data;

  return (
    <div className="space-y-6">
      <Card className="border-white/10 bg-white/5 text-white">
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filtry</CardTitle>
        </CardHeader>
        <CardContent>
          <form method="get" action="/platform/audit" className="grid gap-4 sm:grid-cols-2 lg:grid-cols-5">
            <label className="space-y-1 text-sm">
              <span className="text-white/45">Klub</span>
              <select
                name="clubId"
                defaultValue={filters.clubId ?? ""}
                className="h-9 w-full rounded-lg border border-white/15 bg-[#041810] px-2 text-sm text-white"
              >
                <option value="">Wszystkie kluby</option>
                {clubs.map((club) => (
                  <option key={club.id} value={club.id}>
                    {club.publicName} (/{club.slug})
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-white/45">Typ zdarzenia</span>
              <select
                name="action"
                defaultValue={filters.action ?? ""}
                className="h-9 w-full rounded-lg border border-white/15 bg-[#041810] px-2 text-sm text-white"
              >
                <option value="">Wszystkie typy</option>
                {PLATFORM_AUDIT_ACTIONS.map((action) => (
                  <option key={action} value={action}>
                    {PLATFORM_AUDIT_ACTION_LABELS[action]}
                  </option>
                ))}
              </select>
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-white/45">Data od</span>
              <input
                type="date"
                name="dateFrom"
                defaultValue={filters.dateFrom ?? ""}
                className="h-9 w-full rounded-lg border border-white/15 bg-[#041810] px-2 text-sm text-white"
              />
            </label>
            <label className="space-y-1 text-sm">
              <span className="text-white/45">Data do</span>
              <input
                type="date"
                name="dateTo"
                defaultValue={filters.dateTo ?? ""}
                className="h-9 w-full rounded-lg border border-white/15 bg-[#041810] px-2 text-sm text-white"
              />
            </label>
            <div className="flex items-end gap-2">
              <button
                type="submit"
                className="h-9 rounded-lg bg-[var(--club-secondary,#F4C430)] px-4 text-sm font-semibold text-[#041810]"
              >
                Filtruj
              </button>
              <Link href="/platform/audit" className="h-9 rounded-lg border border-white/15 px-3 py-2 text-sm text-white/70">
                Wyczyść
              </Link>
            </div>
          </form>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <div className="flex items-center justify-between gap-4">
          <h2 className="text-sm font-bold uppercase tracking-wide text-white/45">
            Zdarzenia ({entries.length})
          </h2>
          <p className="text-xs text-white/40">Źródło: clubs.settings.platformAudit</p>
        </div>

        {entries.length === 0 ? (
          <p className="text-sm text-white/50">Brak zdarzeń dla wybranych filtrów.</p>
        ) : (
          <div className="overflow-x-auto rounded-xl border border-white/10">
            <table className="w-full min-w-[760px] text-left text-sm">
              <thead className="border-b border-white/10 bg-white/5 text-white/45">
                <tr>
                  <th className="px-4 py-3 font-medium">Data</th>
                  <th className="px-4 py-3 font-medium">Typ</th>
                  <th className="px-4 py-3 font-medium">Klub</th>
                  <th className="px-4 py-3 font-medium">Operator</th>
                  <th className="px-4 py-3 font-medium">Szczegóły</th>
                </tr>
              </thead>
              <tbody>
                {entries.map((entry, index) => (
                  <tr key={`${entry.at}-${entry.action}-${index}`} className="border-b border-white/5 last:border-0">
                    <td className="px-4 py-3 text-white/60">{formatPlatformDate(entry.at)}</td>
                    <td className="px-4 py-3 font-medium">
                      {PLATFORM_AUDIT_ACTION_LABELS[entry.action as keyof typeof PLATFORM_AUDIT_ACTION_LABELS] ??
                        entry.action}
                    </td>
                    <td className="px-4 py-3">
                      <Link href={`/platform/clubs/${entry.clubId}`} className="hover:underline">
                        {entry.clubName}
                      </Link>
                      <span className="ml-2 text-white/45">/{entry.clubSlug}</span>
                    </td>
                    <td className="px-4 py-3 text-white/60">{entry.actorEmail}</td>
                    <td className="px-4 py-3 text-xs text-white/45">
                      {entry.metadata ? JSON.stringify(entry.metadata).slice(0, 120) : "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>

      <p className="text-xs text-white/35">
        Aktywny filtr:{" "}
        <Link href={buildAuditQuery(filters)} className="underline">
          {buildAuditQuery(filters)}
        </Link>
      </p>
    </div>
  );
}
