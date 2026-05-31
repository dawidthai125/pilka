import Link from "next/link";
import { redirect } from "next/navigation";

import { SponsorPublicationForm } from "@/features/sponsors/components/sponsor-publication-form";
import { canManageSponsors } from "@/config/permissions";
import {
  getDashboardContext,
  getSponsors,
  requireSponsorReadAccess,
} from "@/lib/auth/session";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function NewSponsorPublicationPage() {
  const { access } = await getDashboardContext();
  requireSponsorReadAccess(access);
  if (!canManageSponsors(access.roles)) redirect("/sponsors/publications");

  const sponsors = await getSponsors(access.clubId);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl font-semibold">Nowa publikacja</h1>
          <p className="text-sm text-muted-foreground">Dodaj publikację z powiązanymi sponsorami.</p>
        </div>
        <Link href="/sponsors/publications" className={cn(buttonVariants({ variant: "outline" }))}>
          Anuluj
        </Link>
      </div>
      <SponsorPublicationForm sponsors={sponsors} />
    </div>
  );
}
