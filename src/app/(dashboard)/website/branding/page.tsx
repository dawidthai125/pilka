import { WebsiteBrandingPanel } from "@/features/website/components/website-cms-panels";
import { getDashboardContext, getWebsiteSettingsForCms, requireWebsiteManageAccess } from "@/lib/auth/session";

export default async function WebsiteBrandingPage() {
  const { access } = await getDashboardContext();
  requireWebsiteManageAccess(access);
  const settings = await getWebsiteSettingsForCms(access.clubId);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Branding i kolory klubu</h1>
      <p className="text-sm text-muted-foreground">Piorun Wawrzeńczyce · GLKS Mietków — identyfikacja wizualna strony.</p>
      <WebsiteBrandingPanel settings={settings} />
    </div>
  );
}
