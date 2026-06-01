import { CrmParentsPanel } from "@/features/crm/components/crm-parents-panel";
import { getCrmParentContext } from "@/lib/crm/loaders";
import { getDashboardContext, requireCrmPortalAccess } from "@/lib/auth/session";
import { canManageCrm } from "@/config/permissions";
import { redirect } from "next/navigation";

export default async function CrmParentsPage() {
  const { access, user } = await getDashboardContext();

  if (canManageCrm(access.roles)) {
    redirect("/crm/contacts?type=parent");
  }

  requireCrmPortalAccess(access);
  if (!user) redirect("/login");

  const context = await getCrmParentContext(access.clubId, user.id);
  return <CrmParentsPanel context={context} />;
}
