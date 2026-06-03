import { getWebsiteAssetUrl } from "@/lib/website/assets";
import { buildPublicWebsiteMediaBundle } from "@/lib/website/media";
import { resolvePublicCoverImageUrl } from "@/lib/website/cover-image";
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
  clubSlug,
  children,
}: {
  clubSlug: string;
  children: React.ReactNode;
}) {
  const home = await getPublicWebsiteHome(clubSlug);
  if (!home) {
    return (
      <div className="flex min-h-screen flex-col">
        <main id="main-content" className="flex flex-1 items-center justify-center p-6 text-center">
          <p>Strona klubu jest niedostępna.</p>
        </main>
      </div>
    );
  }

  const [logoUrl, socialLinks, coverImageUrl] = await Promise.all([
    getWebsiteAssetUrl(home.settings.logoPath),
    getPublicSocialIntegrations(home.club.id),
    resolvePublicCoverImageUrl(home.settings),
  ]);

  return (
    <ClubSiteShell
      clubSlug={clubSlug}
      clubName={home.club.publicName}
      officialName={home.club.officialName}
      settings={home.settings}
      logoUrl={logoUrl}
      coverImageUrl={coverImageUrl}
      socialLinks={socialLinks}
    >
      {children}
    </ClubSiteShell>
  );
}

export async function loadClubHomepageData(clubSlug: string) {
  const clubId = await getPublicClubId(clubSlug);
  const [home, news, league, sponsors, teams, clubStats, mediaItems] = await Promise.all([
    getPublicWebsiteHome(clubSlug),
    getPublicNews(clubId, { limit: 6 }),
    getPublicLeagueTable(clubId),
    getPublicSponsors(clubSlug),
    getPublicTeams(clubSlug),
    getPublicClubStats(clubSlug),
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
