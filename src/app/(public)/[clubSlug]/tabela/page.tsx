import type { Metadata } from "next";

import { PublicHomeLeagueTable } from "@/features/website/components/public-home-league-table";
import { PublicPageShell } from "@/features/website/components/public-page-shell";
import { buildPublicPageMetadata } from "@/lib/website/seo";
import { getPublicClubId, getPublicLeagueTable } from "@/lib/website/public-data";

type Props = { params: Promise<{ clubSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { clubSlug } = await params;
  return buildPublicPageMetadata("Tabela ligowa", clubSlug, "/tabela");
}

export default async function LeagueTablePublicPage({ params }: Props) {
  const { clubSlug } = await params;
  const clubId = await getPublicClubId(clubSlug);
  const league = await getPublicLeagueTable(clubId);
  const ownRow = league.entries.find((e) => e.isOwnClub);
  const ownPosition = ownRow ? league.entries.indexOf(ownRow) + 1 : null;

  return (
    <PublicPageShell
      clubSlug={clubSlug}
      eyebrow="Liga"
      title="Tabela ligowa"
      subtitle={`${league.competition} · Sezon ${league.season}`}
    >
      <PublicHomeLeagueTable clubSlug={clubSlug} entries={league.entries} ownPosition={ownPosition} pageMode />
    </PublicPageShell>
  );
}
