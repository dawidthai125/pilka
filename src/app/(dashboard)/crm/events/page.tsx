import { CrmEventsPanel } from "@/features/crm/components/crm-donations-events-panels";
import { getCrmEvents } from "@/lib/crm/loaders";
import { getDashboardContext, requireCrmReadAccess } from "@/lib/auth/session";
import { canManageCrm } from "@/config/permissions";

export default async function CrmEventsPage() {
  const { access } = await getDashboardContext();
  requireCrmReadAccess(access);
  const events = await getCrmEvents(access.clubId);
  return <CrmEventsPanel events={events} canManage={canManageCrm(access.roles)} />;
}
