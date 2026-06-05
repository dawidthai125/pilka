import { SyncMonitoringView } from "@/features/platform/components/sync-monitoring-view";
import { PlatformShell } from "@/features/platform/components/platform-shell";
import { loadPlatformMonitoringBundle } from "@/lib/platform/health";

type Props = { searchParams: Promise<{ clubId?: string }> };

export default async function PlatformMonitoringPage({ searchParams }: Props) {
  const { clubId } = await searchParams;
  const data = await loadPlatformMonitoringBundle();

  return (
    <PlatformShell
      title="Monitoring"
      subtitle="Synchronizacje ligowe, cron, zdrowie klubów i lig — bez logów i SQL."
    >
      <SyncMonitoringView data={data} initialClubId={clubId?.trim() || undefined} />
    </PlatformShell>
  );
}
