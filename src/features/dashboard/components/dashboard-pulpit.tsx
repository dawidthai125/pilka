import Link from "next/link";
import {
  ArrowRight,
  CalendarDays,
  CalendarPlus,
  ChevronRight,
  ClipboardCheck,
  MapPin,
  MessageSquare,
  Sparkles,
  Trophy,
  UserPlus,
  Zap,
} from "lucide-react";

import { ClubLogo } from "@/components/club/club-logo";
import { CLUB_DISPLAY_CLASS } from "@/lib/website/constants";
import type { CoachDayData } from "@/lib/dashboard/coach-day";
import { formatPublicMatchKickoffLong } from "@/lib/website/time";
import type { LeagueTableEntry } from "@/types/matches";
import type { StatItem } from "@/features/dashboard/components/dashboard-stats-grid";
import { cn } from "@/lib/utils";

function PremiumCard({
  title,
  subtitle,
  children,
  className,
  accent = "default",
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  className?: string;
  accent?: "default" | "gold" | "match";
}) {
  return (
    <div
      className={cn(
        "overflow-hidden rounded-2xl border shadow-xl",
        accent === "match"
          ? "border-[var(--club-secondary)]/20 bg-gradient-to-br from-[#041810] via-[#062818] to-[#041810]"
          : accent === "gold"
            ? "border-[var(--club-secondary)]/25 bg-gradient-to-br from-white to-[#faf8f0]"
            : "border-white/10 bg-white",
        className,
      )}
    >
      <div
        className={cn(
          "flex items-center justify-between border-b px-5 py-3.5",
          accent === "match" ? "border-white/10" : "border-black/5",
        )}
      >
        <div>
          <h3
            className={cn(
              "text-sm font-bold uppercase tracking-wide",
              accent === "match" ? "text-[var(--club-secondary)]" : "text-[var(--club-primary)]",
            )}
          >
            {title}
          </h3>
          {subtitle ? (
            <p className={cn("text-xs", accent === "match" ? "text-white/55" : "text-muted-foreground")}>
              {subtitle}
            </p>
          ) : null}
        </div>
      </div>
      <div className="p-5">{children}</div>
    </div>
  );
}

function AttendanceRing({ available, total }: { available: number; total: number }) {
  const pct = total > 0 ? Math.round((available / total) * 100) : 0;
  const circumference = 2 * Math.PI * 52;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center py-2">
      <div className="relative size-32">
        <svg className="size-32 -rotate-90" viewBox="0 0 120 120">
          <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(255,255,255,0.08)" strokeWidth="10" />
          <circle
            cx="60"
            cy="60"
            r="52"
            fill="none"
            stroke="var(--club-secondary, #F4C430)"
            strokeWidth="10"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-3xl font-black tabular-nums text-white">{total > 0 ? `${pct}%` : "—"}</span>
          <span className="text-[10px] uppercase tracking-wider text-white/50">gotowości</span>
        </div>
      </div>
      <p className="mt-3 text-center text-sm text-white/70">
        {total > 0 ? `${available} z ${total} zawodników` : "Brak danych frekwencji"}
      </p>
    </div>
  );
}

function MiniCalendar() {
  const now = new Date();
  const year = now.getFullYear();
  const month = now.getMonth();
  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const startOffset = firstDay === 0 ? 6 : firstDay - 1;
  const monthLabel = now.toLocaleDateString("pl-PL", { month: "long", year: "numeric" });

  const cells: (number | null)[] = [
    ...Array.from({ length: startOffset }, () => null),
    ...Array.from({ length: daysInMonth }, (_, i) => i + 1),
  ];

  return (
    <div>
      <p className="mb-3 text-sm font-bold capitalize text-[var(--club-primary)]">{monthLabel}</p>
      <div className="grid grid-cols-7 gap-1.5 text-center text-xs">
        {["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"].map((d) => (
          <span key={d} className="pb-1 font-bold text-muted-foreground">
            {d}
          </span>
        ))}
        {cells.map((day, i) => (
          <span
            key={i}
            className={cn(
              "flex size-8 items-center justify-center rounded-lg font-medium",
              day === now.getDate() && "bg-[var(--club-primary)] font-bold text-white shadow-md",
              day && day !== now.getDate() && "text-foreground/80 hover:bg-muted",
              !day && "invisible",
            )}
          >
            {day}
          </span>
        ))}
      </div>
    </div>
  );
}

