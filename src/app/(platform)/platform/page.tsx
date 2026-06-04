import { PlatformDashboardView } from "@/features/platform/components/platform-dashboard";
import { PlatformShell } from "@/features/platform/components/platform-shell";
import { loadPlatformDashboard } from "@/lib/platform/dashboard";

export default async function PlatformDashboardPage() {
  const data = await loadPlatformDashboard();

  return (
    <PlatformShell title="Dashboard" subtitle="Stan platformy FC OS — kluby, sync, operacje.">
      <PlatformDashboardView data={data} />
    </PlatformShell>
  );
}
