import Link from "next/link";
import { notFound } from "next/navigation";

import { VideoDetailView } from "@/features/video/components/video-detail-view";
import { canManageVideos, canPublishVideoNews } from "@/config/permissions";
import { getDashboardContext, requireVideoDetailAccess } from "@/lib/auth/session";
import {
  getVideoDetailBundle,
  getVideoSignedUrl,
  incrementVideoView,
} from "@/lib/video/loaders";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function VideoDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { access } = await getDashboardContext();
  await requireVideoDetailAccess(access, id);

  const bundle = await getVideoDetailBundle(access.clubId, id);
  if (!bundle.video) notFound();

  await incrementVideoView(access.clubId, id);
  const signedUrl = await getVideoSignedUrl(access.clubId, id, bundle.video.storagePath);

  return (
    <div className="space-y-4">
      <Link href="/video/library" className={cn(buttonVariants({ variant: "outline", size: "sm" }))}>
        ← Biblioteka
      </Link>
      <VideoDetailView
        video={bundle.video}
        signedUrl={signedUrl}
        reports={bundle.reports}
        events={bundle.events}
        notes={bundle.notes}
        clips={bundle.clips}
        drafts={bundle.drafts}
        canManage={canManageVideos(access.roles)}
        canPublishNews={canPublishVideoNews(access.roles)}
      />
    </div>
  );
}
