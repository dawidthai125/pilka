import { getWebsiteAssetUrl } from "@/lib/website/assets";
import {
  getPublicClubId,
  getPublicGalleryAlbums,
  getPublicLeagueTable,
  getPublicNews,
  getPublicSponsors,
  getPublicTeamStats,
  getPublicWebsiteHome,
} from "@/lib/website/public-data";
import { ClubSiteShell } from "@/features/website/components/club-site-shell";
import {
  ClubHeroSection,
  GalleryPreviewSection,
  MatchHighlightCard,
  NewsCardsSection,
  PublicLeagueTableSection,
  SponsorsStrip,
  TeamStatsSection,
} from "@/features/website/components/club-home-sections";

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
  const [home, news, league, sponsors, stats, albums] = await Promise.all([
    getPublicWebsiteHome(),
    getPublicNews(clubId, { limit: 6 }),
    getPublicLeagueTable(clubId),
    getPublicSponsors(),
    getPublicTeamStats(),
    getPublicGalleryAlbums(clubId),
  ]);

  const heroImageUrl = home?.settings.heroImagePath
    ? await getWebsiteAssetUrl(home.settings.heroImagePath)
    : null;

  return { home, news, league, sponsors, stats, albums, heroImageUrl };
}

export { ClubHeroSection, MatchHighlightCard, NewsCardsSection, PublicLeagueTableSection, SponsorsStrip, TeamStatsSection, GalleryPreviewSection };
