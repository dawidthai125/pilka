import type { Metadata } from "next";

import { PublicLeagueTableSection } from "@/features/website/components/club-site-page";
import { buildPublicPageMetadata } from "@/lib/website/seo";
import { getPublicClubId, getPublicLeagueTable } from "@/lib/website/public-data";

export async function generateMetadata(): Promise<Metadata> {
  return buildPublicPageMetadata("Tabela ligowa", "/tabela");
}

export default async function LeagueTablePublicPage() {
  const clubId = await getPublicClubId();
  const league = await getPublicLeagueTable(clubId);

  return (
    <div className="pb-10">
      <div className="mx-auto max-w-6xl px-4 pt-10 sm:px-6">
        <h1 className="text-3xl font-bold">Tabela ligowa</h1>
        <p className="mt-2 text-muted-foreground">Aktualna tabela rozgrywek — dane z Football Club OS.</p>
      </div>
      <PublicLeagueTableSection entries={league.entries} ownTeamName={league.ownTeamName} />
    </div>
  );
}
