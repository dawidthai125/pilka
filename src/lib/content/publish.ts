import { randomUUID } from "node:crypto";
import { revalidatePath } from "next/cache";

import { slugifyNewsTitle } from "@/lib/website/mappers";
import { createClient } from "@/lib/supabase/server";
import type { ContentPost } from "@/types/content";

function websiteCategoryForPost(post: ContentPost): "matches" | "club" | "sponsors" | "other" {
  if (post.contentType === "match_report" || post.contentType === "match_preview") return "matches";
  if (post.contentType === "sponsor_post") return "sponsors";
  if (post.contentType === "club_announcement") return "club";
  return "other";
}

export async function publishContentToWebsite(
  clubId: string,
  userId: string,
  post: ContentPost,
): Promise<{ websiteNewsId: string | null; error?: string }> {
  if (!["approved", "pending_approval"].includes(post.status)) {
    return { websiteNewsId: null, error: "Materiał nie może zostać opublikowany na stronie w tym statusie." };
  }

  if (!post.bodyWebsite) {
    return { websiteNewsId: null, error: "Brak treści na stronę klubową." };
  }

  const supabase = await createClient();
  const slug = post.slug ?? slugifyNewsTitle(post.title);
  const newsId = post.websiteNewsId ?? randomUUID();

  const { error } = await supabase.from("website_news").upsert({
    id: newsId,
    club_id: clubId,
    slug,
    title: post.title,
    excerpt: post.summary,
    content: post.bodyWebsite,
    category: websiteCategoryForPost(post),
    status: "published",
    author_id: userId,
    published_at: new Date().toISOString(),
    ai_generated: post.aiGenerated,
  });

  if (error) return { websiteNewsId: null, error: error.message };

  await supabase
    .from("content_posts")
    .update({ website_news_id: newsId })
    .eq("id", post.id)
    .eq("club_id", clubId);

  revalidatePath("/aktualnosci");
  revalidatePath("/");
  revalidatePath("/kibic");
  revalidatePath("/website/news");

  return { websiteNewsId: newsId };
}

export function revalidateContentPaths() {
  revalidatePath("/content");
  revalidatePath("/content/posts");
  revalidatePath("/content/calendar");
  revalidatePath("/content/channels");
  revalidatePath("/content/media");
}
