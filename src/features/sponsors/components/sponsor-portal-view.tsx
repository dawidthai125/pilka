import Link from "next/link";

import {
  SPONSOR_CONTRACT_STATUS_LABELS,
  SPONSOR_PUBLICATION_SOURCE_LABELS,
} from "@/lib/sponsors/constants";
import type { SponsorPortalData } from "@/types/sponsors";

export function SponsorPortalView({ data }: { data: SponsorPortalData }) {
  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-semibold">Panel sponsora</h1>
        <p className="text-muted-foreground">Witaj, {data.sponsor.companyName}</p>
      </div>

      <section className="rounded-xl border p-4 sm:p-6">
        <h2 className="mb-3 font-semibold">Twoje umowy</h2>
        <ul className="space-y-2 text-sm">
          {data.contracts.map((c) => (
            <li key={c.id} className="rounded-lg border p-3">
              <p className="font-medium">{c.name}</p>
              <p className="text-muted-foreground">
                {c.startDate} – {c.endDate} · {SPONSOR_CONTRACT_STATUS_LABELS[c.status]}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border p-4 sm:p-6">
        <h2 className="mb-3 font-semibold">Raporty</h2>
        <ul className="space-y-2">
          {data.reports.map((r) => (
            <li key={r.id}>
              <Link href={`/sponsors/reports/${r.id}`} className="text-primary underline">
                {r.title}
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <section className="rounded-xl border p-4 sm:p-6">
        <h2 className="mb-3 font-semibold">Publikacje z Twoim udziałem</h2>
        <ul className="space-y-2 text-sm">
          {data.publications.map((p) => (
            <li key={p.id}>
              <p className="font-medium">{p.title}</p>
              <p className="text-muted-foreground">
                {p.publishedAt} · {SPONSOR_PUBLICATION_SOURCE_LABELS[p.source]}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <div className="grid gap-6 lg:grid-cols-2">
        <section className="rounded-xl border p-4 sm:p-6">
          <h2 className="mb-3 font-semibold">Terminarz drużyny</h2>
          <ul className="space-y-2 text-sm">
            {data.upcomingMatches.length ? (
              data.upcomingMatches.map((m) => (
                <li key={m.id}>
                  {m.matchDate} {m.matchTime} — {m.homeTeamName} vs {m.awayTeamName}
                </li>
              ))
            ) : (
              <li className="text-muted-foreground">Brak zaplanowanych meczów.</li>
            )}
          </ul>
        </section>

        <section className="rounded-xl border p-4 sm:p-6">
          <h2 className="mb-3 font-semibold">Wyniki drużyny</h2>
          <ul className="space-y-2 text-sm">
            {data.recentResults.length ? (
              data.recentResults.map((m) => (
                <li key={m.id}>
                  {m.matchDate}: {m.homeTeamName} {m.homeScore}:{m.awayScore} {m.awayTeamName}
                </li>
              ))
            ) : (
              <li className="text-muted-foreground">Brak wyników do wyświetlenia.</li>
            )}
          </ul>
        </section>
      </div>

      <p className="text-xs text-muted-foreground">
        Panel sponsora nie udostępnia danych zawodników — wyłącznie informacje partnerskie i sportowe klubu.
      </p>
    </div>
  );
}
