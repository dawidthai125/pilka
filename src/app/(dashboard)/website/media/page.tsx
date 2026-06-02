import { WebsiteMediaPanel } from "@/features/website/components/website-media-panel";
import { canManageWebsite } from "@/config/permissions";
import {
  getCoachTeamIds,
  getDashboardContext,
  getWebsiteMediaForCms,
  requireWebsiteMediaAccess,
} from "@/lib/auth/session";

export default async function WebsiteMediaPage() {
  const { access } = await getDashboardContext();
  requireWebsiteMediaAccess(access);

  const [media, coachTeamIds] = await Promise.all([
    getWebsiteMediaForCms(access.clubId),
    getCoachTeamIds(access.clubId),
  ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Media strony publicznej</h1>
        <p className="text-sm text-muted-foreground">
          Hero, drużyny, akademia, galeria i aktualności — demo lub własne zdjęcia per klub.
        </p>
      </div>
      <WebsiteMediaPanel
        media={media}
        coachTeamIds={coachTeamIds}
        isFullAdmin={canManageWebsite(access.roles)}
      />
    </div>
  );
}
