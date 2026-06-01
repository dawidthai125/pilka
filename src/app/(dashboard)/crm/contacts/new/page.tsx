import { CrmContactForm } from "@/features/crm/components/crm-contact-form";
import { getDashboardContext, requireCrmManageAccess } from "@/lib/auth/session";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";

export default async function CrmContactNewPage() {
  const { access } = await getDashboardContext();
  requireCrmManageAccess(access);

  return (
    <Card>
      <CardHeader>
        <CardTitle>Nowy kontakt CRM</CardTitle>
      </CardHeader>
      <CardContent>
        <CrmContactForm />
      </CardContent>
    </Card>
  );
}
