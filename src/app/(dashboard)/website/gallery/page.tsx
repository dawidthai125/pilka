import { WebsiteGalleryPanel } from "@/features/website/components/website-cms-panels";
import { getDashboardContext, getWebsiteGalleryAlbumsForCms, requireWebsiteManageAccess } from "@/lib/auth/session";

export default async function WebsiteGalleryPage() {
  const { access } = await getDashboardContext();
  requireWebsiteManageAccess(access);
  const albums = await getWebsiteGalleryAlbumsForCms(access.clubId);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-semibold">Galeria</h1>
      <WebsiteGalleryPanel albums={albums} />
    </div>
  );
}
