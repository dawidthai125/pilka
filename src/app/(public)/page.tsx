import type { Metadata } from "next";

import {
  PublicAcademySection,
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
  const { home, news, league, sponsors, teams, clubStats, galleryItems, heroImages, academyImages, logoUrl } =
    await loadClubHomepageData();
  if (!home) return null;

  return (
    <>
      <PublicHeroSection
        clubName={home.club.publicName}
        logoUrl={logoUrl}
        title={home.settings.heroTitle ?? home.club.publicName}
        subtitle={home.settings.heroSubtitle}
        heroImages={heroImages}
        clubStats={clubStats}
        competitionLevel={home.club.competitionLevel}
      />

      <PublicMatchCenterSection
        nextMatch={home.nextMatch}
        lastResult={home.lastResult}
        leagueEntries={league.entries}
        ownTeamName={league.ownTeamName}
      />

      <PublicTeamsSection teams={teams} />

      <PublicAcademySection
        teams={teams}
        academyImages={academyImages}
        contactPhone={home.settings.contactPhone}
        contactAddress={home.settings.contactAddress}
        clubName={home.club.publicName}
      />

      <PublicGallerySection items={galleryItems} />

      <PublicNewsSection news={news} />

      <PublicSponsorsSection sponsors={sponsors} />
    </>
  );
}
