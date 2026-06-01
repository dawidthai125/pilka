import { CrmPipelineBoard } from "@/features/crm/components/crm-pipeline-board";
import { getCrmPipeline } from "@/lib/crm/loaders";
import { getDashboardContext, requireCrmReadAccess } from "@/lib/auth/session";

export default async function CrmPipelinePage() {
  const { access } = await getDashboardContext();
  requireCrmReadAccess(access);
  const columns = await getCrmPipeline(access.clubId);
  return <CrmPipelineBoard columns={columns} />;
}
