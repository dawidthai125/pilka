import Link from "next/link";
import { Calendar, MapPin, Trophy, Users } from "lucide-react";

import { ClubLogo } from "@/components/club/club-logo";
import type { CoachDayData } from "@/lib/dashboard/coach-day";
import { cn } from "@/lib/utils";

function formatMatchWhen(date: string, time: string | null): string {
  const day = new Date(`${date}T12:00:00`).toLocaleDateString("pl-PL", {
    weekday: "long",
    day: "numeric",
    month: "long",
  });
  return time ? `${day} · ${time.slice(0, 5)}` : day;
}

function availabilityLabel(available: number, total: number): string {
  if (total === 0) return "Brak danych o dostępności";
  const pct = Math.round((available / total) * 100);
  return `${available}/${total} zawodników dostępnych (${pct}%)`;
}

export function DashboardHero({
  clubName,
  officialSubtitle,
  logoUrl,
  userName,
  teamName,
  coachDay,
}: {
  clubName: string;
  officialSubtitle: string | null;
  logoUrl: string | null;
  userName: string;
  teamName: string | null;
  coachDay: CoachDayData;
}) {
  const match = coachDay.nextMatch;
  const availability = availabilityLabel(coachDay.nextTrainingAvailable, coachDay.nextTrainingTotal);

  return (
    <section
      aria-label="Panel klubu"
      className={cn(
        "relative overflow-hidden rounded-2xl border border-[color-mix(in_srgb,var(--club-primary)_30%,transparent)]",
        "bg-gradient-to-br from-[var(--club-primary,#0B3D2E)] via-[#0a4a38] to-[#062820]",
        "p-5 text-white shadow-lg sm:p-6 md:p-8",
      )}
    >
      <div
        className="pointer-events-none absolute -right-16 -top-16 size-48 rounded-full bg-[var(--club-secondary,#F4C430)]/10 blur-2xl"
        aria-hidden
      />
      <div
        className="pointer-events-none absolute -bottom-20 -left-10 size-56 rounded-full bg-white/5 blur-3xl"
        aria-hidden
      />

      <div className="relative grid gap-6 lg:grid-cols-[1fr_auto] lg:items-start">
        <div className="space-y-4">
          <div className="flex items-start gap-4">
            <ClubLogo logoUrl={logoUrl} clubName={clubName} size="xl" onDark className="ring-2 ring-white/20" />
            <div className="min-w-0 flex-1">
              <p className="text-xs font-semibold uppercase tracking-widest text-[var(--club-secondary,#F4C430)]">
                Panel klubu
              </p>
              <h1 className="mt-1 text-2xl font-bold leading-tight tracking-tight sm:text-3xl">{clubName}</h1>
              {officialSubtitle ? (
                <p className="mt-1 truncate text-sm text-white/75">{officialSubtitle}</p>
              ) : null}
              {teamName ? (
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-sm font-medium">
                  <Users className="size-3.5 shrink-0" />
                  <span className="truncate">{teamName}</span>
                </p>
              ) : null}
            </div>
          </div>

          <p className="text-sm text-white/80">
            Witaj, <span className="font-semibold text-white">{userName}</span>
          </p>
        </div>

        <div className="grid gap-3 sm:grid-cols-2 lg:min-w-[320px] lg:grid-cols-1">
          <div className="rounded-xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--club-secondary,#F4C430)]">
              <Trophy className="size-4" />
              Najbliższy mecz
            </div>
            {match ? (
              <div className="mt-2 space-y-1">
                <p className="text-lg font-bold leading-snug">
                  {match.isHome ? "vs" : "@"} {match.opponent}
                </p>
                <p className="flex items-start gap-1.5 text-sm text-white/85">
                  <Calendar className="mt-0.5 size-3.5 shrink-0" />
                  {formatMatchWhen(match.date, match.time)}
                </p>
                <Link
                  href={`/matches/${match.id}`}
                  className="mt-2 inline-flex min-h-11 items-center text-sm font-medium text-[var(--club-secondary,#F4C430)] underline-offset-4 hover:underline"
                >
                  Szczegóły meczu →
                </Link>
              </div>
            ) : (
              <p className="mt-2 text-sm text-white/70">Brak zaplanowanego meczu</p>
            )}
          </div>

          <div className="rounded-xl border border-white/10 bg-white/10 p-4 backdrop-blur-sm">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-[var(--club-secondary,#F4C430)]">
              <Users className="size-4" />
              Dostępność kadry
            </div>
            <p className="mt-2 text-2xl font-bold tabular-nums">
              {coachDay.nextTrainingTotal > 0
                ? `${coachDay.nextTrainingAvailable}/${coachDay.nextTrainingTotal}`
                : "—"}
            </p>
            <p className="mt-1 text-sm text-white/80">{availability}</p>
            {coachDay.todayTraining ? (
              <p className="mt-2 flex items-start gap-1.5 text-xs text-white/65">
                <MapPin className="mt-0.5 size-3 shrink-0" />
                {coachDay.todayTraining.location ?? "Trening zaplanowany"}
              </p>
            ) : null}
          </div>
        </div>
      </div>
    </section>
  );
}
