import { redirect } from "next/navigation";

import { SponsorPortalView } from "@/features/sponsors/components/sponsor-portal-view";
import {
  getDashboardContext,
  getSponsorPortalData,
  requireSponsorPortalAccess,
} from "@/lib/auth/session";

export default async function SponsorPortalPage() {
  const { access } = await getDashboardContext();
  requireSponsorPortalAccess(access);

  const data = await getSponsorPortalData(access.clubId);
  if (!data) redirect("/dashboard");

  return <SponsorPortalView data={data} />;
}
