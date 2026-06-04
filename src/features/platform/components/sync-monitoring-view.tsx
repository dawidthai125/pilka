import Link from "next/link";

import {
  formatPlatformDate,
  HealthLevelBadge,
  SyncCategoryBadge,
} from "@/features/platform/components/platform-status-badges";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { SyncHistorySection } from "@/features/platform/components/sync-history-section";
import type { PlatformMonitoringBundle } from "@/lib/platform/health";
import { cn } from "@/lib/utils";

export function SyncMonitoringView({ data }: { data: PlatformMonitoringBundle }) {
  const { syncMonitoring, clubHealth, leagueHealth, syncHistory } = data;
  const { cron } = syncMonitoring;

  return (
    <div className="space-y-8">
      <Card className={cn("border-white/10 text-white", cron.status === "PASS" ? "bg-emerald-950/20" : cron.status === "WARNING" ? "bg-amber-950/20" : "bg-red-950/20")}>
        <CardHeader className="pb-2">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base">Cron ligowy</CardTitle>
            <SyncCategoryBadge category={cron.status} />
          </div>
        </CardHeader>
        <CardContent className="space-y-2 text-sm text-white/70">
          <p>{cron.statusMessage}</p>
          <dl className="grid gap-2 sm:grid-cols-2 lg:grid-cols-4">
            <div>
              <dt className="text-white/45">Harmonogram</dt>
              <dd>{cron.scheduleLabel}</dd>
            </div>
            <div>
              <dt className="text-white/45">Kolejne uruchomienie</dt>
              <dd>{formatPlatformDate(cron.nextRunAt)}</dd>
            </div>
            <div>
              <dt className="text-white/45">Ostatni sukces</dt>
              <dd>{cron.lastSuccessfulSyncAt ? formatPlatformDate(cron.lastSuccessfulSyncAt) : "—"}</dd>
            </div>
            <div>
              <dt className="text-white/45">Ostatni błąd</dt>
              <dd>{cron.lastFailedSyncAt ? formatPlatformDate(cron.lastFailedSyncAt) : "—"}</dd>
            </div>
          </dl>
          <p className="text-xs text-white/40">
            Endpoint: <code className="text-white/55">/api/cron/league-sync</code> · FAIL: {cron.recentFailCount} ·
            WARNING: {cron.recentWarningCount}
          </p>
        </CardContent>
      </Card>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-white/45">Club Health</h2>
        <ClubHealthTable rows={clubHealth} />
      </section>

      <section className="space-y-3">
        <h2 className="text-sm font-bold uppercase tracking-wide text-white/45">League Health</h2>
        <LeagueHealthTable rows={leagueHealth} />
      </section>

      <SyncHistorySection rows={syncHistory} />
    </div>
  );
}

function ClubHealthTable({ rows }: { rows: PlatformMonitoringBundle["clubHealth"] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-white/50">Brak klubów.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full min-w-[880px] text-left text-sm">
        <thead className="border-b border-white/10 bg-white/5 text-white/45">
          <tr>
            <th className="px-4 py-3 font-medium">Health</th>
            <th className="px-4 py-3 font-medium">Score</th>
            <th className="px-4 py-3 font-medium">Klub</th>
            <th className="px-4 py-3 font-medium">Status</th>
            <th className="px-4 py-3 font-medium">Ostatni sync</th>
            <th className="px-4 py-3 font-medium">Czynniki</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.clubId} className="border-b border-white/5 last:border-0">
              <td className="px-4 py-3">
                <HealthLevelBadge level={row.level} />
              </td>
              <td className="px-4 py-3 tabular-nums font-semibold">{row.score}</td>
              <td className="px-4 py-3">
                <Link href={`/platform/clubs/${row.clubId}`} className="font-medium hover:underline">
                  {row.publicName}
                </Link>
                <span className="ml-2 text-white/45">/{row.slug}</span>
              </td>
              <td className="px-4 py-3 text-white/60">{row.status}</td>
              <td className="px-4 py-3 text-white/60">
                {row.lastSyncAt ? formatPlatformDate(row.lastSyncAt) : "—"}
              </td>
              <td className="px-4 py-3 text-xs text-white/50">{row.factors.join(" · ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

function LeagueHealthTable({ rows }: { rows: PlatformMonitoringBundle["leagueHealth"] }) {
  if (rows.length === 0) {
    return <p className="text-sm text-white/50">Brak skonfigurowanych lig.</p>;
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-white/10">
      <table className="w-full min-w-[960px] text-left text-sm">
        <thead className="border-b border-white/10 bg-white/5 text-white/45">
          <tr>
            <th className="px-4 py-3 font-medium">Health</th>
            <th className="px-4 py-3 font-medium">Klub / liga</th>
            <th className="px-4 py-3 font-medium">Provider</th>
            <th className="px-4 py-3 font-medium">Ostatni sync</th>
            <th className="px-4 py-3 font-medium">Kolejny cron</th>
            <th className="px-4 py-3 font-medium">Błędy 7d</th>
            <th className="px-4 py-3 font-medium">Czynniki</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.sourceId} className="border-b border-white/5 last:border-0">
              <td className="px-4 py-3">
                <HealthLevelBadge level={row.level} />
              </td>
              <td className="px-4 py-3">
                <Link href={`/platform/clubs/${row.clubId}/league`} className="font-medium hover:underline">
                  {row.clubName}
                </Link>
                <p className="text-xs text-white/45">{row.sourceName}</p>
              </td>
              <td className="px-4 py-3 text-white/60">{row.providerId ?? "—"}</td>
              <td className="px-4 py-3 text-white/60">
                {row.lastSyncAt ? formatPlatformDate(row.lastSyncAt) : "—"}
              </td>
              <td className="px-4 py-3 text-white/60">
                {row.nextCronRunAt !== "—" ? formatPlatformDate(row.nextCronRunAt) : "—"}
              </td>
              <td className="px-4 py-3 tabular-nums">{row.recentErrorCount}</td>
              <td className="px-4 py-3 text-xs text-white/50">{row.factors.join(" · ")}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
