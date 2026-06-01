import Link from "next/link";

import { Badge } from "@/components/ui/badge";
import {
  CONTENT_STATUS_LABELS,
  CONTENT_TYPE_LABELS,
  type ContentPost,
} from "@/types/content";

export function ContentPostList({ posts }: { posts: ContentPost[] }) {
  if (posts.length === 0) {
    return (
      <p className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
        Brak materiałów. Utwórz szkic lub wygeneruj treść AI.
      </p>
    );
  }

  return (
    <ul className="divide-y rounded-xl border bg-card">
      {posts.map((post) => (
        <li key={post.id}>
          <Link
            href={`/content/posts/${post.id}`}
            className="flex flex-col gap-2 p-4 transition hover:bg-muted/40 sm:flex-row sm:items-center sm:justify-between"
          >
            <div className="space-y-1">
              <p className="font-medium">{post.title}</p>
              <p className="text-xs text-muted-foreground">
                {CONTENT_TYPE_LABELS[post.contentType]} · {new Date(post.createdAt).toLocaleDateString("pl-PL")}
                {post.aiGenerated ? " · AI" : ""}
              </p>
            </div>
            <Badge variant="outline">{CONTENT_STATUS_LABELS[post.status]}</Badge>
          </Link>
        </li>
      ))}
    </ul>
  );
}
