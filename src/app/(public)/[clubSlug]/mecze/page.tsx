import type { Metadata } from "next";

import { PublicDarkMatchesContent } from "@/features/website/components/public-dark-subpage-content";
import { PublicPageShell } from "@/features/website/components/public-page-shell";
import { buildPublicPageMetadata } from "@/lib/website/seo";
import { getPublicClubId, getPublicMatches } from "@/lib/website/public-data";

type Props = { params: Promise<{ clubSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { clubSlug } = await params;
  return buildPublicPageMetadata("Mecze", clubSlug, "/mecze");
}

export default async function MatchesPublicPage({ params }: Props) {
  const { clubSlug } = await params;
  const clubId = await getPublicClubId(clubSlug);
  const [upcoming, results] = await Promise.all([
    getPublicMatches(clubId, "upcoming", 20),
    getPublicMatches(clubId, "results", 20),
  ]);

  return (
    <PublicPageShell clubSlug={clubSlug} eyebrow="Dla kibica" title="Mecze" subtitle="Terminarz i wyniki — dane z modułu meczowego klubu.">
      <PublicDarkMatchesContent upcoming={upcoming} results={results} />
    </PublicPageShell>
  );
}
