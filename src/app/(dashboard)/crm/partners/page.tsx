import { CrmPartnersList } from "@/features/crm/components/crm-volunteers-partners-lists";
import { getCrmContacts } from "@/lib/crm/loaders";
import { getDashboardContext, requireCrmReadAccess } from "@/lib/auth/session";

export default async function CrmPartnersPage() {
  const { access } = await getDashboardContext();
  requireCrmReadAccess(access);
  const contacts = await getCrmContacts(access.clubId, "partner");
  return <CrmPartnersList contacts={contacts} />;
}
