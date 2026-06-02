import Link from "next/link";
import { Calendar, Newspaper, Shirt, Trophy } from "lucide-react";

import {
  HomeDarkPanel,
  HomeDarkPanelHeader,
} from "@/features/website/components/public-home-dark-ui";
import { PublicDarkCard } from "@/features/website/components/public-page-shell";
import { PLAYER_POSITION_LABELS } from "@/lib/players/constants";
import { CLUB_DISPLAY_CLASS, WEBSITE_NEWS_CATEGORY_LABELS } from "@/lib/website/constants";
import {
  formatPublicMatchKickoff,
  formatPublicMatchScore,
  formatPublicMatchTime,
} from "@/lib/website/match-display";
import { cn } from "@/lib/utils";
import type { LeagueTableEntry } from "@/types/matches";
import type { PlayerPosition } from "@/types/players";
import type { PublicMatchSummary, PublicPlayer, WebsiteNews } from "@/types/website";

function formatPosition(position: string | null | undefined) {
  if (!position) return "—";
  return PLAYER_POSITION_LABELS[position as PlayerPosition] ?? position;
}

function formatNewsDate(iso: string | null | undefined): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso.slice(0, 10);
  return d.toLocaleDateString("pl-PL", { day: "numeric", month: "short", year: "numeric" });
}

