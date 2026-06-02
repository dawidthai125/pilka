import Link from "next/link";
import { CalendarDays, HeartPulse, Trophy, UserCheck, Users } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import type { CoachDayData } from "@/lib/dashboard/coach-day";
import { cn } from "@/lib/utils";

function formatDate(date: string, time: string | null): string {
  const formatted = new Date(`${date}T12:00:00`).toLocaleDateString("pl-PL", {
    weekday: "short",
    day: "numeric",
    month: "short",
  });
  return time ? `${formatted}, ${time.slice(0, 5)}` : formatted;
}

export function CoachDayPanel({ data }: { data: CoachDayData }) {
  const quickActions = [
    { href: "/injuries/report", label: "Zgłoś uraz" },
    { href: data.todayTraining ? `/training/${data.todayTraining.id}` : "/training", label: "Obecność" },
    {
      href: data.unconfirmedRsvpMatchId
        ? `/attendance/matches/${data.unconfirmedRsvpMatchId}`
        : "/attendance",
      label: "RSVP mecz",
    },
    { href: "/training/coach", label: "Panel trenera" },
    { href: "/communication", label: "Komunikacja" },
    { href: "/attendance", label: "Frekwencja" },
  ];

  return (
    <section className="space-y-4" aria-labelledby="coach-day-heading">
      <div>
        <h2 id="coach-day-heading" className="text-xl font-semibold tracking-tight">
          Coach Day
        </h2>
        <p className="text-sm text-muted-foreground">
          Dzisiejsze priorytety — trening, mecz, kadra i szybkie akcje.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <CalendarDays className="size-4" />
              {data.todayTraining?.date === new Date().toISOString().slice(0, 10)
                ? "Dzisiejszy trening"
                : "Najbliższy trening"}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.todayTraining ? (
              <>
                <p className="font-medium">{formatDate(data.todayTraining.date, data.todayTraining.time)}</p>
                {data.todayTraining.teamName ? (
                  <p className="text-muted-foreground">{data.todayTraining.teamName}</p>
                ) : null}
                {data.todayTraining.location ? (
                  <p className="text-muted-foreground">{data.todayTraining.location}</p>
                ) : null}
                <p className="text-muted-foreground">
                  Dostępni: {data.nextTrainingAvailable}/{data.nextTrainingTotal || "—"}
                </p>
                <Link
                  href={`/training/${data.todayTraining.id}`}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "min-h-11")}
                >
                  Otwórz trening
                </Link>
              </>
            ) : (
              <p className="text-muted-foreground">Brak zaplanowanego treningu.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Trophy className="size-4" />
              Najbliższy mecz
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.nextMatch ? (
              <>
                <p className="font-medium">{formatDate(data.nextMatch.date, data.nextMatch.time)}</p>
                <p className="text-muted-foreground">
                  {data.nextMatch.isHome ? "vs" : "@"} {data.nextMatch.opponent}
                </p>
                <Link
                  href={`/matches/${data.nextMatch.id}`}
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "min-h-11")}
                >
                  Szczegóły meczu
                </Link>
              </>
            ) : (
              <p className="text-muted-foreground">Brak zaplanowanego meczu.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <UserCheck className="size-4" />
              Niepotwierdzone RSVP
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.unconfirmedRsvpCount > 0 ? (
              <>
                <p className="text-2xl font-bold">{data.unconfirmedRsvpCount}</p>
                <p className="text-muted-foreground">
                  {data.unconfirmedRsvpNames.join(", ")}
                  {data.unconfirmedRsvpCount > data.unconfirmedRsvpNames.length ? "…" : ""}
                </p>
                {data.unconfirmedRsvpMatchId ? (
                  <Link
                    href={`/attendance/matches/${data.unconfirmedRsvpMatchId}`}
                    className={cn(buttonVariants({ variant: "outline", size: "sm" }), "min-h-11")}
                  >
                    Powołania i RSVP
                  </Link>
                ) : null}
              </>
            ) : (
              <p className="text-muted-foreground">Wszyscy powołani potwierdzili obecność.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <HeartPulse className="size-4" />
              Kontuzjowani
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.injuredCount > 0 ? (
              <>
                <p className="text-2xl font-bold">{data.injuredCount}</p>
                <p className="text-muted-foreground">{data.injuredNames.join(", ")}</p>
                <Link
                  href="/injuries/registry"
                  className={cn(buttonVariants({ variant: "outline", size: "sm" }), "min-h-11")}
                >
                  Rejestr urazów
                </Link>
              </>
            ) : (
              <p className="text-muted-foreground">Brak zawodników oznaczonych jako kontuzjowani.</p>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="flex items-center gap-2 text-base">
              <Users className="size-4" />
              Braki kadrowe
            </CardTitle>
            <CardDescription>Dostępność vs oczekiwana liczba na treningu</CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-sm">
            {data.rosterGaps > 0 ? (
              <>
                <p className="text-2xl font-bold text-amber-600">{data.rosterGaps}</p>
                <p className="text-muted-foreground">Zawodników mniej niż oczekiwano na najbliższym treningu.</p>
              </>
            ) : (
              <p className="text-muted-foreground">Kadra wygląda kompletnie na najbliższy trening.</p>
            )}
          </CardContent>
        </Card>

        <Card className="sm:col-span-2 xl:col-span-1">
          <CardHeader className="pb-2">
            <CardTitle className="text-base">Szybkie akcje</CardTitle>
          </CardHeader>
          <CardContent className="flex flex-wrap gap-2">
            {quickActions.map((action) => (
              <Link
                key={action.href}
                href={action.href}
                className={cn(buttonVariants({ variant: "secondary", size: "sm" }), "min-h-11")}
              >
                {action.label}
              </Link>
            ))}
          </CardContent>
        </Card>
      </div>
    </section>
  );
}
