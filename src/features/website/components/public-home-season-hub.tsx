import Link from "next/link";
import { ArrowRight, Calendar, ChevronRight, Target, Trophy, TrendingUp } from "lucide-react";

import {
  CLUB_DISPLAY_CLASS,
  CLUB_SCENE_DARK,
} from "@/lib/website/constants";
import {
  formatPublicMatchKickoff,
  formatPublicMatchScore,
  formatPublicMatchTime,
  isDisplayablePublicMatch,
} from "@/lib/website/match-display";
import { cn } from "@/lib/utils";
import type { LeagueTableEntry } from "@/types/matches";
import type { PublicMatchSummary, PublicPlayer, PublicTeamStats } from "@/types/website";

function ownTeamInMatch(match: PublicMatchSummary, ownNames: string[]): boolean {
  const hay = `${match.homeTeamName} ${match.awayTeamName}`.toLowerCase();
  return ownNames.some((name) => name.length >= 4 && hay.includes(name.toLowerCase().slice(0, 6)));
}

function matchOutcome(
  match: PublicMatchSummary,
  ownNames: string[],
): "W" | "D" | "L" | null {
  if (match.homeScore == null || match.awayScore == null) return null;
  if (!ownTeamInMatch(match, ownNames)) return null;

  const home = match.homeScore;
  const away = match.awayScore;
  const isHome = ownNames.some((n) => match.homeTeamName.toLowerCase().includes(n.toLowerCase().slice(0, 6)));
  const gf = isHome ? home : away;
  const ga = isHome ? away : home;
  if (gf > ga) return "W";
  if (gf < ga) return "L";
  return "D";
}

const OUTCOME_STYLES = {
  W: "bg-emerald-500/20 text-emerald-300 ring-emerald-400/30",
  D: "bg-amber-500/15 text-amber-200 ring-amber-400/25",
  L: "bg-red-500/15 text-red-300 ring-red-400/25",
} as const;

function tableWindow(entries: LeagueTableEntry[], radius = 2): { row: LeagueTableEntry; position: number }[] {
  const ownIdx = entries.findIndex((e) => e.isOwnClub);
  if (ownIdx < 0) {
    return entries.slice(0, 6).map((row, i) => ({ row, position: i + 1 }));
  }
  const start = Math.max(0, ownIdx - radius);
  const end = Math.min(entries.length, ownIdx + radius + 1);
  return entries.slice(start, end).map((row, i) => ({ row, position: start + i + 1 }));
}

function StatTile({
  label,
  value,
  hint,
}: {
  label: string;
  value: string | number;
  hint?: string;
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/5 px-4 py-4 backdrop-blur-sm sm:px-5 sm:py-5">
      <p className="text-[11px] font-semibold uppercase tracking-wider text-white/55">{label}</p>
      <p className={cn(CLUB_DISPLAY_CLASS, "mt-1 text-3xl font-black tabular-nums text-[var(--club-secondary)] sm:text-4xl")}>
        {value}
      </p>
      {hint ? <p className="mt-1 text-xs text-white/50">{hint}</p> : null}
    </div>
  );
}

