import type { Metadata } from "next";

import { loadClubHomepageData } from "@/features/website/components/club-site-page";
import { PublicLandingHome } from "@/features/website/components/public-landing-home";
import { PublicAcademySection } from "@/features/website/components/club-home-sections";
import { resolvePublicCoverImageUrl } from "@/lib/website/cover-image";
import { buildPublicPageMetadata } from "@/lib/website/seo";
import { getPublicClubId, getPublicMatches, getPublicPlayers, getPublicTeamStats } from "@/lib/website/public-data";

export async function generateMetadata(): Promise<Metadata> {
  return buildPublicPageMetadata("Strona główna", "/");
}

export default async function ClubHomePage() {
  const clubId = await getPublicClubId();
  const [{ home, news, teams, academyImages, league }, recentResults, teamStats, players] = await Promise.all([
    loadClubHomepageData(),
    getPublicMatches(clubId, "results", 8),
    getPublicTeamStats(),
    getPublicPlayers(),
  ]);
  if (!home) return null;

  const coverImageUrl = await resolvePublicCoverImageUrl(home.settings);
  const nextMatch = home.nextMatch;
  const resultsList = [...recentResults];
  if (home.lastResult && !resultsList.some((m) => m.id === home.lastResult!.id)) {
    resultsList.unshift(home.lastResult);
  }

  const topScorers = [...players]
    .filter((p) => p.goals > 0)
    .sort((a, b) => b.goals - a.goals || b.matchesPlayed - a.matchesPlayed)
    .slice(0, 5);

  return (
    <>
      <PublicLandingHome
        clubName={home.club.publicName}
        officialName={home.club.officialName}
        heroTitle={home.settings.heroTitle ?? home.club.publicName}
        heroSubtitle={home.settings.heroSubtitle ?? "Razem tworzymy historię ⚡"}
        coverImageUrl={coverImageUrl}
        news={news}
        nextMatch={nextMatch}
        recentResults={resultsList}
        league={league}
        teamStats={teamStats}
        players={players}
        topScorers={topScorers}
      />
      <PublicAcademySection
        teams={teams}
        academyImages={academyImages}
        contactPhone={home.settings.contactPhone}
        contactAddress={home.settings.contactAddress}
        clubName={home.club.publicName}
      />
    </>
  );
}
