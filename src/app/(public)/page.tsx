import type { Metadata } from "next";

import {
  PublicAcademySection,
  PublicClubStatsSection,
  PublicGallerySection,
  PublicHeroSection,
  PublicMatchCenterSection,
  PublicNewsSection,
  PublicSponsorsSection,
  PublicTeamsSection,
  loadClubHomepageData,
} from "@/features/website/components/club-site-page";
import { buildPublicPageMetadata } from "@/lib/website/seo";

export async function generateMetadata(): Promise<Metadata> {
  return buildPublicPageMetadata("Strona główna", "/");
}

export default async function ClubHomePage() {
  const { home, news, league, sponsors, teams, clubStats, galleryItems, heroImageUrl, logoUrl } =
    await loadClubHomepageData();
  if (!home) return null;

  return (
    <>
      <PublicHeroSection
        clubName={home.club.publicName}
        logoUrl={logoUrl}
        title={home.settings.heroTitle ?? home.club.publicName}
        subtitle={home.settings.heroSubtitle}
        heroImageUrl={heroImageUrl}
        teams={teams}
        nextMatch={home.nextMatch}
      />

      <PublicMatchCenterSection
        nextMatch={home.nextMatch}
        lastResult={home.lastResult}
        leagueEntries={league.entries}
        ownTeamName={league.ownTeamName}
      />

      <PublicTeamsSection teams={teams} />

      <PublicAcademySection teams={teams} />

      <PublicGallerySection items={galleryItems} />

      <PublicNewsSection news={news} />

      <PublicSponsorsSection sponsors={sponsors} />

      <PublicClubStatsSection stats={clubStats} />
    </>
  );
}
