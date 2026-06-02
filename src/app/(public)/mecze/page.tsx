import type { Metadata } from "next";

import { PublicPageShell } from "@/features/website/components/public-page-shell";
import { buildPublicPageMetadata } from "@/lib/website/seo";
import { getPublicClubId, getPublicMatches } from "@/lib/website/public-data";

export async function generateMetadata(): Promise<Metadata> {
  return buildPublicPageMetadata("Mecze", "/mecze");
}

export default async function MatchesPublicPage() {
  const clubId = await getPublicClubId();
  const [upcoming, results] = await Promise.all([
    getPublicMatches(clubId, "upcoming", 20),
    getPublicMatches(clubId, "results", 20),
  ]);

  return (
    <PublicPageShell title="Mecze" subtitle="Terminarz i wyniki — dane z modułu meczowego klubu.">
      <div className="space-y-10">
        <section>
          <h2 className="mb-4 text-xl font-semibold text-[var(--club-primary)]">Terminarz</h2>
          <div className="space-y-3">
            {upcoming.map((m) => (
              <div key={m.id} className="rounded-xl border border-black/5 bg-white p-4 shadow-sm sm:flex sm:items-center sm:justify-between">
                <div>
                  <p className="text-sm text-muted-foreground">
                    {m.matchDate} · {m.matchTime.slice(0, 5)} · {m.competition}
                  </p>
                  <p className="mt-1 font-medium">
                    {m.homeTeamName} — {m.awayTeamName}
                  </p>
                  {m.stadium ? <p className="text-sm text-muted-foreground">{m.stadium}</p> : null}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section>
          <h2 className="mb-4 text-xl font-semibold text-[var(--club-primary)]">Wyniki</h2>
          <div className="space-y-3">
            {results.map((m) => (
              <div key={m.id} className="rounded-xl border border-black/5 bg-white p-4 shadow-sm">
                <p className="text-sm text-muted-foreground">
                  {m.matchDate} · {m.competition}
                </p>
                <p className="mt-1 text-lg font-semibold">
                  {m.homeTeamName} {m.homeScore}:{m.awayScore} {m.awayTeamName}
                </p>
                {m.coachNotes ? (
                  <div className="mt-3 rounded-lg bg-muted/50 p-3 text-sm">
                    <p className="font-medium">Relacja</p>
                    <p className="mt-1 whitespace-pre-wrap text-muted-foreground">{m.coachNotes}</p>
                  </div>
                ) : null}
              </div>
            ))}
          </div>
        </section>
      </div>
    </PublicPageShell>
  );
}
