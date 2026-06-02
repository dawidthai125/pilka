import type { Metadata } from "next";

import { PublicPageShell } from "@/features/website/components/public-page-shell";
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
    <PublicPageShell
      title="Tabela ligowa"
      subtitle={`${league.competition} · Sezon ${league.season}`}
    >
      <PublicLeagueTableSection entries={league.entries} ownTeamName={league.ownTeamName} showFullLink={false} />
    </PublicPageShell>
  );
}
