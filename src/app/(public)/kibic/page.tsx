import type { Metadata } from "next";
import Link from "next/link";

import { PublicDarkCard, PublicPageShell } from "@/features/website/components/public-page-shell";
import { CLUB_DISPLAY_CLASS } from "@/lib/website/constants";
import { buildPublicPageMetadata } from "@/lib/website/seo";
import { getPublicClubId, getPublicLeagueTable, getPublicMatches, getPublicNews, getPublicTeamStats } from "@/lib/website/public-data";
import { cn } from "@/lib/utils";

export async function generateMetadata(): Promise<Metadata> {
  return buildPublicPageMetadata("Panel kibica", "/kibic");
}

export default async function FanPanelPage() {
  const clubId = await getPublicClubId();
  const [news, upcoming, results, league, stats] = await Promise.all([
    getPublicNews(clubId, { limit: 5 }),
    getPublicMatches(clubId, "upcoming", 5),
    getPublicMatches(clubId, "results", 5),
    getPublicLeagueTable(clubId),
    getPublicTeamStats(),
  ]);

  const ownPosition = league.entries.findIndex((e) => e.isOwnClub) + 1;

  return (
    <PublicPageShell title="Panel kibica" subtitle="Terminarz, wyniki, aktualności i statystyki — bez logowania.">
      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Nadchodzące mecze", value: upcoming.length },
          { label: "Ostatnie wyniki", value: results.length },
          { label: "Pozycja w tabeli", value: ownPosition || "—" },
          { label: "Gole drużyny", value: stats?.goals ?? 0 },
        ].map((item) => (
          <PublicDarkCard key={item.label} className="text-center">
            <p className={cn(CLUB_DISPLAY_CLASS, "text-2xl font-bold text-[var(--club-secondary)]")}>{item.value}</p>
            <p className="mt-1 text-sm text-white/55">{item.label}</p>
          </PublicDarkCard>
        ))}
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--club-secondary)]">Terminarz</h2>
          <Link href="/mecze" className="text-sm text-white/60 hover:text-[var(--club-secondary)]">
            Więcej →
          </Link>
        </div>
        <div className="space-y-2">
          {upcoming.map((m) => (
            <div key={m.id} className="rounded-xl border border-white/8 bg-black/15 px-4 py-3 text-sm text-white">
              {m.matchDate} · {m.homeTeamName} — {m.awayTeamName}
            </div>
          ))}
        </div>
      </section>

      <section className="mt-10">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wide text-[var(--club-secondary)]">Aktualności</h2>
          <Link href="/aktualnosci" className="text-sm text-white/60 hover:text-[var(--club-secondary)]">
            Więcej →
          </Link>
        </div>
        <div className="space-y-2">
          {news.map((n) => (
            <Link
              key={n.id}
              href={`/aktualnosci/${n.slug}`}
              className="block rounded-xl border border-white/8 bg-black/15 px-4 py-3 text-sm text-white transition hover:border-white/20 hover:bg-black/25"
            >
              {n.title}
            </Link>
          ))}
        </div>
      </section>
    </PublicPageShell>
  );
}
