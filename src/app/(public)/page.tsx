import type { Metadata } from "next";

import {
  ClubHeroSection,
  GalleryPreviewSection,
  MatchHighlightCard,
  NewsCardsSection,
  PublicLeagueTableSection,
  SponsorsStrip,
  TeamStatsSection,
  loadClubHomepageData,
} from "@/features/website/components/club-site-page";
import { buildPublicPageMetadata } from "@/lib/website/seo";

export async function generateMetadata(): Promise<Metadata> {
  return buildPublicPageMetadata("Strona główna", "/");
}

export default async function ClubHomePage() {
  const { home, news, league, sponsors, stats, albums, heroImageUrl } = await loadClubHomepageData();
  if (!home) return null;

  return (
    <>
      <ClubHeroSection
        title={home.settings.heroTitle ?? home.club.publicName}
        subtitle={home.settings.heroSubtitle}
        heroImageUrl={heroImageUrl}
      />

      <section className="mx-auto grid max-w-6xl gap-6 px-4 py-12 sm:px-6 lg:grid-cols-2">
        <MatchHighlightCard label="Najbliższy mecz" match={home.nextMatch} href="/mecze" />
        <MatchHighlightCard label="Ostatni wynik" match={home.lastResult} href="/mecze" />
      </section>

      <NewsCardsSection news={news} />
      <SponsorsStrip sponsors={sponsors} />
      <PublicLeagueTableSection entries={league.entries} ownTeamName={league.ownTeamName} />
      <TeamStatsSection stats={stats} />
      <GalleryPreviewSection albums={albums.map((a) => ({ slug: a.slug, title: a.title, category: a.category }))} />

      <section className="mx-auto max-w-6xl px-4 pb-16 sm:px-6">
        <div className="rounded-xl border bg-card p-8 text-center">
          <h2 className="text-xl font-bold">Kadra drużyny</h2>
          <p className="mt-2 text-muted-foreground">Poznaj zawodników, numery i statystyki sezonu.</p>
          <a href="/druzyna" className="mt-4 inline-flex min-h-[44px] items-center rounded-md bg-[var(--club-primary)] px-5 text-sm font-semibold text-[var(--club-accent)]">
            Zobacz skład
          </a>
        </div>
      </section>
    </>
  );
}