export function DashboardPulpit({
  clubName,
  officialName,
  logoUrl,
  coverImageUrl,
  userName,
  coachDay,
  stats,
  leagueEntries,
  teamAttendance,
  quickActionHrefs,
}: {
  clubName: string;
  officialName: string | null;
  logoUrl: string | null;
  coverImageUrl?: string | null;
  userName: string;
  coachDay: CoachDayData;
  stats: StatItem[];
  leagueEntries: LeagueTableEntry[];
  teamAttendance: Array<{ name: string; pct: number }>;
  quickActionHrefs: Array<{ label: string; href: string; icon: "training" | "match" | "message" | "player" }>;
}) {
  const match = coachDay.nextMatch;
  const training = coachDay.todayTraining;
  const tableRows = leagueEntries.slice(0, 8);
  const ownRow = tableRows.find((r) => r.isOwnClub);

  const quickIcons = {
    training: CalendarPlus,
    match: Trophy,
    message: MessageSquare,
    player: UserPlus,
  };

  return (
    <div className="mx-auto w-full max-w-[1400px] space-y-6">
      {/* Hero — jak okładka wielkiego klubu */}
      <section className="relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
        {coverImageUrl ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={coverImageUrl} alt="" className="absolute inset-0 size-full object-cover" />
        ) : (
          <div className="absolute inset-0 bg-gradient-to-br from-[var(--club-primary)] to-[#020806]" />
        )}
        <div className="absolute inset-0 bg-gradient-to-r from-[#020806]/95 via-[#041810]/80 to-[#041810]/40" />
        <div
          className="pointer-events-none absolute inset-0 opacity-20"
          style={{
            backgroundImage:
              "repeating-linear-gradient(-45deg, transparent, transparent 40px, rgba(244,196,48,0.08) 40px, rgba(244,196,48,0.08) 41px)",
          }}
          aria-hidden
        />

        <div className="relative flex flex-col gap-6 p-6 sm:p-8 lg:flex-row lg:items-end lg:justify-between lg:p-10">
          <div className="flex items-start gap-5">
            <ClubLogo logoUrl={logoUrl} clubName={clubName} size="xl" onDark className="size-20 ring-4 ring-[var(--club-secondary)]/40 sm:size-24" />
            <div>
              <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-[0.25em] text-[var(--club-secondary)]">
                <Sparkles className="size-3.5" />
                Panel klubowy
              </p>
              <h1 className={cn(CLUB_DISPLAY_CLASS, "mt-2 text-3xl font-black leading-none text-white sm:text-4xl lg:text-5xl")}>
                {clubName}
              </h1>
              {officialName ? <p className="mt-2 text-sm text-white/75">{officialName}</p> : null}
              <p className="mt-4 max-w-lg text-sm text-white/85">
                Witaj, <span className="font-semibold text-white">{userName}</span> — razem budujemy klub, o którym
                marzy cała społeczność.
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3 lg:justify-end">
            <Link
              href="/matches"
              className="inline-flex min-h-11 items-center gap-2 rounded-xl bg-[var(--club-secondary)] px-5 text-sm font-bold uppercase tracking-wide text-[var(--club-primary)] shadow-lg hover:brightness-105"
            >
              Terminarz <ArrowRight className="size-4" />
            </Link>
            <Link
              href="/"
              target="_blank"
              className="inline-flex min-h-11 items-center rounded-xl border border-white/25 px-5 text-sm font-semibold text-white hover:bg-white/10"
            >
              Strona klubu
            </Link>
          </div>
        </div>
      </section>

      {/* KPI — złote liczby */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href ?? "/dashboard"}
              className="group relative overflow-hidden rounded-2xl border border-white/10 bg-gradient-to-br from-[#041810] to-[#062818] p-5 shadow-lg transition hover:border-[var(--club-secondary)]/40 hover:shadow-[0_0_30px_rgba(244,196,48,0.12)]"
            >
              <div className="absolute -right-4 -top-4 size-24 rounded-full bg-[var(--club-secondary)]/5" aria-hidden />
              <Icon className="size-5 text-[var(--club-secondary)]" />
              <p className="mt-4 text-3xl font-black tabular-nums text-white group-hover:text-[var(--club-secondary)]">
                {item.value}
              </p>
              <p className="mt-1 text-sm font-semibold text-white/90">{item.label}</p>
              <p className="text-xs text-white/50">{item.detail}</p>
            </Link>
          );
        })}
      </div>

      {/* Matchday + trening + frekwencja */}
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <PremiumCard title="Najbliższy mecz" subtitle="Matchday Center" accent="match" className="h-full">
            {match ? (
              <Link href={`/matches/${match.id}`} className="block text-center">
                <p className="text-xs font-bold uppercase tracking-[0.2em] text-[var(--club-secondary)]">
                  {match.isHome ? "U nas" : "Wyjazd"}
                </p>
                <div className="my-6 flex items-center justify-center gap-4 sm:gap-6">
                  <div className="flex flex-col items-center gap-2">
                    <ClubLogo logoUrl={logoUrl} clubName={clubName} size="xl" className="size-16 ring-2 ring-white/20 sm:size-20" />
                    <span className="max-w-[100px] text-center text-xs font-bold leading-tight text-white">{clubName}</span>
                  </div>
                  <div className="flex flex-col items-center">
                    <span className={cn(CLUB_DISPLAY_CLASS, "text-4xl font-black text-[var(--club-secondary)] sm:text-5xl")}>
                      VS
                    </span>
                  </div>
                  <div className="flex flex-col items-center gap-2">
                    <div className="flex size-16 items-center justify-center rounded-full border-2 border-dashed border-white/30 bg-white/5 text-lg font-black text-white sm:size-20">
                      {match.opponent.slice(0, 2).toUpperCase()}
                    </div>
                    <span className="max-w-[100px] text-center text-xs font-bold leading-tight text-white">{match.opponent}</span>
                  </div>
                </div>
                <p className="text-base font-semibold text-white">
                  {formatPublicMatchKickoffLong({ matchDate: match.date, matchTime: match.time }) ?? "Termin wkrótce"}
                </p>
                <span className="mt-4 inline-flex items-center gap-1 text-sm font-semibold text-[var(--club-secondary)] hover:underline">
                  Szczegóły meczu <ChevronRight className="size-4" />
                </span>
              </Link>
            ) : (
              <div className="py-8 text-center">
                <Trophy className="mx-auto size-10 text-white/25" />
                <p className="mt-3 text-sm text-white/60">Brak zaplanowanego meczu</p>
                <Link href="/matches/new" className="mt-4 inline-flex text-sm font-semibold text-[var(--club-secondary)] hover:underline">
                  Dodaj mecz →
                </Link>
              </div>
            )}
          </PremiumCard>
        </div>

        <div className="lg:col-span-3">
          <PremiumCard title="Trening" subtitle="Harmonogram" accent="match" className="h-full">
            {training ? (
              <div>
                <p className="text-xl font-bold text-white">{training.teamName ?? "Trening"}</p>
                <p className="mt-2 flex items-center gap-2 text-sm text-white/75">
                  <CalendarDays className="size-4 text-[var(--club-secondary)]" />
                  {training.date}
                  {training.time ? ` · ${training.time.slice(0, 5)}` : ""}
                </p>
                {training.location ? (
                  <p className="mt-2 flex items-start gap-2 text-xs text-white/55">
                    <MapPin className="mt-0.5 size-3.5 shrink-0 text-[var(--club-secondary)]" />
                    {training.location}
                  </p>
                ) : null}
                <Link href="/training" className="mt-5 inline-flex items-center gap-1 text-sm font-semibold text-[var(--club-secondary)] hover:underline">
                  Pełny harmonogram <ChevronRight className="size-4" />
                </Link>
              </div>
            ) : (
              <p className="py-6 text-sm text-white/60">Brak treningu w kalendarzu</p>
            )}
          </PremiumCard>
        </div>

        <div className="lg:col-span-4">
          <PremiumCard title="Frekwencja kadry" subtitle="Najbliższy trening" accent="match" className="h-full">
            <AttendanceRing available={coachDay.nextTrainingAvailable} total={coachDay.nextTrainingTotal} />
          </PremiumCard>
        </div>
      </div>

      {/* Aktywność + kalendarz */}
      <div className="grid gap-5 lg:grid-cols-2">
        <PremiumCard title="Centrum aktywności" subtitle="Ostatnie wydarzenia">
          <ul className="space-y-4">
            {match ? (
              <li className="flex gap-3 rounded-xl bg-[var(--club-primary)]/5 p-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--club-secondary)]/20">
                  <Trophy className="size-5 text-[var(--club-primary)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--club-primary)]">Zaplanowany mecz</p>
                  <p className="text-xs text-muted-foreground">
                    {match.isHome ? "vs" : "@"} {match.opponent}
                  </p>
                </div>
              </li>
            ) : null}
            {training ? (
              <li className="flex gap-3 rounded-xl bg-[var(--club-primary)]/5 p-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-[var(--club-secondary)]/20">
                  <CalendarDays className="size-5 text-[var(--club-primary)]" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-[var(--club-primary)]">Trening na boisku</p>
                  <p className="text-xs text-muted-foreground">
                    {training.teamName} — {training.date}
                  </p>
                </div>
              </li>
            ) : null}
            {coachDay.injuredCount > 0 ? (
              <li className="flex gap-3 rounded-xl bg-amber-500/10 p-3">
                <div className="flex size-10 shrink-0 items-center justify-center rounded-lg bg-amber-500/20">
                  <ClipboardCheck className="size-5 text-amber-700" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-amber-900">Kontuzje w kadrze</p>
                  <p className="text-xs text-amber-800/80">{coachDay.injuredCount} zawodników niedostępnych</p>
                </div>
              </li>
            ) : null}
            {!match && !training && coachDay.injuredCount === 0 ? (
              <li className="py-4 text-center text-sm text-muted-foreground">Brak ostatnich zdarzeń</li>
            ) : null}
          </ul>
        </PremiumCard>

        <PremiumCard title="Kalendarz klubu" subtitle="Ten miesiąc" accent="gold">
          <MiniCalendar />
        </PremiumCard>
      </div>

      {/* Tabela + akcje + frekwencja drużyn */}
      <div className="grid gap-5 lg:grid-cols-12">
        <div className="lg:col-span-5">
          <PremiumCard title="Tabela ligowa" subtitle={ownRow ? `Pozycja ${tableRows.findIndex((r) => r.isOwnClub) + 1}` : "Aktualna klasyfikacja"}>
            {tableRows.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-b text-left text-xs uppercase tracking-wide text-muted-foreground">
                      <th className="pb-3 pr-2">#</th>
                      <th className="pb-3">Drużyna</th>
                      <th className="pb-3 text-center">M</th>
                      <th className="pb-3 text-center">B</th>
                      <th className="pb-3 text-right">Pkt</th>
                    </tr>
                  </thead>
                  <tbody>
                    {tableRows.map((row, i) => (
                      <tr
                        key={row.id}
                        className={cn(
                          "border-b border-black/5 transition",
                          row.isOwnClub && "bg-[var(--club-secondary)]/15 font-bold text-[var(--club-primary)]",
                        )}
                      >
                        <td className="py-2.5 pr-2 tabular-nums">{i + 1}</td>
                        <td className="max-w-[140px] truncate py-2.5">{row.teamName}</td>
                        <td className="py-2.5 text-center tabular-nums">{row.played}</td>
                        <td className="py-2.5 text-center tabular-nums text-muted-foreground">
                          {row.goalsFor}:{row.goalsAgainst}
                        </td>
                        <td className="py-2.5 text-right tabular-nums text-[var(--club-primary)]">{row.points}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                <Link href="/matches/league-table" className="mt-4 inline-flex items-center gap-1 text-xs font-semibold text-[var(--club-primary)] hover:underline">
                  Pełna tabela <ChevronRight className="size-3.5" />
                </Link>
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">Brak danych tabeli</p>
            )}
          </PremiumCard>
        </div>

        <div className="lg:col-span-4">
          <PremiumCard title="Szybkie akcje" subtitle="Zarządzaj klubem" accent="gold">
            <div className="grid gap-2 sm:grid-cols-2">
              {quickActionHrefs.map((action) => {
                const Icon = quickIcons[action.icon];
                return (
                  <Link
                    key={action.href}
                    href={action.href}
                    className="group flex items-center gap-3 rounded-xl border border-[var(--club-primary)]/10 bg-[var(--club-primary)]/5 p-4 transition hover:border-[var(--club-secondary)]/50 hover:bg-[var(--club-secondary)]/10"
                  >
                    <div className="flex size-10 items-center justify-center rounded-lg bg-[var(--club-primary)] text-[var(--club-secondary)] transition group-hover:bg-[var(--club-secondary)] group-hover:text-[var(--club-primary)]">
                      <Icon className="size-5" />
                    </div>
                    <span className="text-sm font-semibold text-[var(--club-primary)]">{action.label}</span>
                  </Link>
                );
              })}
            </div>
          </PremiumCard>
        </div>

        <div className="lg:col-span-3">
          <PremiumCard title="Frekwencja drużyn" subtitle="Wg kategorii">
            {teamAttendance.length > 0 ? (
              <ul className="space-y-4">
                {teamAttendance.map((team) => (
                  <li key={team.name}>
                    <div className="mb-1.5 flex justify-between text-sm">
                      <span className="truncate font-medium text-[var(--club-primary)]">{team.name}</span>
                      <span className="font-bold tabular-nums text-[var(--club-secondary)]">{team.pct}%</span>
                    </div>
                    <div className="h-2.5 overflow-hidden rounded-full bg-[var(--club-primary)]/10">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[var(--club-primary)] to-[var(--club-secondary)]"
                        style={{ width: `${team.pct}%` }}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-sm text-muted-foreground">Brak danych</p>
            )}
          </PremiumCard>
        </div>
      </div>

      {/* Motto */}
      <div className="relative overflow-hidden rounded-2xl border border-[var(--club-secondary)]/20 bg-gradient-to-r from-[var(--club-primary)] to-[#062818] px-6 py-8 text-center shadow-xl sm:px-10">
        <Zap className="mx-auto size-8 text-[var(--club-secondary)]" />
        <p className={cn(CLUB_DISPLAY_CLASS, "mt-3 text-xl font-bold text-white sm:text-2xl")}>
          Razem tworzymy historię
        </p>
        <p className="mt-2 text-sm text-white/70">Pasja · Rozwój · Zaangażowanie · Tradycja</p>
      </div>
    </div>
  );
}
