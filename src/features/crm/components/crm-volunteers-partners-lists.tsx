import Link from "next/link";

import { CRM_VOLUNTEER_AREA_LABELS } from "@/types/crm";
import type { CrmContactRow } from "@/types/crm";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export function CrmVolunteersList({ contacts }: { contacts: CrmContactRow[] }) {
  if (!contacts.length) {
    return <p className="text-sm text-muted-foreground">Brak zarejestrowanych wolontariuszy.</p>;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {contacts.map((contact) => (
        <Link key={contact.id} href={`/crm/contacts/${contact.id}`}>
          <Card className="h-full hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{contact.name}</CardTitle>
            </CardHeader>
            <CardContent className="text-sm text-muted-foreground">
              {contact.phone ? <p>{contact.phone}</p> : null}
              <div className="mt-2 flex flex-wrap gap-1">
                {contact.volunteerAreas.map((area) => (
                  <span key={area} className="bg-muted rounded px-2 py-0.5 text-xs">
                    {CRM_VOLUNTEER_AREA_LABELS[area]}
                  </span>
                ))}
              </div>
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}

export function CrmPartnersList({ contacts }: { contacts: CrmContactRow[] }) {
  if (!contacts.length) {
    return <p className="text-sm text-muted-foreground">Brak partnerów biznesowych.</p>;
  }

  return (
    <div className="grid gap-3 md:grid-cols-2">
      {contacts.map((contact) => (
        <Link key={contact.id} href={`/crm/contacts/${contact.id}`}>
          <Card className="h-full hover:shadow-md">
            <CardHeader className="pb-2">
              <CardTitle className="text-base">{contact.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-1 text-sm text-muted-foreground">
              {contact.partnerServices ? <p>Usługi: {contact.partnerServices}</p> : null}
              {contact.partnerDiscounts ? <p>Rabaty: {contact.partnerDiscounts}</p> : null}
            </CardContent>
          </Card>
        </Link>
      ))}
    </div>
  );
}
