import type { Metadata } from "next";

import { PublicDarkNewsList } from "@/features/website/components/public-dark-subpage-content";
import { PublicPageShell } from "@/features/website/components/public-page-shell";
import { buildPublicPageMetadata } from "@/lib/website/seo";
import { getPublicClubId, getPublicNews } from "@/lib/website/public-data";

export async function generateMetadata(): Promise<Metadata> {
  return buildPublicPageMetadata("Aktualności", "/aktualnosci");
}

export default async function NewsListPage() {
  const clubId = await getPublicClubId();
  const news = await getPublicNews(clubId, { limit: 50 });

  return (
    <PublicPageShell title="Aktualności" subtitle="Posty z boiska i życia klubu — jak na Facebooku.">
      <PublicDarkNewsList news={news} />
    </PublicPageShell>
  );
}
