import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { PublicPageShell } from "@/features/website/components/public-page-shell";
import { buildPublicPageMetadata } from "@/lib/website/seo";
import { CLUB_DISPLAY_CLASS, WEBSITE_NEWS_CATEGORY_LABELS } from "@/lib/website/constants";
import { getPublicClubId, getPublicNewsBySlug } from "@/lib/website/public-data";
import { cn } from "@/lib/utils";

type Props = { params: Promise<{ slug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const clubId = await getPublicClubId();
  const article = await getPublicNewsBySlug(slug, clubId);
  if (!article) return buildPublicPageMetadata("Aktualność", `/aktualnosci/${slug}`);
  return buildPublicPageMetadata(
    article.seoTitle ?? article.title,
    `/aktualnosci/${slug}`,
    article.seoDescription ?? article.excerpt ?? undefined,
  );
}

export default async function NewsDetailPage({ params }: Props) {
  const { slug } = await params;
  const clubId = await getPublicClubId();
  const article = await getPublicNewsBySlug(slug, clubId);
  if (!article) notFound();

  return (
    <PublicPageShell
      eyebrow="Aktualności"
      title={article.title}
      breadcrumbs={[{ label: "Aktualności", href: "/aktualnosci" }]}
    >
      <article className="rounded-2xl border border-white/10 bg-black/25 p-6 backdrop-blur-sm sm:p-8">
        <p className="text-sm font-medium text-[var(--club-secondary)]">{WEBSITE_NEWS_CATEGORY_LABELS[article.category]}</p>
        <p className="mt-3 text-sm text-white/55">
          {article.authorName ? `${article.authorName} · ` : ""}
          {article.publishedAt?.slice(0, 10)}
          {article.aiGenerated ? " · Szkic AI (zatwierdzony)" : ""}
        </p>
        <div
          className={cn(
            CLUB_DISPLAY_CLASS,
            "prose prose-invert mt-8 max-w-none whitespace-pre-wrap leading-relaxed text-white/85 prose-headings:text-white prose-a:text-[var(--club-secondary)]",
          )}
        >
          {article.content}
        </div>
      </article>
    </PublicPageShell>
  );
}
