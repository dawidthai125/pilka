import Link from "next/link";

import { SponsorPublicationsList } from "@/features/sponsors/components/sponsor-publications-list";
import { canManageSponsors } from "@/config/permissions";
import {
  getDashboardContext,
  getSponsorPublications,
  requireSponsorReadAccess,
} from "@/lib/auth/session";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function SponsorPublicationsPage() {
  const { access } = await getDashboardContext();
  requireSponsorReadAccess(access);

  const publications = await getSponsorPublications(access.clubId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Publikacje sponsorskie</h1>
          <p className="text-sm text-muted-foreground">Ekspozycja marki w mediach klubu.</p>
        </div>
        <div className="flex gap-2">
          <Link href="/sponsors" className={cn(buttonVariants({ variant: "outline" }))}>
            ← Sponsorzy
          </Link>
          {canManageSponsors(access.roles) ? (
            <Link href="/sponsors/publications/new" className={cn(buttonVariants())}>
              Nowa publikacja
            </Link>
          ) : null}
        </div>
      </div>
      <SponsorPublicationsList publications={publications} />
    </div>
  );
}
