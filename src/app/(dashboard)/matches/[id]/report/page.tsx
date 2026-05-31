import { notFound } from "next/navigation";

import { MatchReportView } from "@/features/matches/components/match-report-view";
import { getDashboardContext, getMatchDetail, requireMatchReadAccess } from "@/lib/auth/session";

export default async function MatchReportPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { access } = await getDashboardContext();
  requireMatchReadAccess(access);

  const data = await getMatchDetail(id);
  if (!data || data.match.status !== "completed") notFound();

  return (
    <div className="space-y-4">
      <MatchReportView data={data} />
    </div>
  );
}
