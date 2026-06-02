import type { Metadata } from "next";
import Link from "next/link";

import { PublicPageShell } from "@/features/website/components/public-page-shell";
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
    <PublicPageShell title="Aktualności" subtitle="Posty z boiska i życia klubu — jak na Facebooku.">
      <div className="space-y-4">
        {news.map((item) => (
          <Link
            key={item.id}
            href={`/aktualnosci/${item.slug}`}
            className="block overflow-hidden rounded-xl border border-black/5 bg-white p-5 shadow-sm transition hover:shadow-md"
          >
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
    </PublicPageShell>
  );
}