export function PublicDarkLeagueTable({ entries }: { entries: LeagueTableEntry[] }) {
  if (entries.length === 0) {
    return (
      <PublicDarkCard>
        <p className="text-sm text-white/65">Brak danych tabeli ligowej.</p>
      </PublicDarkCard>
    );
  }

  const ownIndex = entries.findIndex((e) => e.isOwnClub);

  return (
    <HomeDarkPanel>
      <HomeDarkPanelHeader title="Tabela ligi" icon={Trophy} />
      <div className="overflow-x-auto">
        <div className="min-w-[520px]">
          <div className="grid grid-cols-[2rem_1fr_repeat(6,minmax(2rem,auto))] gap-x-1 border-b border-white/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/45 sm:px-4">
            <span>#</span>
            <span>Drużyna</span>
            <span className="text-center">M</span>
            <span className="text-center">W</span>
            <span className="text-center">R</span>
            <span className="text-center">P</span>
            <span className="text-center">Pkt</span>
            <span className="text-center">Bramki</span>
          </div>
          <div className="divide-y divide-white/8">
            {entries.map((row, index) => {
              const position = index + 1;
              return (
                <div
                  key={row.id}
                  className={cn(
                    "grid grid-cols-[2rem_1fr_repeat(6,minmax(2rem,auto))] items-center gap-x-1 px-3 py-2.5 text-sm sm:px-4",
                    row.isOwnClub && "bg-[var(--club-secondary)]/12 font-bold",
                  )}
                >
                  <span
                    className={cn(
                      "tabular-nums",
                      row.isOwnClub ? "text-[var(--club-secondary)]" : "text-white/60",
                    )}
                  >
                    {position}
                  </span>
                  <span className="truncate text-white">{row.teamName}</span>
                  <span className="text-center tabular-nums text-white/75">{row.played}</span>
                  <span className="text-center tabular-nums text-white/60">{row.won}</span>
                  <span className="text-center tabular-nums text-white/60">{row.drawn}</span>
                  <span className="text-center tabular-nums text-white/60">{row.lost}</span>
                  <span className={cn(CLUB_DISPLAY_CLASS, "text-center tabular-nums text-[var(--club-secondary)]")}>
                    {row.points}
                  </span>
                  <span className="text-center tabular-nums text-white/50">
                    {row.goalsFor}:{row.goalsAgainst}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>
      {ownIndex >= 0 ? (
        <p className="border-t border-white/10 px-4 py-2.5 text-center text-[11px] text-white/45">
          Nasza drużyna:{" "}
          <span className="font-semibold text-[var(--club-secondary)]">{ownIndex + 1}. miejsce</span>
        </p>
      ) : null}
    </HomeDarkPanel>
  );
}

function SquadPlayerRow({ player, rank }: { player: PublicPlayer; rank: number }) {
  return (
    <div className="flex items-center gap-3 px-4 py-3 sm:px-5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-sm font-black tabular-nums text-white/50">
        {player.jerseyNumber ?? rank}
      </span>
      <div className="min-w-0 flex-1">
        <p className="truncate font-semibold text-white">
          {player.lastName} {player.firstName}
        </p>
        <p className="text-[11px] text-white/45">{formatPosition(player.position)}</p>
      </div>
      <div className="flex shrink-0 gap-3 text-center text-[11px] font-semibold uppercase tracking-wide text-white/45">
        <div className="min-w-[2rem]">
          <p className="text-[10px]">M</p>
          <p className={cn(CLUB_DISPLAY_CLASS, "text-base tabular-nums text-white")}>{player.matchesPlayed}</p>
        </div>
        <div className="min-w-[2rem]">
          <p className="text-[10px]">G</p>
          <p
            className={cn(
              CLUB_DISPLAY_CLASS,
              "text-base tabular-nums",
              player.goals > 0 ? "text-[var(--club-secondary)]" : "text-white/60",
            )}
          >
            {player.goals}
          </p>
        </div>
        <div className="min-w-[2rem]">
          <p className="text-[10px]">A</p>
          <p className={cn(CLUB_DISPLAY_CLASS, "text-base tabular-nums text-white/75")}>{player.assists}</p>
        </div>
      </div>
    </div>
  );
}

export function PublicDarkSquadList({ players }: { players: PublicPlayer[] }) {
  const sorted = [...players].sort((a, b) => {
    const numA = a.jerseyNumber ?? 999;
    const numB = b.jerseyNumber ?? 999;
    if (numA !== numB) return numA - numB;
    return a.lastName.localeCompare(b.lastName, "pl");
  });

  const hasAnyStats = sorted.some(
    (p) => p.goals > 0 || p.assists > 0 || p.matchesPlayed > 0,
  );

  if (sorted.length === 0) {
    return (
      <PublicDarkCard>
        <p className="text-sm text-white/65">Brak zawodników w kadrze.</p>
      </PublicDarkCard>
    );
  }

  return (
    <div className="space-y-4">
      {!hasAnyStats ? (
        <PublicDarkCard className="border-amber-400/20 bg-amber-500/5">
          <p className="text-sm font-semibold text-amber-200/90">Statystyki sezonu niedostępne w źródłach ligowych</p>
          <p className="mt-2 text-sm leading-relaxed text-white/60">
            Portale ligowe (Regiowyniki, 90minut) nie udostępniają dla B Klasy bramek i występów per zawodnik.
            Możesz uzupełnić statystyki ręcznie w panelu klubu w module Zawodnicy albo włączyć synchronizację z systemem
            mPZPN (Łączy Nas Piłka) — wtedy po imporcie gole pojawią się tutaj automatycznie.
          </p>
        </PublicDarkCard>
      ) : null}
      <HomeDarkPanel>
        <HomeDarkPanelHeader title="Lista zawodników" icon={Shirt} />
        <div className="divide-y divide-white/8">
          {sorted.map((player, index) => (
            <SquadPlayerRow key={player.id} player={player} rank={index + 1} />
          ))}
        </div>
      </HomeDarkPanel>
    </div>
  );
}

export function PublicDarkNewsList({ news }: { news: WebsiteNews[] }) {
  if (news.length === 0) {
    return (
      <PublicDarkCard>
        <p className="text-sm text-white/65">Brak aktualności.</p>
      </PublicDarkCard>
    );
  }

  return (
    <div className="space-y-3">
      {news.map((item) => (
        <Link
          key={item.id}
          href={`/aktualnosci/${item.slug}`}
          className="group block overflow-hidden rounded-xl border border-white/10 bg-black/20 p-5 transition hover:border-white/20 hover:bg-black/30 sm:p-6"
        >
          <span className="text-[10px] font-bold uppercase tracking-wide text-[var(--club-secondary)]">
            {WEBSITE_NEWS_CATEGORY_LABELS[item.category]}
          </span>
          <p className="mt-1 text-[11px] text-white/45">{formatNewsDate(item.publishedAt ?? item.createdAt)}</p>
          <h2 className="mt-2 text-xl font-bold leading-snug text-white group-hover:text-[var(--club-secondary)]">
            {item.title}
          </h2>
          {item.excerpt ? <p className="mt-2 text-sm text-white/60">{item.excerpt}</p> : null}
          {item.authorName ? <p className="mt-4 text-xs text-white/40">{item.authorName}</p> : null}
        </Link>
      ))}
    </div>
  );
}

function UpcomingMatchRow({ match }: { match: PublicMatchSummary }) {
  const kickoff = formatPublicMatchKickoff(match);
  const time = formatPublicMatchTime(match.matchTime);

  return (
    <div className="rounded-xl border border-white/8 bg-black/15 px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] font-semibold uppercase tracking-wide text-[var(--club-secondary)]">
            {match.competition}
            {match.roundNumber ? ` · kolejka ${match.roundNumber}` : ""}
          </p>
          <p className="mt-2 text-base font-bold text-white sm:text-lg">
            {match.homeTeamName} — {match.awayTeamName}
          </p>
          {match.stadium ? <p className="mt-1 text-sm text-white/45">{match.stadium}</p> : null}
        </div>
        <div className="shrink-0 text-right">
          {kickoff ? (
            <p className="flex items-center justify-end gap-1.5 text-sm text-white/75">
              <Calendar className="size-3.5 text-[var(--club-secondary)]" />
              {kickoff}
            </p>
          ) : null}
          {time ? <p className="mt-1 text-lg font-black tabular-nums text-[var(--club-secondary)]">{time}</p> : null}
        </div>
      </div>
    </div>
  );
}

function ResultMatchRow({ match }: { match: PublicMatchSummary }) {
  const score = formatPublicMatchScore(match);
  const kickoff = formatPublicMatchKickoff(match);

  return (
    <div className="rounded-xl border border-white/8 bg-black/15 px-4 py-4 sm:px-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-[11px] text-white/45">{kickoff ?? match.matchDate}</p>
          <p className="mt-1 truncate text-sm font-semibold text-white sm:text-base">
            {match.homeTeamName} — {match.awayTeamName}
          </p>
          {match.competition ? <p className="mt-0.5 text-[11px] text-white/40">{match.competition}</p> : null}
        </div>
        <span className={cn(CLUB_DISPLAY_CLASS, "shrink-0 text-2xl font-black tabular-nums text-[var(--club-secondary)]")}>
          {score ?? "—"}
        </span>
      </div>
      {match.coachNotes ? (
        <div className="mt-3 rounded-lg border border-white/8 bg-white/5 p-3 text-sm">
          <p className="font-semibold text-white/80">Relacja</p>
          <p className="mt-1 whitespace-pre-wrap text-white/60">{match.coachNotes}</p>
        </div>
      ) : null}
    </div>
  );
}

export function PublicDarkMatchesContent({
  upcoming,
  results,
}: {
  upcoming: PublicMatchSummary[];
  results: PublicMatchSummary[];
}) {
  return (
    <div className="space-y-10">
      <section>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[var(--club-secondary)]">
          <Calendar className="size-4" />
          Terminarz
        </h2>
        {upcoming.length > 0 ? (
          <div className="space-y-3">
            {upcoming.map((m) => (
              <UpcomingMatchRow key={m.id} match={m} />
            ))}
          </div>
        ) : (
          <PublicDarkCard>
            <p className="text-sm text-white/65">Brak zaplanowanych meczów.</p>
          </PublicDarkCard>
        )}
      </section>

      <section>
        <h2 className="mb-4 flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-[var(--club-secondary)]">
          <Newspaper className="size-4" />
          Wyniki
        </h2>
        {results.length > 0 ? (
          <div className="space-y-3">
            {results.map((m) => (
              <ResultMatchRow key={m.id} match={m} />
            ))}
          </div>
        ) : (
          <PublicDarkCard>
            <p className="text-sm text-white/65">Brak rozegranych meczów.</p>
          </PublicDarkCard>
        )}
      </section>
    </div>
  );
}
