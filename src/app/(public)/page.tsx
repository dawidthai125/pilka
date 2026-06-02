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
import { PublicMobileSignupBar } from "@/features/website/components/public-mobile-signup-bar";
import { buildClubCommunityLine, buildClubLocalityLine } from "@/lib/website/locality";
import { buildPublicPageMetadata } from "@/lib/website/seo";

export async function generateMetadata(): Promise<Metadata> {
  return buildPublicPageMetadata("Strona główna", "/");
}

export default async function ClubHomePage() {
  const { home, news, league, sponsors, teams, clubStats, galleryItems, heroImages, academyImages, logoUrl } =
    await loadClubHomepageData();
  if (!home) return null;

  const localityLine = buildClubLocalityLine({
    contactAddress: home.settings.contactAddress,
    competitionLevel: home.club.competitionLevel,
    voivodeship: home.club.voivodeship,
  });

  const communityLine = buildClubCommunityLine({
    playersCount: clubStats?.playersCount,
    teamsCount: clubStats?.teamsCount,
  });

  const academyPreviewUrl =
    academyImages.find((item) => item.slotKey === "kids")?.url ?? academyImages[0]?.url ?? null;

  const matchImageUrl = heroImages.find((item) => item.slotKey === "match")?.url ?? galleryItems[0]?.url ?? null;

  return (
    <>
      <PublicHeroSection
        clubName={home.club.publicName}
        logoUrl={logoUrl}
        title={home.settings.heroTitle ?? home.club.publicName}
        subtitle={home.settings.heroSubtitle}
        heroImages={heroImages}
        localityLine={localityLine}
        communityLine={communityLine}
        contactPhone={home.settings.contactPhone}
        academyPreviewUrl={academyPreviewUrl}
      />

      <PublicMatchCenterSection
        nextMatch={home.nextMatch}
        lastResult={home.lastResult}
        leagueEntries={league.entries}
        ownTeamName={league.ownTeamName}
        localityLine={localityLine}
        matchImageUrl={matchImageUrl}
      />

      <PublicAcademySection
        teams={teams}
        academyImages={academyImages}
        contactPhone={home.settings.contactPhone}
        contactAddress={home.settings.contactAddress}
        clubName={home.club.publicName}
      />

      <PublicTeamsSection teams={teams} />

      <PublicGallerySection items={galleryItems} />

      <PublicNewsSection news={news} />

      <PublicSponsorsSection sponsors={sponsors} />

      <PublicMobileSignupBar phone={home.settings.contactPhone} />
    </>
  );
}
