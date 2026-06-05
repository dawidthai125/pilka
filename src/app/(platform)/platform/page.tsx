import { PlatformDashboardView } from "@/features/platform/components/platform-dashboard";
import { PlatformShell } from "@/features/platform/components/platform-shell";
import { loadPlatformDashboard } from "@/lib/platform/dashboard";

export default async function PlatformDashboardPage() {
  const data = await loadPlatformDashboard();

  return (
    <PlatformShell
      title="Dashboard"
      subtitle="Co wymaga uwagi teraz — kluby, alerty i onboarding bez przechodzenia do Monitoring Center."
    >
      <PlatformDashboardView data={data} />
    </PlatformShell>
  );
}
