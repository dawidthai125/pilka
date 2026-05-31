import type { Metadata } from "next";
import Link from "next/link";

import { buildPublicPageMetadata } from "@/lib/website/seo";
import { getPublicClubId, getPublicLeagueTable, getPublicMatches, getPublicNews, getPublicTeamStats } from "@/lib/website/public-data";

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

  return (
    <div className="mx-auto max-w-6xl space-y-10 px-4 py-10 sm:px-6">
      <div>
        <h1 className="text-3xl font-bold">Panel kibica</h1>
        <p className="mt-2 text-muted-foreground">
          Terminarz, wyniki, aktualności i statystyki — bez logowania.
        </p>
      </div>

      <section className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Nadchodzące mecze", value: upcoming.length },
          { label: "Ostatnie wyniki", value: results.length },
          { label: "Pozycja w tabeli", value: league.entries.findIndex((e) => e.teamName === league.ownTeamName) + 1 || "—" },
          { label: "Gole drużyny", value: stats?.goals ?? 0 },
        ].map((item) => (
          <div key={item.label} className="rounded-xl border bg-card p-5 text-center">
            <p className="text-2xl font-bold text-[var(--club-primary)]">{item.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Terminarz</h2>
          <Link href="/mecze" className="text-sm text-primary underline">Więcej</Link>
        </div>
        <div className="space-y-2">
          {upcoming.map((m) => (
            <div key={m.id} className="rounded-lg border px-4 py-3 text-sm">
              {m.matchDate} · {m.homeTeamName} — {m.awayTeamName}
            </div>
          ))}
        </div>
      </section>

      <section>
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-xl font-semibold">Aktualności</h2>
          <Link href="/aktualnosci" className="text-sm text-primary underline">Więcej</Link>
        </div>
        <div className="space-y-2">
          {news.map((n) => (
            <Link key={n.id} href={`/aktualnosci/${n.slug}`} className="block rounded-lg border px-4 py-3 text-sm hover:bg-muted/40">
              {n.title}
            </Link>
          ))}
        </div>
      </section>
    </div>
  );
}
