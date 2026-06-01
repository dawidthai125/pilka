import { notFound } from "next/navigation";

import { CrmContactForm } from "@/features/crm/components/crm-contact-form";
import { CrmInteractionTimeline } from "@/features/crm/components/crm-interaction-timeline";
import { getCrmContactDetail } from "@/lib/crm/loaders";
import { getDashboardContext, requireCrmReadAccess } from "@/lib/auth/session";
import { canManageCrm } from "@/config/permissions";
import { CRM_CONTACT_TYPE_LABELS } from "@/types/crm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function CrmContactDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { access } = await getDashboardContext();
  requireCrmReadAccess(access);

  const detail = await getCrmContactDetail(access.clubId, id);
  if (!detail) notFound();

  const { contact, interactions } = detail;
  const canManage = canManageCrm(access.roles);

  return (
    <div className="grid gap-6 lg:grid-cols-2">
      <Card>
        <CardHeader>
          <CardTitle>{contact.name}</CardTitle>
          <p className="text-sm text-muted-foreground">{CRM_CONTACT_TYPE_LABELS[contact.contactType]}</p>
        </CardHeader>
        <CardContent className="space-y-2 text-sm">
          {contact.contactPerson ? <p>Osoba: {contact.contactPerson}</p> : null}
          {contact.email ? <p>Email: {contact.email}</p> : null}
          {contact.phone ? <p>Tel: {contact.phone}</p> : null}
          {contact.address ? <p>Adres: {contact.address}</p> : null}
          {contact.website ? <p>WWW: {contact.website}</p> : null}
          {contact.notes ? <p className="pt-2">{contact.notes}</p> : null}
          {canManage ? (
            <div className="pt-4">
              <CrmContactForm contact={contact} />
            </div>
          ) : null}
        </CardContent>
      </Card>
      <CrmInteractionTimeline
        contactId={contact.id}
        interactions={interactions}
        canManage={canManage}
      />
    </div>
  );
}