function NextMatchCard({
  match,
  ownTeamName,
  href,
}: {
  match: PublicMatchSummary;
  ownTeamName: string;
  href: string;
}) {
  const kickoff = formatPublicMatchKickoff(match);
  const time = formatPublicMatchTime(match.matchTime);
  const isHome = match.homeTeamName.toLowerCase().includes(ownTeamName.toLowerCase().slice(0, 6));

  return (
    <Link
      href={href}
      className="group relative block overflow-hidden rounded-2xl border border-[var(--club-secondary)]/25 bg-gradient-to-br from-[var(--club-primary)] via-[#0a4a38] to-[#062820] p-5 sm:p-6"
    >
      <div className="absolute -right-8 -top-8 size-32 rounded-full bg-[var(--club-secondary)]/10 blur-2xl" aria-hidden />
      <div className="relative space-y-4">
        <div className="flex items-center justify-between gap-2">
          <p className={cn(CLUB_DISPLAY_CLASS, "text-xs font-bold uppercase tracking-[0.15em] text-[var(--club-secondary)]")}>
            Następny mecz
          </p>
          <span className="rounded-full bg-white/10 px-2.5 py-0.5 text-[10px] font-semibold uppercase text-white/80">
            {isHome ? "U nas" : "Wyjazd"}
          </span>
        </div>

        <div className="grid grid-cols-[1fr_auto_1fr] items-center gap-2 sm:gap-4">
          <p className="text-right text-sm font-bold leading-tight text-white sm:text-base lg:text-lg">{match.homeTeamName}</p>
          <div className="flex flex-col items-center px-2">
            <span className={cn(CLUB_DISPLAY_CLASS, "text-2xl font-black text-[var(--club-secondary)] sm:text-3xl")}>VS</span>
            {time ? <span className="mt-0.5 text-sm font-bold tabular-nums text-white">{time}</span> : null}
          </div>
          <p className="text-left text-sm font-bold leading-tight text-white sm:text-base lg:text-lg">{match.awayTeamName}</p>
        </div>

        {kickoff ? (
          <p className="flex items-center gap-1.5 text-sm text-white/75">
            <Calendar className="size-3.5 shrink-0 text-[var(--club-secondary)]" />
            {kickoff}
          </p>
        ) : null}
        {match.competition ? (
          <p className="text-xs text-white/55">
            {match.competition}
            {match.roundNumber ? ` · kolejka ${match.roundNumber}` : ""}
          </p>
        ) : null}
        {match.stadium ? <p className="text-xs text-white/45">{match.stadium}</p> : null}

        <span className="inline-flex items-center gap-1 text-sm font-semibold text-[var(--club-secondary)] group-hover:underline">
          Cały terminarz <ArrowRight className="size-4" />
        </span>
      </div>
    </Link>
  );
}

function RecentResultRow({
  match,
  ownNames,
  href,
}: {
  match: PublicMatchSummary;
  ownNames: string[];
  href: string;
}) {
  const score = formatPublicMatchScore(match);
  const outcome = matchOutcome(match, ownNames);
  const kickoff = formatPublicMatchKickoff(match);

  return (
    <Link
      href={href}
      className="group flex items-center gap-3 rounded-xl border border-white/8 bg-black/15 px-3 py-3 transition hover:border-white/20 hover:bg-black/25 sm:px-4"
    >
      {outcome ? (
        <span
          className={cn(
            "flex size-9 shrink-0 items-center justify-center rounded-lg text-sm font-black ring-1",
            OUTCOME_STYLES[outcome],
          )}
        >
          {outcome}
        </span>
      ) : (
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/5 text-xs text-white/40">—</span>
      )}
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-semibold text-white">
          {match.homeTeamName} — {match.awayTeamName}
        </p>
        {kickoff ? <p className="text-[11px] text-white/45">{kickoff}</p> : null}
      </div>
      <span className={cn(CLUB_DISPLAY_CLASS, "shrink-0 text-lg font-black tabular-nums text-[var(--club-secondary)]")}>
        {score ?? "—"}
      </span>
    </Link>
  );
}

