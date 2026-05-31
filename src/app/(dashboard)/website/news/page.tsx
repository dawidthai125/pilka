import { canPublishWebsiteNews } from "@/config/permissions";
import { WebsiteNewsPanel } from "@/features/website/components/website-cms-panels";
import { getDashboardContext, getWebsiteNewsForCms, requireWebsiteCmsAccess } from "@/lib/auth/session";

export default async function WebsiteNewsPage() {
  const { access } = await getDashboardContext();
  requireWebsiteCmsAccess(access);
  const news = await getWebsiteNewsForCms(access.clubId);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Aktualności</h1>
      <WebsiteNewsPanel news={news} canPublish={canPublishWebsiteNews(access.roles)} />
    </div>
  );
}
