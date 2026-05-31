import Link from "next/link";

import { SponsorLeadsPanel } from "@/features/sponsors/components/sponsor-leads-panel";
import { canManageSponsors } from "@/config/permissions";
import {
  getDashboardContext,
  getSponsorLeads,
  requireSponsorReadAccess,
} from "@/lib/auth/session";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function SponsorLeadsPage() {
  const { access } = await getDashboardContext();
  requireSponsorReadAccess(access);

  const leads = await getSponsorLeads(access.clubId);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold">Leady sponsorskie</h1>
          <p className="text-sm text-muted-foreground">CRM potencjalnych sponsorów.</p>
        </div>
        <Link href="/sponsors" className={cn(buttonVariants({ variant: "outline" }))}>
          ← Sponsorzy
        </Link>
      </div>
      <SponsorLeadsPanel leads={leads} canManage={canManageSponsors(access.roles)} />
    </div>
  );
}
