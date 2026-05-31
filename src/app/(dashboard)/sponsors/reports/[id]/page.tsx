import { notFound, redirect } from "next/navigation";

import { SponsorReportView } from "@/features/sponsors/components/sponsor-report-view";
import { canManageSponsors, canAccessSponsorPortal, canReadSponsors } from "@/config/permissions";
import {
  getDashboardContext,
  getSponsorForCurrentUser,
  getSponsorReport,
  requireSponsorPortalAccess,
  requireSponsorReadAccess,
} from "@/lib/auth/session";

export default async function SponsorReportPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { access } = await getDashboardContext();

  const isStaff = canReadSponsors(access.roles);
  const isSponsor = canAccessSponsorPortal(access.roles);

  if (isStaff) {
    requireSponsorReadAccess(access);
  } else if (isSponsor) {
    requireSponsorPortalAccess(access);
  } else {
    redirect("/dashboard");
  }

  const result = await getSponsorReport(id, access.clubId);
  if (!result) notFound();

  if (isSponsor && !isStaff) {
    const ownSponsor = await getSponsorForCurrentUser(access.clubId);
    if (!ownSponsor || ownSponsor.id !== result.report.sponsorId) notFound();
    if (result.report.status !== "published") notFound();
  }

  return (
    <SponsorReportView
      report={result.report}
      sponsorName={result.sponsorName}
      canManage={canManageSponsors(access.roles)}
    />
  );
}
