import type { Metadata } from "next";

import { PublicHomeLeagueTable } from "@/features/website/components/public-home-league-table";
import { PublicPageShell } from "@/features/website/components/public-page-shell";
import { buildPublicPageMetadata } from "@/lib/website/seo";
import { getPublicClubId, getPublicLeagueTable } from "@/lib/website/public-data";

export async function generateMetadata(): Promise<Metadata> {
  return buildPublicPageMetadata("Tabela ligowa", "/tabela");
}

export default async function LeagueTablePublicPage() {
  const clubId = await getPublicClubId();
  const league = await getPublicLeagueTable(clubId);
  const ownRow = league.entries.find((e) => e.isOwnClub);
  const ownPosition = ownRow ? league.entries.indexOf(ownRow) + 1 : null;

  return (
    <PublicPageShell
      eyebrow="Liga"
      title="Tabela ligowa"
      subtitle={`${league.competition} · Sezon ${league.season}`}
    >
      <PublicHomeLeagueTable entries={league.entries} ownPosition={ownPosition} pageMode />
    </PublicPageShell>
  );
}
