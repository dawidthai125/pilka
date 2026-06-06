import {
  formatPlatformDate,
  SyncCategoryBadge,
} from "@/features/platform/components/platform-status-badges";
import { MonitoringInteractive } from "@/features/platform/components/monitoring-interactive";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import type { PlatformMonitoringBundle } from "@/lib/platform/health-types";
import { cn } from "@/lib/utils";

export type MonitoringViewQuery = {
  clubPage: number;
  leaguePage: number;
  healthPageSize: number;
};

export function SyncMonitoringView({
  data,
  initialClubId,
  monitoringQuery,
}: {
  data: PlatformMonitoringBundle;
  initialClubId?: string;
  monitoringQuery: MonitoringViewQuery;
}) {
  const { syncMonitoring, alerts, clubHealth, leagueHealth, syncHistory } = data;
  const { cron } = syncMonitoring;

  return (
    <div className="space-y-6 md:space-y-8">
      <Card
        className={cn(
          "border-white/10 text-white",
          cron.status === "PASS"
            ? "bg-emerald-950/20"
            : cron.status === "WARNING"
              ? "bg-amber-950/20"
              : "bg-red-950/20",
        )}
      >
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
            Endpoint: <code className="text-white/55">/api/cron/league-sync</code> · FAIL:{" "}
            {cron.recentFailCount} · WARNING: {cron.recentWarningCount}
          </p>
        </CardContent>
      </Card>

      <MonitoringInteractive
        alerts={alerts}
        clubHealth={clubHealth}
        leagueHealth={leagueHealth}
        syncHistory={syncHistory}
        initialClubId={initialClubId}
        clubHealthPagination={data.clubHealthPagination}
        leagueHealthPagination={data.leagueHealthPagination}
        monitoringQuery={monitoringQuery}
      />
    </div>
  );
}
