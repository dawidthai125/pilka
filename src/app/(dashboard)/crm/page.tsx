import { CrmDashboardPanel } from "@/features/crm/components/crm-dashboard-panel";
import { getCrmDashboardStats, getCrmTasks } from "@/lib/crm/loaders";
import { getDashboardContext, requireCrmReadAccess } from "@/lib/auth/session";
import { CrmTasksPanel } from "@/features/crm/components/crm-tasks-panel";
import { canManageCrm } from "@/config/permissions";

export default async function CrmPage() {
  const { access } = await getDashboardContext();
  requireCrmReadAccess(access);

  const [stats, tasks] = await Promise.all([
    getCrmDashboardStats(access.clubId),
    getCrmTasks(access.clubId),
  ]);

  return (
    <div className="space-y-8">
      <CrmDashboardPanel stats={stats} />
      <div>
        <h2 className="mb-3 text-lg font-semibold">Otwarte zadania</h2>
        <CrmTasksPanel tasks={tasks.slice(0, 5)} canManage={canManageCrm(access.roles)} />
      </div>
    </div>
  );
}
