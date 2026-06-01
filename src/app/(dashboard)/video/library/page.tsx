import Link from "next/link";
import { notFound } from "next/navigation";

import { VideoLibraryList } from "@/features/video/components/video-library-list";
import { canManageVideos } from "@/config/permissions";
import { getDashboardContext, requireVideoReadAccess } from "@/lib/auth/session";
import { getVideos } from "@/lib/video/loaders";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { VIDEO_CATEGORIES, VIDEO_CATEGORY_LABELS } from "@/types/video";

export default async function VideoLibraryPage({
  searchParams,
}: {
  searchParams: Promise<{ category?: string }>;
}) {
  const { access } = await getDashboardContext();
  requireVideoReadAccess(access);
  const params = await searchParams;
  const category = params.category;
  const videos = await getVideos(access.clubId, category);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Biblioteka nagrań</h1>
          <p className="text-sm text-muted-foreground">Mecze, treningi, analizy i materiały szkoleniowe.</p>
        </div>
        {canManageVideos(access.roles) ? (
          <Link href="/video/upload" className={cn(buttonVariants())}>
            Upload wideo
          </Link>
        ) : null}
      </div>

      <div className="flex flex-wrap gap-2">
        <Link
          href="/video/library"
          className={cn(buttonVariants({ variant: !category ? "default" : "outline", size: "sm" }))}
        >
          Wszystkie
        </Link>
        {VIDEO_CATEGORIES.map((cat) => (
          <Link
            key={cat}
            href={`/video/library?category=${cat}`}
            className={cn(buttonVariants({ variant: category === cat ? "default" : "outline", size: "sm" }))}
          >
            {VIDEO_CATEGORY_LABELS[cat]}
          </Link>
        ))}
      </div>

      <VideoLibraryList videos={videos} />
    </div>
  );
}
