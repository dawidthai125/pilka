import { InjuryHistoryPanel } from "@/features/injuries/components/injury-history-panel";
import { getDashboardContext, requireInjuryStaffAccess } from "@/lib/auth/session";
import { getInjuryHistorySummaries } from "@/lib/injuries/loaders";

export default async function InjuryHistoryPage() {
  const { access } = await getDashboardContext();
  requireInjuryStaffAccess(access);

  const summaries = await getInjuryHistorySummaries(access.clubId);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">Historia urazów</h2>
      <InjuryHistoryPanel summaries={summaries} />
    </div>
  );
}
