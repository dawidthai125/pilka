import Link from "next/link";

import { CRM_CONTACT_TYPE_LABELS } from "@/types/crm";
import type { CrmContactRow } from "@/types/crm";
import { CRM_PIPELINE_STATUS_LABELS } from "@/types/crm";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CrmContactsList({ contacts }: { contacts: CrmContactRow[] }) {
  if (!contacts.length) {
    return <p className="text-sm text-muted-foreground">Brak kontaktów CRM.</p>;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {contacts.map((contact) => (
        <Link key={contact.id} href={`/crm/contacts/${contact.id}`}>
          <Card className="h-full transition-shadow hover:shadow-md">
            <CardHeader className="pb-2">
              <div className="flex items-start justify-between gap-2">
                <CardTitle className="text-base">{contact.name}</CardTitle>
                <Badge variant="outline">{CRM_CONTACT_TYPE_LABELS[contact.contactType]}</Badge>
              </div>
            </CardHeader>
            <CardContent className="space-y-1 text-sm text-muted-foreground">
              {contact.contactPerson ? <p>{contact.contactPerson}</p> : null}
              {contact.email ? <p>{contact.email}</p> : null}
              {contact.phone ? <p>{contact.phone}</p> : null}
              <p className="text-xs">{CRM_PIPELINE_STATUS_LABELS[contact.pipelineStatus]}</p>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
