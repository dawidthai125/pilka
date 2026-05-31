"use client";

import Link from "next/link";

import { MATCH_EVENT_TYPE_LABELS } from "@/lib/matches/constants";
import type { MatchDetailData } from "@/types/matches";
import { Button, buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function MatchReportView({ data }: { data: MatchDetailData }) {
  const { match } = data;

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap gap-2 print:hidden">
        <Button type="button" onClick={() => window.print()}>Drukuj / PDF</Button>
        <Link href={`/matches/${match.id}`} className={cn(buttonVariants({ variant: "outline" }))}>
          Powrót do meczu
        </Link>
      </div>

      <article className="mx-auto max-w-3xl space-y-6 rounded-xl border bg-card p-6 print:border-0 print:p-0">
        <header className="border-b pb-4 text-center">
          <h1 className="text-2xl font-bold">Raport meczowy</h1>
          <p className="text-muted-foreground">{match.competition} · Sezon {match.season}</p>
          <p className="mt-4 text-xl font-semibold">{match.homeTeamName} — {match.awayTeamName}</p>
          {match.homeScore !== null ? (
            <p className="text-4xl font-bold">{match.homeScore} : {match.awayScore}</p>
          ) : null}
          <p className="text-sm">{match.matchDate} · {match.matchTime} · {match.stadium ?? ""}</p>
        </header>

        <section>
          <h2 className="mb-2 font-semibold">Skład i formacja</h2>
          <p className="text-sm">Formacja: {match.formation ?? "—"}</p>
          <ul className="mt-2 grid gap-1 text-sm sm:grid-cols-2">
            {data.squad
              .filter((s) => s.squadRole === "starter")
              .map((s) => (
                <li key={s.id}>{s.playerName}</li>
              ))}
          </ul>
          <p className="mt-2 text-sm font-medium">Rezerwowi:</p>
          <ul className="grid gap-1 text-sm sm:grid-cols-2">
            {data.squad
              .filter((s) => s.squadRole === "substitute")
              .map((s) => (
                <li key={s.id}>{s.playerName}</li>
              ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-2 font-semibold">Wydarzenia</h2>
          <ul className="space-y-1 text-sm">
            {data.events.map((ev) => (
              <li key={ev.id}>
                {ev.minute}&apos; {MATCH_EVENT_TYPE_LABELS[ev.eventType]}
                {ev.playerName ? ` — ${ev.playerName}` : ""}
                {ev.relatedPlayerName ? ` (${ev.relatedPlayerName})` : ""}
              </li>
            ))}
          </ul>
        </section>

        <section>
          <h2 className="mb-2 font-semibold">MVP</h2>
          <p className="text-sm">{match.mvpPlayerName ?? "Nie wybrano"}</p>
        </section>

        {match.coachNotes ? (
          <section>
            <h2 className="mb-2 font-semibold">Notatki trenera</h2>
            <p className="text-sm whitespace-pre-wrap">{match.coachNotes}</p>
          </section>
        ) : null}
      </article>
    </div>
  );
}
