import type { Metadata } from "next";

import { PublicLandingHome } from "@/features/website/components/public-landing-home";
import { PublicAcademySection } from "@/features/website/components/club-home-sections";
import { loadHydratedPublicHomePage } from "@/lib/website/home-bundle";
import { buildPublicPageMetadata } from "@/lib/website/seo";

type Props = { params: Promise<{ clubSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { clubSlug } = await params;
  return buildPublicPageMetadata("Strona główna", clubSlug, "/");
}

export default async function ClubHomePage({ params }: Props) {
  const { clubSlug } = await params;
  const home = await loadHydratedPublicHomePage(clubSlug);
  if (!home) return null;

  return (
    <>
      <PublicLandingHome
        clubSlug={clubSlug}
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
        clubSlug={clubSlug}
        teams={home.teams}
        academyImages={home.academyImages}
        contactPhone={home.contactPhone}
        contactAddress={home.contactAddress}
        clubName={home.clubName}
      />
    </>
  );
}
