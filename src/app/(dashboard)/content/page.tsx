import Link from "next/link";

import { ContentDashboardStats } from "@/features/content/components/content-dashboard-stats";
import { ContentPostList } from "@/features/content/components/content-post-list";
import { canCreateContent, canManageContent } from "@/config/permissions";
import { getDashboardContext, requireContentReadAccess } from "@/lib/auth/session";
import { getContentDashboardStats, getContentPosts } from "@/lib/content/loaders";
import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export default async function ContentHubPage() {
  const { access } = await getDashboardContext();
  requireContentReadAccess(access);

  const [stats, posts] = await Promise.all([
    getContentDashboardStats(access.clubId),
    getContentPosts(access.clubId),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight">Content Hub</h1>
          <p className="text-sm text-muted-foreground">
            Centralny system publikacji — strona, social, sponsorzy, komunikaty.
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <Link href="/content/calendar" className={cn(buttonVariants({ variant: "outline" }))}>
            Kalendarz
          </Link>
          <Link href="/content/channels" className={cn(buttonVariants({ variant: "outline" }))}>
            Kolejka
          </Link>
          {canCreateContent(access.roles) ? (
            <Link href="/content/ai" className={cn(buttonVariants())}>
              Generator AI
            </Link>
          ) : null}
        </div>
      </div>

      <ContentDashboardStats stats={stats} />

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="space-y-3 lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="text-lg font-semibold">Ostatnie materiały</h2>
            <Link href="/content/posts" className="text-sm text-primary underline-offset-4 hover:underline">
              Wszystkie
            </Link>
          </div>
          <ContentPostList posts={posts.slice(0, 8)} />
        </div>
        <div className="space-y-3">
          <h2 className="text-lg font-semibold">Szybkie linki</h2>
          <ul className="space-y-2 text-sm">
            <li>
              <Link href="/content/media" className="text-primary underline-offset-4 hover:underline">
                Biblioteka mediów
              </Link>
            </li>
            <li>
              <Link href="/content/posts" className="text-primary underline-offset-4 hover:underline">
                Wszystkie materiały
              </Link>
            </li>
            {canManageContent(access.roles) ? (
              <li>
                <Link href="/website/news" className="text-primary underline-offset-4 hover:underline">
                  CMS strony (ETAP 9)
                </Link>
              </li>
            ) : null}
          </ul>
        </div>
      </div>
    </div>
  );
}
