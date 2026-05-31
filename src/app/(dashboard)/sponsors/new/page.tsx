import { SponsorForm } from "@/features/sponsors/components/sponsor-form";
import { canManageSponsors } from "@/config/permissions";
import { getDashboardContext, requireSponsorReadAccess } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export default async function NewSponsorPage() {
  const { access } = await getDashboardContext();
  requireSponsorReadAccess(access);
  if (!canManageSponsors(access.roles)) redirect("/sponsors");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold">Nowy sponsor</h1>
        <p className="text-sm text-muted-foreground">Dodaj firmę do CRM sponsorów.</p>
      </div>
      <SponsorForm />
    </div>
  );
}
