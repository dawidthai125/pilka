import Link from "next/link";

import { CrmContactsList } from "@/features/crm/components/crm-contacts-list";
import { getCrmContacts } from "@/lib/crm/loaders";
import { getDashboardContext, requireCrmReadAccess } from "@/lib/auth/session";
import { canManageCrm } from "@/config/permissions";

export default async function CrmContactsPage() {
  const { access } = await getDashboardContext();
  requireCrmReadAccess(access);
  const contacts = await getCrmContacts(access.clubId);

  return (
    <div className="space-y-4">
      {canManageCrm(access.roles) ? (
        <Link
          href="/crm/contacts/new"
          className="bg-primary text-primary-foreground inline-flex h-9 items-center justify-center rounded-md px-4 text-sm font-medium"
        >
          Nowy kontakt
        </Link>
      ) : null}
      <CrmContactsList contacts={contacts} />
    </div>
  );
}
