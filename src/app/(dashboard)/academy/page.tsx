import {
  AcademyAiPrompts,
  AcademyGroupsPanel,
  AcademyStatsCards,
} from "@/features/academy/components/academy-panels";
import {
  getAcademyDashboardStats,
  getAcademyGroups,
  requireAcademyReadAccess,
} from "@/lib/academy/loaders";
import { getDashboardContext } from "@/lib/auth/session";

export default async function AcademyPage() {
  const { access } = await getDashboardContext();
  requireAcademyReadAccess(access);

  const [stats, groups] = await Promise.all([
    getAcademyDashboardStats(access.clubId),
    getAcademyGroups(access.clubId),
  ]);

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold">Akademia klubowa</h1>
        <p className="text-sm text-muted-foreground">
          Rozwój zawodników od Skrzatów po Seniorów — Piorun Wawrzeńczyce
        </p>
      </div>
      <AcademyStatsCards stats={stats} />
      <section className="space-y-3">
        <h2 className="text-lg font-semibold">Grupy wiekowe</h2>
        <AcademyGroupsPanel groups={groups} />
      </section>
      <AcademyAiPrompts category="development" />
    </>
  );
}
