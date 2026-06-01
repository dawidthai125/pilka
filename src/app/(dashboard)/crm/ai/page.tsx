import { CrmAiPanel } from "@/features/crm/components/crm-ai-panel";
import { generateCrmInsights } from "@/lib/crm/insights";
import { getCrmDashboardStats, getCrmTasks } from "@/lib/crm/loaders";
import { getDashboardContext, requireCrmManageAccess } from "@/lib/auth/session";

export default async function CrmAiPage() {
  const { access } = await getDashboardContext();
  requireCrmManageAccess(access);

  const [stats, tasks] = await Promise.all([
    getCrmDashboardStats(access.clubId),
    getCrmTasks(access.clubId),
  ]);
  const insights = generateCrmInsights(stats, tasks.filter((t) => t.status === "open"));

  return <CrmAiPanel insights={insights} />;
}
