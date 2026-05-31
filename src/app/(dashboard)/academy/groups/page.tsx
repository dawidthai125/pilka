import { AcademyGroupsPanel } from "@/features/academy/components/academy-panels";
import { getAcademyGroups, requireAcademyReadAccess } from "@/lib/academy/loaders";
import { getDashboardContext } from "@/lib/auth/session";

export default async function AcademyGroupsPage() {
  const { access } = await getDashboardContext();
  requireAcademyReadAccess(access);
  const groups = await getAcademyGroups(access.clubId);

  return (
    <>
      <div>
        <h1 className="text-2xl font-semibold">Grupy akademii</h1>
        <p className="text-sm text-muted-foreground">Kadra, treningi i mecze w podziale na grupy wiekowe.</p>
      </div>
      <AcademyGroupsPanel groups={groups} />
    </>
  );
}
