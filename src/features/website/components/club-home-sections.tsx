import Link from "next/link";

import { WEBSITE_NEWS_CATEGORY_LABELS } from "@/lib/website/constants";
import type { PublicMatchSummary, PublicTeamStats, WebsiteNews } from "@/types/website";
import type { LeagueTableEntry } from "@/types/matches";
import type { PublicSponsor } from "@/types/website";

export function ClubHeroSection({
  title,
  subtitle,
  heroImageUrl,
}: {
  title: string;
  subtitle: string | null;
  heroImageUrl?: string | null;
}) {
  return (
    <section
      className="relative overflow-hidden bg-[var(--club-primary)] text-[var(--club-accent)]"
      style={
        heroImageUrl
          ? {
              backgroundImage: `linear-gradient(rgba(0,0,0,.55), rgba(0,0,0,.55)), url(${heroImageUrl})`,
              backgroundSize: "cover",
              backgroundPosition: "center",
            }
          : undefined
      }
    >
      <div className="mx-auto max-w-6xl px-4 py-16 sm:px-6 sm:py-24">
        <p className="mb-2 text-sm font-medium uppercase tracking-widest text-[var(--club-secondary)]">
          Oficjalna strona klubu
        </p>
        <h1 className="max-w-3xl text-4xl font-bold tracking-tight sm:text-5xl">{title}</h1>
        {subtitle ? <p className="mt-4 max-w-2xl text-lg opacity-90">{subtitle}</p> : null}
        <div className="mt-8 flex flex-wrap gap-3">
          <Link
            href="/mecze"
            className="inline-flex min-h-[44px] items-center rounded-md bg-[var(--club-secondary)] px-5 py-2 text-sm font-semibold text-[var(--club-primary)]"
          >
            Terminarz
          </Link>
          <Link
            href="/aktualnosci"
            className="inline-flex min-h-[44px] items-center rounded-md border border-white/30 px-5 py-2 text-sm font-semibold"
          >
            Aktualności
          </Link>
        </div>
      </div>
    </section>
  );
}

export function MatchHighlightCard({
  label,
  match,
  href,
}: {
  label: string;
  match: PublicMatchSummary | null;
  href: string;
}) {
  if (!match) {
    return (
      <div className="rounded-xl border bg-card p-6 text-card-foreground">
        <p className="text-sm text-muted-foreground">{label}</p>
        <p className="mt-2 text-lg font-medium">Brak danych</p>
      </div>
    );
  }

  const isResult = match.homeScore != null && match.awayScore != null;

  return (
    <Link href={href} className="block rounded-xl border bg-card p-6 text-card-foreground transition hover:shadow-md">
      <p className="text-sm font-medium text-muted-foreground">{label}</p>
      <p className="mt-2 text-xs text-muted-foreground">
        {match.matchDate} · {match.competition}
        {match.roundNumber ? ` · kolejka ${match.roundNumber}` : ""}
      </p>
      <div className="mt-4 flex items-center justify-between gap-4">
        <span className="font-medium">{match.homeTeamName}</span>
        <span className="rounded-md bg-muted px-3 py-1 text-lg font-bold tabular-nums">
          {isResult ? `${match.homeScore}:${match.awayScore}` : match.matchTime.slice(0, 5)}
        </span>
        <span className="text-right font-medium">{match.awayTeamName}</span>
      </div>
      {match.stadium ? <p className="mt-3 text-sm text-muted-foreground">{match.stadium}</p> : null}
    </Link>
  );
}

export function NewsCardsSection({ news }: { news: WebsiteNews[] }) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-6 flex items-end justify-between gap-4">
        <h2 className="text-2xl font-bold">Aktualności</h2>
        <Link href="/aktualnosci" className="text-sm font-medium text-primary underline">
          Wszystkie
        </Link>
      </div>
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {news.map((item) => (
          <Link key={item.id} href={`/aktualnosci/${item.slug}`} className="group rounded-xl border bg-card p-5 transition hover:shadow-md">
            <p className="text-xs font-medium text-[var(--club-primary)]">
              {WEBSITE_NEWS_CATEGORY_LABELS[item.category]}
            </p>
            <h3 className="mt-2 font-semibold group-hover:text-primary">{item.title}</h3>
            {item.excerpt ? <p className="mt-2 line-clamp-3 text-sm text-muted-foreground">{item.excerpt}</p> : null}
            <p className="mt-3 text-xs text-muted-foreground">
              {item.publishedAt?.slice(0, 10) ?? item.createdAt.slice(0, 10)}
            </p>
          </Link>
        ))}
      </div>
    </section>
  );
}

