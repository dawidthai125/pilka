import { InjuryRegistryList } from "@/features/injuries/components/injury-registry-list";
import { getDashboardContext, requireInjuryStaffAccess } from "@/lib/auth/session";
import { getPlayerInjuries } from "@/lib/injuries/loaders";
import type { InjuryRecordStatus } from "@/types/injuries";

export default async function InjuriesRegistryPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { access } = await getDashboardContext();
  requireInjuryStaffAccess(access);
  const params = await searchParams;
  const statusParam = params.status as InjuryRecordStatus | undefined;

  const injuries = await getPlayerInjuries(access.clubId, {
    status: statusParam,
    activeOnly: !statusParam,
  });

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Rejestr urazów</h2>
      <InjuryRegistryList injuries={injuries} />
    </div>
  );
}
