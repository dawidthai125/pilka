import { InjuryPortalPanel } from "@/features/injuries/components/injury-portal-panel";
import { getDashboardContext, requireInjuryPortalAccess } from "@/lib/auth/session";
import { getPortalInjuries } from "@/lib/injuries/loaders";

export default async function InjuryPortalPage() {
  const { access } = await getDashboardContext();
  requireInjuryPortalAccess(access);

  const injuries = await getPortalInjuries(access.clubId);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Mój status urazu</h2>
      <InjuryPortalPanel injuries={injuries} />
    </div>
  );
}
