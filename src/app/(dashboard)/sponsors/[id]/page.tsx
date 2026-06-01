import { notFound } from "next/navigation";

import { SponsorDetailView } from "@/features/sponsors/components/sponsor-detail-view";
import { canManageSponsors } from "@/config/permissions";
import { todayIsoDate } from "@/lib/dates";
import {
  getDashboardContext,
  getSponsorDetail,
  requireSponsorReadAccess,
} from "@/lib/auth/session";

export default async function SponsorDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const { access } = await getDashboardContext();
  requireSponsorReadAccess(access);

  const data = await getSponsorDetail(id, access.clubId, canManageSponsors(access.roles));
  if (!data) notFound();

  return (
    <SponsorDetailView
      data={data}
      canManage={canManageSponsors(access.roles)}
      defaultDate={todayIsoDate()}
    />
  );
}
