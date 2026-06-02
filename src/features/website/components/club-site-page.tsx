import { getWebsiteAssetUrl } from "@/lib/website/assets";
import {
  getPublicClubId,
  getPublicClubStats,
  getPublicGalleryAlbums,
  getPublicLeagueTable,
  getPublicNews,
  getPublicSponsors,
  getPublicTeams,
  getPublicWebsiteHome,
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

  const logoUrl = await getWebsiteAssetUrl(home.settings.logoPath);

  return (
    <ClubSiteShell
      clubName={home.club.publicName}
      officialName={home.club.officialName}
      settings={home.settings}
      logoUrl={logoUrl}
    >
      {children}
    </ClubSiteShell>
  );
}

export async function loadClubHomepageData() {
  const clubId = await getPublicClubId();
  const [home, news, league, sponsors, teams, clubStats, albums] = await Promise.all([
    getPublicWebsiteHome(),
    getPublicNews(clubId, { limit: 6 }),
    getPublicLeagueTable(clubId),
    getPublicSponsors(),
    getPublicTeams(),
    getPublicClubStats(),
    getPublicGalleryAlbums(clubId),
  ]);

  const [heroImageUrl, logoUrl] = await Promise.all([
    home?.settings.heroImagePath ? getWebsiteAssetUrl(home.settings.heroImagePath) : null,
    home?.settings.logoPath ? getWebsiteAssetUrl(home.settings.logoPath) : null,
  ]);

  const [newsImageUrls, galleryCoverUrls] = await Promise.all([
    Promise.all(
      news.map((item) => (item.featuredImagePath ? getWebsiteAssetUrl(item.featuredImagePath) : null)),
    ),
    Promise.all(
      albums.map((album) => (album.coverImagePath ? getWebsiteAssetUrl(album.coverImagePath) : null)),
    ),
  ]);

  const newsWithImages = news.map((item, index) => ({
    ...item,
    featuredImageUrl: newsImageUrls[index] ?? null,
  }));

  const galleryItems = albums.map((album, index) => ({
    slug: album.slug,
    title: album.title,
    category: album.category,
    coverImageUrl: galleryCoverUrls[index] ?? null,
  }));

  return {
    home,
    news: newsWithImages,
    league,
    sponsors,
    teams,
    clubStats,
    galleryItems,
    heroImageUrl,
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
