import { getCrmPortalContact } from "@/lib/crm/loaders";
import { getDashboardContext, requireCrmPortalAccess } from "@/lib/auth/session";
import { redirect } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function CrmPortalPage() {
  const { access, user } = await getDashboardContext();
  requireCrmPortalAccess(access);
  if (!user) redirect("/login");

  const contact = await getCrmPortalContact(access.clubId, user.id);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Twój profil CRM</CardTitle>
      </CardHeader>
      <CardContent className="text-sm">
        {contact ? (
          <div className="space-y-1">
            <p className="font-medium">{contact.name}</p>
            {contact.email ? <p>{contact.email}</p> : null}
            {contact.phone ? <p>{contact.phone}</p> : null}
            <p className="text-muted-foreground pt-2">
              Widzisz wyłącznie własne dane CRM. W sprawach klubu skontaktuj się z zarządem.
            </p>
          </div>
        ) : (
          <p className="text-muted-foreground">
            Brak powiązanego kontaktu CRM. Skontaktuj się z klubem w celu aktualizacji danych.
          </p>
        )}
      </CardContent>
    </Card>
  );
}
