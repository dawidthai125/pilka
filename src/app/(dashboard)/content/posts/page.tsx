import { ContentPostList } from "@/features/content/components/content-post-list";
import { getDashboardContext, requireContentReadAccess } from "@/lib/auth/session";
import { getContentPosts } from "@/lib/content/loaders";

export default async function ContentPostsPage() {
  const { access } = await getDashboardContext();
  requireContentReadAccess(access);
  const posts = await getContentPosts(access.clubId);

  return (
    <div className="space-y-4">
      <h1 className="text-2xl font-semibold tracking-tight">Materiały</h1>
      <ContentPostList posts={posts} />
    </div>
  );
}