export function PublicHomeSeasonHub({
  nextMatch,
  recentResults,
  leagueEntries,
  competition,
  season,
  ownTeamName,
  officialTeamName,
  teamStats,
  topScorers = [],
}: {
  nextMatch: PublicMatchSummary | null;
  recentResults: PublicMatchSummary[];
  leagueEntries: LeagueTableEntry[];
  competition: string;
  season: string;
  ownTeamName: string;
  officialTeamName: string;
  teamStats: PublicTeamStats | null;
  topScorers?: PublicPlayer[];
}) {
  const ownRow = leagueEntries.find((e) => e.isOwnClub);
  const ownPosition = ownRow ? leagueEntries.indexOf(ownRow) + 1 : null;
  const tableRows = tableWindow(leagueEntries, 2);
  const ownNames = [officialTeamName, ownTeamName, "Mietków", "Piorun"].filter(Boolean);
  const displayNext = isDisplayablePublicMatch(nextMatch) ? nextMatch : null;
  const results = recentResults.filter(isDisplayablePublicMatch).slice(0, 6);

  const hasContent = Boolean(displayNext || results.length > 0 || leagueEntries.length > 0 || ownRow);
  if (!hasContent) return null;

  const formFromResults = results
    .map((m) => matchOutcome(m, ownNames))
    .filter((o): o is "W" | "D" | "L" => o != null)
    .slice(0, 5)
    .join("");

  return (
    <section className={cn(CLUB_SCENE_DARK, "relative overflow-hidden py-12 sm:py-16")} aria-label="Sezon w skrócie">
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.04]"
        style={{
          backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Ccircle cx='40' cy='40' r='36' fill='none' stroke='white' stroke-width='1'/%3E%3Cpath d='M40 4 L48 28 L72 28 L52 44 L60 68 L40 52 L20 68 L28 44 L8 28 L32 28 Z' fill='white' opacity='0.5'/%3E%3C/svg%3E")`,
          backgroundSize: "80px 80px",
        }}
        aria-hidden
      />

      <div className="relative mx-auto max-w-6xl px-4 sm:px-6">
        <div className="mb-8 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--club-secondary)]">Dla kibica</p>
            <h2 className={cn(CLUB_DISPLAY_CLASS, "mt-2 text-3xl font-bold text-white sm:text-4xl")}>Sezon w skrócie</h2>
            <p className="mt-2 text-sm text-white/65">
              {competition} · {season}
            </p>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link
              href="/mecze"
              className="inline-flex min-h-10 items-center gap-1 rounded-lg bg-[var(--club-secondary)] px-4 text-sm font-bold text-[var(--club-primary)]"
            >
              Terminarz <ChevronRight className="size-4" />
            </Link>
            <Link
              href="/tabela"
              className="inline-flex min-h-10 items-center rounded-lg border border-white/25 px-4 text-sm font-semibold text-white hover:bg-white/10"
            >
              Pełna tabela
            </Link>
          </div>
        </div>

        {ownRow ? (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
            <StatTile label="Pozycja" value={ownPosition ?? "—"} hint={`z ${leagueEntries.length} drużyn`} />
            <StatTile label="Punkty" value={ownRow.points} hint={`${ownRow.played} meczów rozegranych`} />
            <StatTile
              label="Bilans"
              value={`${ownRow.won}-${ownRow.drawn}-${ownRow.lost}`}
              hint={formFromResults ? `Forma: ${formFromResults}` : "Wygrane · remisy · porażki"}
            />
            <StatTile
              label="Bramki"
              value={`${ownRow.goalsFor}:${ownRow.goalsAgainst}`}
              hint={ownRow.goalDifference >= 0 ? `+${ownRow.goalDifference} różnicy` : `${ownRow.goalDifference} różnicy`}
            />
          </div>
        ) : teamStats && teamStats.matchesPlayed > 0 ? (
          <div className="mb-6 grid grid-cols-2 gap-3 sm:grid-cols-4 lg:gap-4">
            <StatTile label="Mecze" value={teamStats.matchesPlayed} />
            <StatTile label="Bramki" value={teamStats.goals} />
            <StatTile label="Asysty" value={teamStats.assists} />
            <StatTile label="Kadra" value={teamStats.playersCount} hint="zawodników" />
          </div>
        ) : null}

        <div className="grid gap-6 lg:grid-cols-5 lg:gap-8">
          <div className="space-y-6 lg:col-span-3">
            {displayNext ? (
              <NextMatchCard match={displayNext} ownTeamName={officialTeamName || ownTeamName} href="/mecze" />
            ) : (
              <div className="flex min-h-[180px] flex-col items-center justify-center rounded-2xl border border-dashed border-white/15 bg-white/5 p-6 text-center">
                <Calendar className="mb-2 size-8 text-white/35" />
                <p className="text-sm font-medium text-white/70">Brak zaplanowanego meczu</p>
                <Link href="/mecze" className="mt-2 text-sm text-[var(--club-secondary)] hover:underline">
                  Zobacz terminarz
                </Link>
              </div>
            )}

            {results.length > 0 ? (
              <div>
                <div className="mb-3 flex items-center justify-between">
                  <h3 className="flex items-center gap-2 text-sm font-bold uppercase tracking-wide text-white/80">
                    <TrendingUp className="size-4 text-[var(--club-secondary)]" />
                    Ostatnie wyniki
                  </h3>
                  <Link href="/mecze" className="text-xs font-medium text-white/60 hover:text-[var(--club-secondary)]">
                    Wszystkie →
                  </Link>
                </div>
                <div className="space-y-2">
                  {results.map((match) => (
                    <RecentResultRow key={match.id} match={match} ownNames={ownNames} href="/mecze" />
                  ))}
                </div>
              </div>
            ) : null}
          </div>

          {leagueEntries.length > 0 ? (
            <div className="lg:col-span-2">
              <div className="overflow-hidden rounded-2xl border border-white/10 bg-black/25 backdrop-blur-sm">
                <div className="flex items-center justify-between border-b border-white/10 px-4 py-3 sm:px-5">
                  <h3 className="flex items-center gap-2 text-sm font-bold text-[var(--club-secondary)]">
                    <Trophy className="size-4" />
                    Tabela ligi
                  </h3>
                  <Link href="/tabela" className="text-[11px] font-medium text-white/60 hover:text-white">
                    Pełna →
                  </Link>
                </div>
                <div className="grid grid-cols-[2rem_1fr_repeat(4,minmax(2rem,auto))] gap-x-1 border-b border-white/10 px-3 py-2 text-[10px] font-semibold uppercase tracking-wide text-white/45 sm:px-4">
                  <span>#</span>
                  <span>Drużyna</span>
                  <span className="text-center">M</span>
                  <span className="text-center">Pkt</span>
                  <span className="text-center hidden sm:block">+/-</span>
                  <span className="text-center hidden sm:block">B</span>
                </div>
                <div className="divide-y divide-white/8">
                  {tableRows.map(({ row, position }) => (
                    <div
                      key={row.id}
                      className={cn(
                        "grid grid-cols-[2rem_1fr_repeat(4,minmax(2rem,auto))] items-center gap-x-1 px-3 py-2.5 text-sm sm:px-4",
                        row.isOwnClub && "bg-[var(--club-secondary)]/12 font-bold",
                      )}
                    >
                      <span className="tabular-nums text-white/60">{position}</span>
                      <span className="truncate text-white">{row.teamName}</span>
                      <span className="text-center tabular-nums text-white/75">{row.played}</span>
                      <span className="text-center tabular-nums text-[var(--club-secondary)]">{row.points}</span>
                      <span className="hidden text-center tabular-nums text-white/60 sm:block">
                        {row.goalDifference > 0 ? `+${row.goalDifference}` : row.goalDifference}
                      </span>
                      <span className="hidden text-center tabular-nums text-white/50 sm:block">
                        {row.goalsFor}:{row.goalsAgainst}
                      </span>
                    </div>
                  ))}
                </div>
                {ownRow && ownPosition && ownPosition > 6 ? (
                  <p className="border-t border-white/10 px-4 py-2 text-center text-[11px] text-white/45">
                    Widoczny fragment wokół naszej drużyny · {ownPosition}. miejsce w tabeli
                  </p>
                ) : null}
              </div>

              {teamStats && teamStats.goals > 0 ? (
                <div className="mt-4 flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 px-4 py-3">
                  <Target className="size-5 shrink-0 text-[var(--club-secondary)]" />
                  <div>
                    <p className="text-xs text-white/55">Sezon seniorski</p>
                    <p className="text-sm font-semibold text-white">
                      {teamStats.goals} bramek · {teamStats.matchesPlayed} meczów w bazie klubu
                    </p>
                  </div>
                </div>
              ) : null}

              {topScorers.length > 0 ? (
                <div className="mt-4 overflow-hidden rounded-xl border border-white/10 bg-black/20">
                  <div className="flex items-center justify-between border-b border-white/10 px-4 py-2.5">
                    <h3 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-[var(--club-secondary)]">
                      <Target className="size-3.5" />
                      Strzelcy
                    </h3>
                    <Link href="/druzyna" className="text-[11px] text-white/55 hover:text-white">
                      Kadra →
                    </Link>
                  </div>
                  <div className="divide-y divide-white/8">
                    {topScorers.map((player, index) => (
                      <div key={player.id} className="flex items-center gap-3 px-4 py-2.5">
                        <span className="w-5 text-xs font-bold tabular-nums text-white/40">{index + 1}</span>
                        <span className="min-w-0 flex-1 truncate text-sm text-white">
                          {player.lastName} {player.firstName}
                        </span>
                        <span className={cn(CLUB_DISPLAY_CLASS, "text-base font-black tabular-nums text-[var(--club-secondary)]")}>
                          {player.goals}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </section>
  );
}
