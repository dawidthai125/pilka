import { SyncMonitoringView } from "@/features/platform/components/sync-monitoring-view";
import { PlatformShell } from "@/features/platform/components/platform-shell";
import {
  loadPlatformMonitoringBundle,
  MONITORING_HEALTH_PAGE_SIZE_OPTIONS,
} from "@/lib/platform/health";

type Props = {
  searchParams: Promise<{
    clubId?: string;
    clubPage?: string;
    leaguePage?: string;
    healthPageSize?: string;
  }>;
};

function parseHealthPageSize(value?: string): number {
  const n = Number(value);
  return (MONITORING_HEALTH_PAGE_SIZE_OPTIONS as readonly number[]).includes(n) ? n : 50;
}

export default async function PlatformMonitoringPage({ searchParams }: Props) {
  const params = await searchParams;
  const data = await loadPlatformMonitoringBundle({
    clubHealthPage: Math.max(1, Number(params.clubPage) || 1),
    leagueHealthPage: Math.max(1, Number(params.leaguePage) || 1),
    healthPageSize: parseHealthPageSize(params.healthPageSize),
  });

  return (
    <PlatformShell
      title="Monitoring"
      subtitle="Synchronizacje ligowe, cron, zdrowie klubów i lig — bez logów i SQL."
    >
      <SyncMonitoringView
        data={data}
        initialClubId={params.clubId?.trim() || undefined}
        monitoringQuery={{
          clubPage: data.clubHealthPagination.page,
          leaguePage: data.leagueHealthPagination.page,
          healthPageSize: data.clubHealthPagination.pageSize,
        }}
      />
    </PlatformShell>
  );
}
