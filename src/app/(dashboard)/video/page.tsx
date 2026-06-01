import Link from "next/link";

import { VideoDashboardStats, VideoTopViewedList } from "@/features/video/components/video-dashboard-stats";
import { VideoLibraryList } from "@/features/video/components/video-library-list";
import { canManageVideos } from "@/config/permissions";
import { getDashboardContext, requireVideoReadAccess } from "@/lib/auth/session";
import { getVideoDashboardStats, getVideos } from "@/lib/video/loaders";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function VideoCenterPage() {
  const { access } = await getDashboardContext();
  requireVideoReadAccess(access);

  const [stats, recentVideos] = await Promise.all([
    getVideoDashboardStats(access.clubId),
    getVideos(access.clubId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Video Center</h1>
          <p className="text-sm text-muted-foreground">
            AI Video Analysis — nagrania, raporty sportowe i materiały dla sztabu.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/video/library" className={cn(buttonVariants({ variant: "outline" }))}>
            Biblioteka
          </Link>
          {canManageVideos(access.roles) ? (
            <Link href="/video/upload" className={cn(buttonVariants())}>
              Upload wideo
            </Link>
          ) : null}
        </div>
      </div>

      <VideoDashboardStats stats={stats} />

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Ostatnie nagrania</h2>
          <VideoLibraryList videos={recentVideos.slice(0, 6)} />
        </div>
        <VideoTopViewedList items={stats.topViewed} />
      </div>
    </div>
  );
}
