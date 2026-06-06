import { PlatformDashboardView } from "@/features/platform/components/platform-dashboard";
import { PlatformShell } from "@/features/platform/components/platform-shell";
import { loadPlatformDashboard } from "@/lib/platform/dashboard";

export default async function PlatformDashboardPage() {
  const data = await loadPlatformDashboard();

  return (
    <PlatformShell
      title="Pulpit"
      subtitle="Priorytet operatora: pilne działania, stan platformy i skróty operacyjne."
    >
      <PlatformDashboardView data={data} />
    </PlatformShell>
  );
}
