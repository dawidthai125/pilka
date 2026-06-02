import type { Metadata } from "next";

import { PublicDarkMatchesContent } from "@/features/website/components/public-dark-subpage-content";
import { PublicPageShell } from "@/features/website/components/public-page-shell";
import { buildPublicPageMetadata } from "@/lib/website/seo";
import { getPublicClubId, getPublicMatches } from "@/lib/website/public-data";

export async function generateMetadata(): Promise<Metadata> {
  return buildPublicPageMetadata("Mecze", "/mecze");
}

export default async function MatchesPublicPage() {
  const clubId = await getPublicClubId();
  const [upcoming, results] = await Promise.all([
    getPublicMatches(clubId, "upcoming", 20),
    getPublicMatches(clubId, "results", 20),
  ]);

  return (
    <PublicPageShell eyebrow="Dla kibica" title="Mecze" subtitle="Terminarz i wyniki — dane z modułu meczowego klubu.">
      <PublicDarkMatchesContent upcoming={upcoming} results={results} />
    </PublicPageShell>
  );
}
