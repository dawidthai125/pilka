import { ContentMediaLibrary } from "@/features/content/components/content-media-library";
import { getDashboardContext, requireContentReadAccess } from "@/lib/auth/session";
import { getContentAssets } from "@/lib/content/loaders";

export default async function ContentMediaPage() {
  const { access } = await getDashboardContext();
  requireContentReadAccess(access);
  const assets = await getContentAssets(access.clubId);

  return (
    <div className="space-y-4">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Biblioteka mediów</h1>
        <p className="text-sm text-muted-foreground">Zdjęcia, grafiki i klipy powiązane z Video Center.</p>
      </div>
      <ContentMediaLibrary assets={assets} />
    </div>
  );
}
