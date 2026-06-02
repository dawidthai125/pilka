import Link from "next/link";
import { Flame, Heart, Sparkles, Users, CalendarDays, Trophy } from "lucide-react";

import { PublicHomeNewsSection } from "@/features/website/components/public-home-news-section";
import { PublicHomeSeasonHub } from "@/features/website/components/public-home-season-hub";
import { PublicHomeSquadSection } from "@/features/website/components/public-home-squad-section";
import { PublicHomeLeagueTable } from "@/features/website/components/public-home-league-table";
import {
  HomeDarkSection,
} from "@/features/website/components/public-home-dark-ui";
import { CLUB_DISPLAY_CLASS, CLUB_SCENE_DARK } from "@/lib/website/constants";
import { cn } from "@/lib/utils";
import type { LeagueTableEntry } from "@/types/matches";
import type { PublicNewsPreviewItem, PublicMatchSummary, PublicPlayer, PublicTeamStats } from "@/types/website";

const VALUES = [
  { icon: Heart, title: "Pasja", text: "Gra z sercem na każdym treningu i meczu." },
  { icon: Sparkles, title: "Rozwój", text: "Indywidualna ścieżka dla każdego zawodnika." },
  { icon: Users, title: "Zaangażowanie", text: "Rodzice, kibice i społeczność przy klubie." },
  { icon: Flame, title: "Tradycja", text: "Lokalny klub z ambicją i tożsamością." },
] as const;

export function PublicLandingHome({
  clubName,
  officialName,
  heroTitle,
  heroSubtitle,
  coverImageUrl,
  news,
  nextMatch,
  recentResults,
  league,
  teamStats,
  players,
  topScorers,
}: {
  clubName: string;
  officialName: string;
  heroTitle: string;
  heroSubtitle: string | null;
  coverImageUrl?: string | null;
  news: PublicNewsPreviewItem[];
  nextMatch: PublicMatchSummary | null;
  recentResults: PublicMatchSummary[];
  league: { entries: LeagueTableEntry[]; ownTeamName: string; competition: string; season: string };
  teamStats: PublicTeamStats | null;
  players: PublicPlayer[];
  topScorers: PublicPlayer[];
}) {
  const ownRow = league.entries.find((e) => e.isOwnClub);
  const ownPosition = ownRow ? league.entries.indexOf(ownRow) + 1 : null;

  return (
    <>
      {/* Hero */}
      <section className="relative min-h-[420px] overflow-hidden sm:min-h-[480px] lg:min-h-[520px]" aria-label="Hero">
        {coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverImageUrl} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--club-primary)] to-[#041810]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#041810]/90 via-[#041810]/55 to-[#041810]/30" />
        <div className="relative mx-auto flex max-w-6xl flex-col justify-center px-4 py-16 sm:px-6 sm:py-20 lg:py-24">
          <p className={cn(CLUB_DISPLAY_CLASS, "text-sm font-semibold uppercase tracking-[0.2em] text-[var(--club-secondary)]")}>
            {clubName}
          </p>
          <h1 className={cn(CLUB_DISPLAY_CLASS, "mt-3 max-w-2xl text-4xl font-bold leading-[1.05] text-white sm:text-5xl lg:text-6xl")}>
            {heroTitle}
          </h1>
          <p className="mt-4 max-w-xl text-lg text-white/90 sm:text-xl">
            {heroSubtitle ?? "Razem tworzymy historię ⚡"}
          </p>
          <div className="mt-8 flex flex-wrap gap-3">
            <Link
              href="/mecze"
              className="inline-flex min-h-12 items-center gap-2 rounded-lg bg-[var(--club-secondary)] px-6 text-sm font-bold uppercase tracking-wide text-[var(--club-primary)] shadow-lg hover:brightness-105"
            >
              <CalendarDays className="size-4" />
              Mecze
            </Link>
            <Link
              href="/tabela"
              className="inline-flex min-h-12 items-center gap-2 rounded-lg border border-white/30 px-6 text-sm font-semibold text-white hover:bg-white/10"
            >
              <Trophy className="size-4" />
              Tabela
            </Link>
            <Link
              href="/aktualnosci"
              className="inline-flex min-h-12 items-center rounded-lg border border-white/20 px-6 text-sm font-semibold text-white/90 hover:bg-white/10"
            >
              Aktualności
            </Link>
          </div>
        </div>
      </section>

      <PublicHomeSeasonHub
        nextMatch={nextMatch}
        recentResults={recentResults}
        leagueEntries={league.entries}
        competition={league.competition}
        season={league.season}
        ownTeamName={league.ownTeamName}
        officialTeamName={officialName}
        teamStats={teamStats}
      />

      {league.entries.length > 0 ? (
        <HomeDarkSection
          eyebrow="Liga"
          title="Tabela"
          subtitle={`${league.competition} · sezon ${league.season}`}
          href="/tabela"
          linkLabel="Pełna tabela"
          className="border-t border-white/5 py-10 sm:py-12"
        >
          <PublicHomeLeagueTable entries={league.entries} ownPosition={ownPosition} />
        </HomeDarkSection>
      ) : null}

      <PublicHomeSquadSection players={players} topScorers={topScorers} />

      <PublicHomeNewsSection news={news} />

      {/* Wartości */}
      <section className={cn(CLUB_SCENE_DARK, "border-t border-white/5 py-10 sm:py-12")} aria-label="Wartości klubu">
        <div className="mx-auto grid max-w-6xl grid-cols-2 gap-6 px-4 sm:grid-cols-4 sm:px-6">
          {VALUES.map((item) => (
            <div key={item.title} className="text-center">
              <div className="mx-auto flex size-12 items-center justify-center rounded-full bg-[var(--club-secondary)]/15 text-[var(--club-secondary)]">
                <item.icon className="size-6" />
              </div>
              <p className="mt-3 text-sm font-bold uppercase tracking-wide text-[var(--club-secondary)]">{item.title}</p>
              <p className="mt-1 text-xs leading-relaxed text-white/70">{item.text}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Join CTA */}
      <section className={cn(CLUB_SCENE_DARK, "relative overflow-hidden py-14 sm:py-16")} aria-label="Dołącz do klubu">
        <div
          className="pointer-events-none absolute inset-0 opacity-[0.07]"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 100 140' fill='white'%3E%3Cpath d='M52 8 L68 48 L92 48 L72 68 L80 108 L52 86 L24 108 L32 68 L12 48 L36 48 Z'/%3E%3C/svg%3E")`,
            backgroundSize: "120px 168px",
          }}
          aria-hidden
        />
        <div className="relative mx-auto max-w-3xl px-4 text-center sm:px-6">
          <p className={cn(CLUB_DISPLAY_CLASS, "text-3xl font-bold text-[var(--club-secondary)] sm:text-4xl")}>
            Dołącz do Pioruna!
          </p>
          <p className="mt-3 text-base text-white/80">
            Zapisz dziecko do akademii i bądź częścią naszej piłkarskiej rodziny.
          </p>
          <Link
            href="/kontakt"
            className="mt-8 inline-flex min-h-12 items-center rounded-lg bg-[var(--club-secondary)] px-8 text-sm font-bold uppercase tracking-wide text-[var(--club-primary)] hover:brightness-105"
          >
            Zapisz dziecko
          </Link>
        </div>
      </section>
    </>
  );
}
