import { CrmDonationsPanel } from "@/features/crm/components/crm-donations-events-panels";
import { getCrmDonations } from "@/lib/crm/loaders";
import { getDashboardContext, requireCrmReadAccess } from "@/lib/auth/session";
import { canManageCrm } from "@/config/permissions";

export default async function CrmDonationsPage() {
  const { access } = await getDashboardContext();
  requireCrmReadAccess(access);
  const donations = await getCrmDonations(access.clubId);
  return <CrmDonationsPanel donations={donations} canManage={canManageCrm(access.roles)} />;
}
