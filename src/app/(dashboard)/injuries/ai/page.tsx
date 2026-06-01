import { InjuryAiPanel } from "@/features/injuries/components/injury-ai-panel";
import { getDashboardContext, requireInjuryStaffAccess } from "@/lib/auth/session";
import { generateInjuryInsights } from "@/lib/injuries/insights";
import {
  getInjuryDashboardStats,
  getInjuryHistorySummaries,
  getPlayerInjuries,
} from "@/lib/injuries/loaders";

export default async function InjuryAiPage() {
  const { access } = await getDashboardContext();
  requireInjuryStaffAccess(access);

  const [stats, injuries, history] = await Promise.all([
    getInjuryDashboardStats(access.clubId),
    getPlayerInjuries(access.clubId),
    getInjuryHistorySummaries(access.clubId),
  ]);

  const insights = generateInjuryInsights(stats, injuries, history);

  return (
    <div className="space-y-4">
      <h2 className="text-lg font-semibold">AI Medical Insights</h2>
      <InjuryAiPanel insights={insights} />
    </div>
  );
}
