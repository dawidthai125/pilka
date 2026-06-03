import type { Metadata } from "next";

import { PublicLandingHome } from "@/features/website/components/public-landing-home";
import { PublicAcademySection } from "@/features/website/components/club-home-sections";
import { loadHydratedPublicHomePage } from "@/lib/website/home-bundle";
import { buildPublicPageMetadata } from "@/lib/website/seo";

export async function generateMetadata(): Promise<Metadata> {
  return buildPublicPageMetadata("Strona główna", "/");
}

export default async function ClubHomePage() {
  const home = await loadHydratedPublicHomePage();
  if (!home) return null;

  return (
    <>
      <PublicLandingHome
        clubName={home.clubName}
        officialName={home.officialName}
        heroTitle={home.heroTitle}
        heroSubtitle={home.heroSubtitle}
        coverImageUrl={home.coverImageUrl}
        news={home.news}
        nextMatch={home.nextMatch}
        recentResults={home.recentResults}
        league={home.league}
        teamStats={home.teamStats}
        players={home.players}
        topScorers={home.topScorers}
      />
      <PublicAcademySection
        teams={home.teams}
        academyImages={home.academyImages}
        contactPhone={home.contactPhone}
        contactAddress={home.contactAddress}
        clubName={home.clubName}
      />
    </>
  );
}
