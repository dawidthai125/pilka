import Link from "next/link";
import {
  CalendarDays,
  CalendarPlus,
  ClipboardCheck,
  MessageSquare,
  Trophy,
  UserPlus,
} from "lucide-react";

import { ClubLogo } from "@/components/club/club-logo";
import type { CoachDayData } from "@/lib/dashboard/coach-day";
import { formatPublicMatchKickoffLong } from "@/lib/website/time";
import type { LeagueTableEntry } from "@/types/matches";
import type { StatItem } from "@/features/dashboard/components/dashboard-stats-grid";
import { cn } from "@/lib/utils";

function PulpitCard({
  title,
  children,
  className,
}: {
  title: string;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn("rounded-xl border border-black/5 bg-white p-4 shadow-sm", className)}>
      <h3 className="text-sm font-bold text-[var(--club-primary)]">{title}</h3>
      <div className="mt-3">{children}</div>
    </div>
  );
}

function AttendanceRing({ available, total }: { available: number; total: number }) {
  const pct = total > 0 ? Math.round((available / total) * 100) : 0;
  const circumference = 2 * Math.PI * 36;
  const offset = circumference - (pct / 100) * circumference;

  return (
    <div className="flex flex-col items-center">
      <div className="relative size-24">
        <svg className="size-24 -rotate-90" viewBox="0 0 80 80">
          <circle cx="40" cy="40" r="36" fill="none" stroke="#e5e7eb" strokeWidth="8" />
          <circle
            cx="40"
            cy="40"
            r="36"
            fill="none"
            stroke="var(--club-secondary, #F4C430)"
            strokeWidth="8"
            strokeDasharray={circumference}
            strokeDashoffset={offset}
            strokeLinecap="round"
          />
        </svg>
        <span className="absolute inset-0 flex items-center justify-center text-xl font-bold text-[var(--club-primary)]">
          {total > 0 ? `${pct}%` : "—"}
        </span>
      </div>
      <p className="mt-2 text-center text-xs text-muted-foreground">
        {total > 0 ? `${available}/${total} dostępnych` : "Brak danych"}
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
      <p className="mb-2 text-xs font-semibold capitalize text-muted-foreground">{monthLabel}</p>
      <div className="grid grid-cols-7 gap-1 text-center text-[10px]">
        {["Pn", "Wt", "Śr", "Cz", "Pt", "So", "Nd"].map((d) => (
          <span key={d} className="font-semibold text-muted-foreground">
            {d}
          </span>
        ))}
        {cells.map((day, i) => (
          <span
            key={i}
            className={cn(
              "flex size-6 items-center justify-center rounded-full",
              day === now.getDate() && "bg-[var(--club-primary)] font-bold text-white",
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
  logoUrl,
  userName,
  coachDay,
  stats,
  leagueEntries,
  teamAttendance,
  quickActionHrefs,
}: {
  clubName: string;
  logoUrl: string | null;
  userName: string;
  coachDay: CoachDayData;
  stats: StatItem[];
  leagueEntries: LeagueTableEntry[];
  teamAttendance: Array<{ name: string; pct: number }>;
  quickActionHrefs: Array<{ label: string; href: string; icon: "training" | "match" | "message" | "player" }>;
}) {
  const match = coachDay.nextMatch;
  const training = coachDay.todayTraining;
  const tableRows = leagueEntries.slice(0, 6);

  const quickIcons = {
    training: CalendarPlus,
    match: Trophy,
    message: MessageSquare,
    player: UserPlus,
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-[var(--club-primary)]">Pulpit</h1>
        <p className="text-sm text-muted-foreground">Witaj, {userName}</p>
      </div>

      {/* Górny rząd widgetów */}
      <div className="grid gap-4 lg:grid-cols-3">
        <PulpitCard title="Nadchodzący mecz">
          {match ? (
            <Link href={`/matches/${match.id}`} className="block text-center hover:opacity-90">
              <div className="flex items-center justify-center gap-3">
                <ClubLogo logoUrl={logoUrl} clubName={clubName} size="md" className="size-12 rounded-full" />
                <span className="text-lg font-black text-[var(--club-secondary)]">VS</span>
                <div className="flex size-12 items-center justify-center rounded-full bg-muted text-xs font-bold text-[var(--club-primary)]">
                  {match.opponent.slice(0, 2).toUpperCase()}
                </div>
              </div>
              <p className="mt-3 text-sm font-semibold">
                {match.isHome ? "vs" : "@"} {match.opponent}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                {formatPublicMatchKickoffLong({ matchDate: match.date, matchTime: match.time }) ?? "Termin wkrótce"}
              </p>
            </Link>
          ) : (
            <p className="text-sm text-muted-foreground">Brak zaplanowanego meczu</p>
          )}
        </PulpitCard>

        <PulpitCard title="Następny trening">
          {training ? (
            <div>
              <p className="text-lg font-bold text-[var(--club-primary)]">{training.teamName ?? "Trening"}</p>
              <p className="mt-1 text-sm text-muted-foreground">
                {training.date} {training.time ? `· ${training.time.slice(0, 5)}` : ""}
              </p>
              {training.location ? (
                <p className="mt-2 text-xs text-muted-foreground">{training.location}</p>
              ) : null}
              <Link href="/training" className="mt-3 inline-block text-xs font-semibold text-[var(--club-primary)] hover:underline">
                Harmonogram →
              </Link>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Brak zaplanowanego treningu</p>
          )}
        </PulpitCard>

        <PulpitCard title="Frekwencja (7 dni)">
          <AttendanceRing available={coachDay.nextTrainingAvailable} total={coachDay.nextTrainingTotal} />
        </PulpitCard>
      </div>

      {/* Statystyki */}
      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {stats.map((item) => {
          const Icon = item.icon;
          return (
            <Link
              key={item.id}
              href={item.href ?? "/dashboard"}
              className="rounded-xl border border-black/5 bg-white p-4 shadow-sm transition hover:shadow-md"
            >
              <Icon className="size-5 text-[var(--club-primary)]" />
              <p className="mt-2 text-2xl font-bold tabular-nums text-[var(--club-primary)]">{item.value}</p>
              <p className="text-xs font-semibold text-foreground">{item.label}</p>
              <p className="text-[11px] text-muted-foreground">{item.detail}</p>
            </Link>
          );
        })}
      </div>

      {/* Środek */}
      <div className="grid gap-4 lg:grid-cols-[1fr_280px]">
        <PulpitCard title="Ostatnie zdarzenia">
          <ul className="space-y-3 text-sm">
            {match ? (
              <li className="flex gap-2">
                <Trophy className="mt-0.5 size-4 shrink-0 text-[var(--club-secondary)]" />
                <span>Zaplanowano mecz z {match.opponent}</span>
              </li>
            ) : null}
            {training ? (
              <li className="flex gap-2">
                <CalendarDays className="mt-0.5 size-4 shrink-0 text-[var(--club-secondary)]" />
                <span>Trening {training.teamName ?? ""} — {training.date}</span>
              </li>
            ) : null}
            {coachDay.injuredCount > 0 ? (
              <li className="flex gap-2">
                <ClipboardCheck className="mt-0.5 size-4 shrink-0 text-[var(--club-secondary)]" />
                <span>{coachDay.injuredCount} zawodników kontuzjowanych</span>
              </li>
            ) : null}
            {!match && !training ? (
              <li className="text-muted-foreground">Brak ostatnich zdarzeń</li>
            ) : null}
          </ul>
        </PulpitCard>

        <PulpitCard title="Kalendarz">
          <MiniCalendar />
        </PulpitCard>
      </div>

      {/* Dół */}
      <div className="grid gap-4 lg:grid-cols-3">
        <PulpitCard title="Statystyki drużyny" className="lg:col-span-1">
          {tableRows.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs">
                <thead>
                  <tr className="border-b text-left text-muted-foreground">
                    <th className="pb-2 pr-2">#</th>
                    <th className="pb-2">Drużyna</th>
                    <th className="pb-2 text-right">Pkt</th>
                  </tr>
                </thead>
                <tbody>
                  {tableRows.map((row, i) => (
                    <tr key={row.id} className={cn("border-b border-black/5", row.isOwnClub && "font-bold text-[var(--club-primary)]")}>
                      <td className="py-2 pr-2">{i + 1}</td>
                      <td className="py-2 truncate">{row.teamName}</td>
                      <td className="py-2 text-right tabular-nums">{row.points}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Brak danych tabeli</p>
          )}
        </PulpitCard>

        <PulpitCard title="Szybkie akcje">
          <ul className="space-y-2">
            {quickActionHrefs.map((action) => {
              const Icon = quickIcons[action.icon];
              return (
                <li key={action.href}>
                  <Link
                    href={action.href}
                    className="flex items-center gap-3 rounded-lg px-2 py-2 text-sm font-medium hover:bg-[var(--club-primary)]/5"
                  >
                    <Icon className="size-4 text-[var(--club-primary)]" />
                    {action.label}
                  </Link>
                </li>
              );
            })}
          </ul>
        </PulpitCard>

        <PulpitCard title="Frekwencja wg drużyn">
          {teamAttendance.length > 0 ? (
            <ul className="space-y-3">
              {teamAttendance.map((team) => (
                <li key={team.name}>
                  <div className="mb-1 flex justify-between text-xs">
                    <span className="truncate font-medium">{team.name}</span>
                    <span className="tabular-nums text-muted-foreground">{team.pct}%</span>
                  </div>
                  <div className="h-2 overflow-hidden rounded-full bg-muted">
                    <div
                      className="h-full rounded-full bg-[var(--club-secondary)]"
                      style={{ width: `${team.pct}%` }}
                    />
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-muted-foreground">Brak danych frekwencji</p>
          )}
        </PulpitCard>
      </div>
    </div>
  );
}
