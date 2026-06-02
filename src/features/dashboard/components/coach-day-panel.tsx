import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
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

type CoachDayPanelProps = {
  data: CoachDayData;
  lastAnnouncement?: { title: string; href: string; date: string } | null;
};

function CoachDayTile({
  emoji,
  title,
  children,
  href,
  cta,
  variant = "default",
}: {
  emoji: string;
  title: string;
  children: React.ReactNode;
  href?: string;
  cta?: string;
  variant?: "default" | "alert" | "success";
}) {
  return (
    <article
      className={cn(
        "flex flex-col rounded-xl border p-4",
        variant === "alert" && "border-amber-300/60 bg-amber-50/80 dark:border-amber-500/30 dark:bg-amber-950/20",
        variant === "success" && "border-emerald-300/50 bg-emerald-50/60 dark:border-emerald-500/30 dark:bg-emerald-950/20",
        variant === "default" && "border-border bg-card",
      )}
    >
      <h3 className="flex items-center gap-2 text-sm font-semibold">
        <span className="text-lg" aria-hidden>
          {emoji}
        </span>
        {title}
      </h3>
      <div className="mt-3 flex flex-1 flex-col gap-2 text-sm">{children}</div>
      {href && cta ? (
        <Link
          href={href}
          className={cn(buttonVariants({ variant: "outline", size: "sm" }), "mt-4 min-h-11 w-full sm:w-auto")}
        >
          {cta}
        </Link>
      ) : null}
    </article>
  );
}

export function CoachDayPanel({ data, lastAnnouncement }: CoachDayPanelProps) {
  const isTodayTraining = data.todayTraining?.date === new Date().toISOString().slice(0, 10);

  return (
    <section className="space-y-4" aria-labelledby="coach-day-heading">
      <div>
        <h2 id="coach-day-heading" className="text-lg font-bold tracking-tight sm:text-xl">
          Dziś w klubie
        </h2>
        <p className="text-sm text-muted-foreground">Priorytety dnia — trening, mecz i kadra.</p>
      </div>

      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-3">
        <CoachDayTile
          emoji="🏃"
          title={isTodayTraining ? "Dzisiejszy trening" : "Najbliższy trening"}
          href={data.todayTraining ? `/training/${data.todayTraining.id}` : undefined}
          cta={data.todayTraining ? "Otwórz trening" : undefined}
        >
          {data.todayTraining ? (
            <>
              <p className="text-lg font-bold">{formatDate(data.todayTraining.date, data.todayTraining.time)}</p>
              {data.todayTraining.teamName ? (
                <p className="text-muted-foreground">{data.todayTraining.teamName}</p>
              ) : null}
              {data.todayTraining.location ? (
                <p className="text-muted-foreground">{data.todayTraining.location}</p>
              ) : null}
            </>
          ) : (
            <p className="text-muted-foreground">Brak zaplanowanego treningu.</p>
          )}
        </CoachDayTile>

        <CoachDayTile
          emoji="⚽"
          title="Najbliższy mecz"
          href={data.nextMatch ? `/matches/${data.nextMatch.id}` : undefined}
          cta={data.nextMatch ? "Szczegóły meczu" : undefined}
        >
          {data.nextMatch ? (
            <>
              <p className="text-lg font-bold">
                {data.nextMatch.isHome ? "vs" : "@"} {data.nextMatch.opponent}
              </p>
              <p className="text-muted-foreground">{formatDate(data.nextMatch.date, data.nextMatch.time)}</p>
            </>
          ) : (
            <p className="text-muted-foreground">Brak zaplanowanego meczu.</p>
          )}
        </CoachDayTile>

        <CoachDayTile
          emoji="🚑"
          title="Kontuzjowani"
          variant={data.injuredCount > 0 ? "alert" : "success"}
          href={data.injuredCount > 0 ? "/injuries/registry" : undefined}
          cta={data.injuredCount > 0 ? "Rejestr urazów" : undefined}
        >
          {data.injuredCount > 0 ? (
            <>
              <p className="text-3xl font-bold tabular-nums">{data.injuredCount}</p>
              <p className="text-muted-foreground">{data.injuredNames.join(", ")}</p>
            </>
          ) : (
            <p className="text-muted-foreground">Kadra bez zgłoszonych kontuzji.</p>
          )}
        </CoachDayTile>

        <CoachDayTile
          emoji="❗"
          title="Niepotwierdzone RSVP"
          variant={data.unconfirmedRsvpCount > 0 ? "alert" : "default"}
          href={
            data.unconfirmedRsvpMatchId
              ? `/attendance/matches/${data.unconfirmedRsvpMatchId}`
              : undefined
          }
          cta={data.unconfirmedRsvpCount > 0 ? "Powołania i RSVP" : undefined}
        >
          {data.unconfirmedRsvpCount > 0 ? (
            <>
              <p className="text-3xl font-bold tabular-nums">{data.unconfirmedRsvpCount}</p>
              <p className="text-muted-foreground">
                {data.unconfirmedRsvpNames.join(", ")}
                {data.unconfirmedRsvpCount > data.unconfirmedRsvpNames.length ? "…" : ""}
              </p>
            </>
          ) : (
            <p className="text-muted-foreground">Wszyscy powołani potwierdzili obecność.</p>
          )}
        </CoachDayTile>

        <CoachDayTile
          emoji="👥"
          title="Dostępni zawodnicy"
          variant={data.rosterGaps > 0 ? "alert" : "success"}
          href={data.todayTraining ? `/training/${data.todayTraining.id}` : "/attendance"}
          cta="Sprawdź dostępność"
        >
          <p className="text-3xl font-bold tabular-nums">
            {data.nextTrainingTotal > 0
              ? `${data.nextTrainingAvailable}/${data.nextTrainingTotal}`
              : "—"}
          </p>
          <p className="text-muted-foreground">
            {data.nextTrainingTotal > 0
              ? "Zgłoszeni na najbliższy trening"
              : "Brak danych o dostępności na treningu."}
          </p>
          {data.rosterGaps > 0 ? (
            <p className="text-amber-700 dark:text-amber-400">
              Brakuje {data.rosterGaps} zawodników vs oczekiwana kadra.
            </p>
          ) : null}
        </CoachDayTile>

        <CoachDayTile
          emoji="📢"
          title="Ostatni komunikat"
          href={lastAnnouncement?.href ?? "/communication"}
          cta={lastAnnouncement ? "Czytaj więcej" : "Komunikacja"}
        >
          {lastAnnouncement ? (
            <>
              <p className="font-semibold leading-snug">{lastAnnouncement.title}</p>
              <p className="text-xs text-muted-foreground">{lastAnnouncement.date.slice(0, 10)}</p>
            </>
          ) : (
            <p className="text-muted-foreground">Brak opublikowanych ogłoszeń.</p>
          )}
        </CoachDayTile>
      </div>
    </section>
  );
}
