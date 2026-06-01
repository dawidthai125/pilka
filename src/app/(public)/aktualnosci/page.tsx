import type { Metadata } from "next";
import Link from "next/link";

import { buildPublicPageMetadata } from "@/lib/website/seo";
import { WEBSITE_NEWS_CATEGORY_LABELS } from "@/lib/website/constants";
import { getPublicClubId, getPublicNews } from "@/lib/website/public-data";

export async function generateMetadata(): Promise<Metadata> {
  return buildPublicPageMetadata("Aktualności", "/aktualnosci");
}

export default async function NewsListPage() {
  const clubId = await getPublicClubId();
  const news = await getPublicNews(clubId, { limit: 50 });

  return (
    <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6">
      <h1 className="text-3xl font-bold">Aktualności</h1>
      <p className="mt-2 text-muted-foreground">Wiadomości z życia klubu — mecze, transfery, akademia i więcej.</p>
      <div className="mt-8 grid gap-6 md:grid-cols-2">
        {news.map((item) => (
          <Link key={item.id} href={`/aktualnosci/${item.slug}`} className="rounded-xl border bg-card p-6 transition hover:shadow-md">
            <p className="text-xs font-medium text-[var(--club-primary)]">{WEBSITE_NEWS_CATEGORY_LABELS[item.category]}</p>
            <h2 className="mt-2 text-xl font-semibold">{item.title}</h2>
            {item.excerpt ? <p className="mt-2 text-sm text-muted-foreground">{item.excerpt}</p> : null}
            <p className="mt-4 text-xs text-muted-foreground">
              {item.authorName ? `${item.authorName} · ` : ""}
              {item.publishedAt?.slice(0, 10)}
            </p>
          </Link>
        ))}
      </div>
    </div>
  );
}
