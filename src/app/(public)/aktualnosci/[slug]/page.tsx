import type { Metadata } from "next";
import { notFound } from "next/navigation";

import { buildPublicPageMetadata } from "@/lib/website/seo";
import { WEBSITE_NEWS_CATEGORY_LABELS } from "@/lib/website/constants";
import { getPublicClubId, getPublicNewsBySlug } from "@/lib/website/public-data";

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
    <article className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
      <p className="text-sm font-medium text-[var(--club-primary)]">{WEBSITE_NEWS_CATEGORY_LABELS[article.category]}</p>
      <h1 className="mt-2 text-3xl font-bold">{article.title}</h1>
      <p className="mt-3 text-sm text-muted-foreground">
        {article.authorName ? `${article.authorName} · ` : ""}
        {article.publishedAt?.slice(0, 10)}
        {article.aiGenerated ? " · Szkic AI (zatwierdzony)" : ""}
      </p>
      <div className="prose prose-neutral mt-8 max-w-none whitespace-pre-wrap leading-relaxed">{article.content}</div>
    </article>
  );
}
