import type { Metadata } from "next";

import { loadClubHomepageData } from "@/features/website/components/club-site-page";
import {
  PublicFacebookHome,
  resolveFacebookProfileUrl,
} from "@/features/website/components/public-facebook-home";
import { PublicMobileSignupBar } from "@/features/website/components/public-mobile-signup-bar";
import { getPublicSocialIntegrations } from "@/lib/website/public-data";
import { buildPublicPageMetadata } from "@/lib/website/seo";

export async function generateMetadata(): Promise<Metadata> {
  return buildPublicPageMetadata("Strona główna", "/");
}

export default async function ClubHomePage() {
  const { home, news, league, heroImages, academyImages, galleryItems, logoUrl } = await loadClubHomepageData();
  if (!home) return null;

  const socialLinks = await getPublicSocialIntegrations(home.club.id);
  const facebookUrl = resolveFacebookProfileUrl(socialLinks);

  const [pinnedNews, ...feedNews] = news;

  return (
    <>
      <PublicFacebookHome
        clubName={home.club.publicName}
        logoUrl={logoUrl}
        heroTitle={home.settings.heroTitle ?? home.club.publicName}
        heroSubtitle={home.settings.heroSubtitle}
        contactPhone={home.settings.contactPhone}
        contactEmail={home.settings.contactEmail}
        contactAddress={home.settings.contactAddress}
        facebookUrl={facebookUrl}
        pinnedNews={pinnedNews ?? null}
        feedNews={feedNews}
        nextMatch={home.nextMatch}
        ownTeamName={league.ownTeamName}
        heroImages={heroImages}
        academyImages={academyImages}
        galleryItems={galleryItems}
      />

      <PublicMobileSignupBar phone={home.settings.contactPhone} />
    </>
  );
}
