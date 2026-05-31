import { WebsiteSocialPanel } from "@/features/website/components/website-cms-panels";
import { getDashboardContext, getWebsiteSocialIntegrationsForCms, requireWebsiteManageAccess } from "@/lib/auth/session";

export default async function WebsiteSocialPage() {
  const { access } = await getDashboardContext();
  requireWebsiteManageAccess(access);
  const integrations = await getWebsiteSocialIntegrationsForCms(access.clubId);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Social media</h1>
      <p className="text-sm text-muted-foreground">Architektura pod Facebook, Instagram, TikTok i YouTube — automatyczna synchronizacja w kolejnych etapach.</p>
      <WebsiteSocialPanel integrations={integrations} />
    </div>
  );
}
