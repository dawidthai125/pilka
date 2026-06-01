import { notFound } from "next/navigation";

import { InjuryDetailPanel } from "@/features/injuries/components/injury-detail-panel";
import { canManageInjuryStaff } from "@/config/permissions";
import { getDashboardContext, requireInjuryReadAccess } from "@/lib/auth/session";
import { getPlayerInjuryDetail } from "@/lib/injuries/loaders";

export default async function InjuryDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { access } = await getDashboardContext();
  requireInjuryReadAccess(access);
  const { id } = await params;

  const detail = await getPlayerInjuryDetail(access.clubId, id);
  if (!detail.injury) notFound();

  return (
    <InjuryDetailPanel
      injury={detail.injury}
      rehabilitation={detail.rehabilitation}
      returnToPlay={detail.returnToPlay}
      canManage={canManageInjuryStaff(access.roles)}
    />
  );
}
