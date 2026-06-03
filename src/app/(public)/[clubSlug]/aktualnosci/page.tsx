import type { Metadata } from "next";

import { PublicDarkNewsList } from "@/features/website/components/public-dark-subpage-content";
import { PublicPageShell } from "@/features/website/components/public-page-shell";
import { buildPublicPageMetadata } from "@/lib/website/seo";
import { getPublicClubId, getPublicNews } from "@/lib/website/public-data";

type Props = { params: Promise<{ clubSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { clubSlug } = await params;
  return buildPublicPageMetadata("Aktualności", clubSlug, "/aktualnosci");
}

export default async function NewsListPage({ params }: Props) {
  const { clubSlug } = await params;
  const clubId = await getPublicClubId(clubSlug);
  const news = await getPublicNews(clubId, { limit: 50 });

  return (
    <PublicPageShell clubSlug={clubSlug} eyebrow="Klub na żywo" title="Aktualności" subtitle="Posty z boiska i życia klubu — jak na Facebooku.">
      <PublicDarkNewsList clubSlug={clubSlug} news={news} />
    </PublicPageShell>
  );
}
