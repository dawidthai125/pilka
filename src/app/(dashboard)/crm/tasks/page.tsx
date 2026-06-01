import { CrmTasksPanel } from "@/features/crm/components/crm-tasks-panel";
import { getCrmTasks } from "@/lib/crm/loaders";
import { getDashboardContext, requireCrmReadAccess } from "@/lib/auth/session";
import { canManageCrm } from "@/config/permissions";

export default async function CrmTasksPage() {
  const { access } = await getDashboardContext();
  requireCrmReadAccess(access);
  const tasks = await getCrmTasks(access.clubId);
  return <CrmTasksPanel tasks={tasks} canManage={canManageCrm(access.roles)} />;
}