export function PublicLeagueTableSection({
  entries,
  ownTeamName,
}: {
  entries: LeagueTableEntry[];
  ownTeamName: string;
}) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-6 flex items-end justify-between">
        <h2 className="text-2xl font-bold">Tabela ligi</h2>
        <Link href="/tabela" className="text-sm font-medium text-primary underline">Pełna tabela</Link>
      </div>
      <div className="overflow-x-auto rounded-xl border">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b bg-muted/50 text-left">
            <tr>
              <th className="px-4 py-3">#</th>
              <th className="px-4 py-3">Drużyna</th>
              <th className="px-4 py-3">M</th>
              <th className="px-4 py-3">Pkt</th>
              <th className="px-4 py-3">Bramki</th>
            </tr>
          </thead>
          <tbody>
            {entries.slice(0, 8).map((row, index) => (
              <tr
                key={row.id}
                className={`border-b last:border-0 ${row.teamName === ownTeamName ? "bg-[var(--club-secondary)]/20 font-medium" : ""}`}
              >
                <td className="px-4 py-3">{index + 1}</td>
                <td className="px-4 py-3">{row.teamName}</td>
                <td className="px-4 py-3">{row.played}</td>
                <td className="px-4 py-3 font-semibold">{row.points}</td>
                <td className="px-4 py-3">{row.goalsFor}:{row.goalsAgainst}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <p className="mt-3 text-xs text-muted-foreground">
        Architektura gotowa pod synchronizację z DZPN/PZPN — obecnie dane z systemu klubu.
      </p>
    </section>
  );
}

export function SponsorsStrip({ sponsors }: { sponsors: PublicSponsor[] }) {
  const main = sponsors.filter((s) => s.publicTier === "main");
  const visible = main.length ? main : sponsors.slice(0, 6);

  return (
    <section className="border-y bg-muted/30 py-10">
      <div className="mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-6 flex items-end justify-between">
          <h2 className="text-2xl font-bold">Sponsorzy</h2>
          <Link href="/sponsorzy" className="text-sm font-medium text-primary underline">Partnerzy klubu</Link>
        </div>
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {visible.map((s) => (
            <div key={s.id} className="flex min-h-[80px] items-center justify-center rounded-lg border bg-card p-4 text-center text-sm font-medium">
              {s.companyName}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function TeamStatsSection({ stats }: { stats: PublicTeamStats | null }) {
  if (!stats) return null;
  const items = [
    { label: "Zawodnicy", value: stats.playersCount },
    { label: "Gole", value: stats.goals },
    { label: "Asysty", value: stats.assists },
    { label: "Mecze", value: stats.matchesPlayed },
  ];

  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <h2 className="mb-6 text-2xl font-bold">Statystyki drużyny</h2>
      <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
        {items.map((item) => (
          <div key={item.label} className="rounded-xl border bg-card p-6 text-center">
            <p className="text-3xl font-bold text-[var(--club-primary)]">{item.value}</p>
            <p className="mt-1 text-sm text-muted-foreground">{item.label}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

export function GalleryPreviewSection({
  albums,
}: {
  albums: Array<{ slug: string; title: string; category: string }>;
}) {
  return (
    <section className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
      <div className="mb-6 flex items-end justify-between">
        <h2 className="text-2xl font-bold">Galeria</h2>
        <Link href="/galeria" className="text-sm font-medium text-primary underline">Zobacz albumy</Link>
      </div>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {albums.slice(0, 4).map((album) => (
          <Link
            key={album.slug}
            href={`/galeria/${album.slug}`}
            className="flex min-h-[120px] items-end rounded-xl bg-gradient-to-br from-[var(--club-primary)] to-[var(--club-primary)]/70 p-4 text-white"
          >
            <span className="font-semibold">{album.title}</span>
          </Link>
        ))}
      </div>
    </section>
  );
}
