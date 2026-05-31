import Link from "next/link";

import { SponsorsDashboardStats } from "@/features/sponsors/components/sponsors-dashboard-stats";
import { SponsorsList } from "@/features/sponsors/components/sponsors-list";
import { canManageSponsors } from "@/config/permissions";
import {
  getDashboardContext,
  getSponsorDashboardStats,
  getSponsors,
  requireSponsorReadAccess,
} from "@/lib/auth/session";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function SponsorsPage() {
  const { access } = await getDashboardContext();
  requireSponsorReadAccess(access);

  const [sponsors, stats] = await Promise.all([
    getSponsors(access.clubId),
    getSponsorDashboardStats(access.clubId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Sponsorzy i partnerzy</h1>
          <p className="text-sm text-muted-foreground">
            CRM sponsorów klubu — {sponsors.length} rekordów.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/sponsors/leads" className={cn(buttonVariants({ variant: "outline" }))}>
            Leady
          </Link>
          <Link href="/sponsors/publications" className={cn(buttonVariants({ variant: "outline" }))}>
            Publikacje
          </Link>
          {canManageSponsors(access.roles) ? (
            <Link href="/sponsors/new" className={cn(buttonVariants())}>
              Dodaj sponsora
            </Link>
          ) : null}
        </div>
      </div>

      <SponsorsDashboardStats stats={stats} />
      <SponsorsList sponsors={sponsors} />
    </div>
  );
}
