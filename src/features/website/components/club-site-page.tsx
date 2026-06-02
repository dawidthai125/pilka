import { getWebsiteAssetUrl } from "@/lib/website/assets";
import { buildPublicWebsiteMediaBundle } from "@/lib/website/media";
import {
  getPublicClubId,
  getPublicClubStats,
  getPublicLeagueTable,
  getPublicNews,
  getPublicSocialIntegrations,
  getPublicSponsors,
  getPublicTeams,
  getPublicWebsiteHome,
  getPublicWebsiteMedia,
} from "@/lib/website/public-data";
import { ClubSiteShell } from "@/features/website/components/club-site-shell";

export async function ClubSitePageWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  const home = await getPublicWebsiteHome();
  if (!home) {
    return (
      <div className="flex min-h-screen flex-col">
        <main id="main-content" className="flex flex-1 items-center justify-center p-6 text-center">
          <p>Strona klubu jest niedostępna.</p>
        </main>
      </div>
    );
  }

  const [logoUrl, socialLinks] = await Promise.all([
    getWebsiteAssetUrl(home.settings.logoPath),
    getPublicSocialIntegrations(home.club.id),
  ]);

  return (
    <ClubSiteShell
      clubName={home.club.publicName}
      officialName={home.club.officialName}
      settings={home.settings}
      logoUrl={logoUrl}
      socialLinks={socialLinks}
    >
      {children}
    </ClubSiteShell>
  );
}

export async function loadClubHomepageData() {
  const clubId = await getPublicClubId();
  const [home, news, league, sponsors, teams, clubStats, mediaItems] = await Promise.all([
    getPublicWebsiteHome(),
    getPublicNews(clubId, { limit: 6 }),
    getPublicLeagueTable(clubId),
    getPublicSponsors(),
    getPublicTeams(),
    getPublicClubStats(),
    getPublicWebsiteMedia(clubId),
  ]);

  const logoUrl = home?.settings.logoPath ? await getWebsiteAssetUrl(home.settings.logoPath) : null;
  const mediaBundle = await buildPublicWebsiteMediaBundle(mediaItems);

  const newsWithImages = await Promise.all(
    news.map(async (item) => ({
      ...item,
      featuredImageUrl:
        mediaBundle.newsImages[item.id] ??
        (item.featuredImagePath ? await getWebsiteAssetUrl(item.featuredImagePath) : null),
    })),
  );

  const teamsWithMedia = teams.map((team) => ({
    ...team,
    imageUrl: mediaBundle.teamImages[team.id] ?? null,
  }));

  return {
    home,
    news: newsWithImages,
    league,
    sponsors,
    teams: teamsWithMedia,
    clubStats,
    heroImages: mediaBundle.heroImages,
    academyImages: mediaBundle.academyImages,
    galleryItems: mediaBundle.galleryImages,
    logoUrl,
  };
}

export {
  PublicHeroSection,
  PublicMatchCenterSection,
  PublicTeamsSection,
  PublicAcademySection,
  PublicGallerySection,
  PublicNewsSection,
  PublicSponsorsSection,
  PublicClubStatsSection,
  PublicLeagueTableSection,
} from "@/features/website/components/club-home-sections";
