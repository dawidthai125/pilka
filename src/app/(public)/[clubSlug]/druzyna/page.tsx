import type { Metadata } from "next";

import { PublicDarkSquadList } from "@/features/website/components/public-dark-subpage-content";
import { PublicPageShell } from "@/features/website/components/public-page-shell";
import { buildPublicPageMetadata } from "@/lib/website/seo";
import { getPublicPlayers } from "@/lib/website/public-data";

type Props = { params: Promise<{ clubSlug: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { clubSlug } = await params;
  return buildPublicPageMetadata("Kadra", clubSlug, "/druzyna");
}

export default async function TeamPublicPage({ params }: Props) {
  const { clubSlug } = await params;
  const players = await getPublicPlayers(clubSlug);

  return (
    <PublicPageShell
      clubSlug={clubSlug}
      eyebrow="Skład"
      title="Kadra drużyny"
      subtitle="Zawodnicy, pozycje, numery i statystyki sezonu."
    >
      <PublicDarkSquadList players={players} />
    </PublicPageShell>
  );
}
