import { CrmVolunteersList } from "@/features/crm/components/crm-volunteers-partners-lists";
import { getCrmContacts } from "@/lib/crm/loaders";
import { getDashboardContext, requireCrmReadAccess } from "@/lib/auth/session";

export default async function CrmVolunteersPage() {
  const { access } = await getDashboardContext();
  requireCrmReadAccess(access);
  const contacts = await getCrmContacts(access.clubId, "volunteer");
  return <CrmVolunteersList contacts={contacts} />;
}
