import type { Metadata } from "next";

import { loadClubHomepageData } from "@/features/website/components/club-site-page";
import { PublicLandingHome } from "@/features/website/components/public-landing-home";
import { PublicAcademySection } from "@/features/website/components/club-home-sections";
import { resolvePublicCoverImageUrl } from "@/lib/website/cover-image";
import { buildPublicPageMetadata } from "@/lib/website/seo";

export async function generateMetadata(): Promise<Metadata> {
  return buildPublicPageMetadata("Strona główna", "/");
}

export default async function ClubHomePage() {
  const { home, news, teams, academyImages } = await loadClubHomepageData();
  if (!home) return null;

  const coverImageUrl = await resolvePublicCoverImageUrl(home.settings);

  return (
    <>
      <PublicLandingHome
        clubName={home.club.publicName}
        heroTitle={home.settings.heroTitle ?? home.club.publicName}
        heroSubtitle={home.settings.heroSubtitle ?? "Razem tworzymy historię ⚡"}
        coverImageUrl={coverImageUrl}
        news={news}
        teams={teams}
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
