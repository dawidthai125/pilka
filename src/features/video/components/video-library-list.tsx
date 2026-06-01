import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import { formatFileSize } from "@/lib/video/uploads";
import {
  VIDEO_CATEGORY_LABELS,
  VIDEO_JOB_STATUS_LABELS,
  type Video,
} from "@/types/video";

export function VideoLibraryList({ videos }: { videos: Video[] }) {
  if (videos.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-8 text-center text-sm text-muted-foreground">
        Brak nagrań w tej kategorii.
      </p>
    );
  }

  return (
    <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
      {videos.map((video) => (
        <Link
          key={video.id}
          href={`/video/${video.id}`}
          className="rounded-xl border bg-card p-4 shadow-sm transition hover:border-primary/40"
        >
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{VIDEO_CATEGORY_LABELS[video.category]}</Badge>
            <Badge
              variant={
                video.jobStatus === "ready"
                  ? "default"
                  : video.jobStatus === "error"
                    ? "destructive"
                    : "outline"
              }
            >
              {VIDEO_JOB_STATUS_LABELS[video.jobStatus]}
            </Badge>
          </div>
          <h3 className="font-semibold leading-snug">{video.title}</h3>
          {video.description ? (
            <p className="mt-1 line-clamp-2 text-sm text-muted-foreground">{video.description}</p>
          ) : null}
          <div className="mt-3 flex flex-wrap gap-3 text-xs text-muted-foreground">
            <span>{formatFileSize(video.fileSizeBytes)}</span>
            <span>{video.viewCount} wyświetleń</span>
          </div>
        </Link>
      ))}
    </div>
  );
}
